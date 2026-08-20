import 'server-only';

import { XMLParser } from 'fast-xml-parser';
import { abstractFromInvertedIndex, normalizeDoi } from './normalize';
import type { AcademicPaper, AcademicProvider } from './types';
import { requestedSiteProviders } from './requested-site-providers';

const TIMEOUT_MS = 9_000;

async function getJson<T>(url: URL, headers?: HeadersInit): Promise<T> {
  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: 'application/json', ...headers },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

function firstDate(parts?: number[][]) {
  const date = parts?.[0];
  if (!date?.[0]) return undefined;
  const [year, month = 1, day = 1] = date;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function stripMarkup(value?: string) {
  return (value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export const openAlexProvider: AcademicProvider = {
  name: 'openalex',
  async search(query, limit) {
    const url = new URL('https://api.openalex.org/works');
    url.searchParams.set('search', query);
    url.searchParams.set('per-page', String(limit));
    url.searchParams.set(
      'select',
      'id,doi,title,publication_year,publication_date,authorships,abstract_inverted_index,primary_location,best_oa_location,cited_by_count',
    );
    if (process.env.OPENALEX_MAILTO) url.searchParams.set('mailto', process.env.OPENALEX_MAILTO);

    const payload = await getJson<{
      results: Array<{
        id: string;
        doi?: string;
        title?: string;
        publication_year?: number;
        publication_date?: string;
        cited_by_count?: number;
        abstract_inverted_index?: Record<string, number[]> | null;
        authorships?: Array<{ author?: { display_name?: string } }>;
        primary_location?: { landing_page_url?: string | null; pdf_url?: string | null };
        best_oa_location?: { landing_page_url?: string | null; pdf_url?: string | null };
      }>;
    }>(url);

    return payload.results.map((work): AcademicPaper => {
      const doi = normalizeDoi(work.doi);
      const landing = work.best_oa_location?.landing_page_url || work.primary_location?.landing_page_url;
      return {
        id: work.id,
        title: work.title || 'Untitled paper',
        url: landing || (doi ? `https://doi.org/${doi}` : work.id),
        summary: abstractFromInvertedIndex(work.abstract_inverted_index),
        author: work.authorships?.map((entry) => entry.author?.display_name).filter(Boolean).join('; ') || null,
        publishedDate: work.publication_date,
        year: work.publication_year,
        doi,
        source: 'openalex',
        sources: ['openalex'],
        openAccessPdf: work.best_oa_location?.pdf_url || work.primary_location?.pdf_url || undefined,
        citationCount: work.cited_by_count,
      };
    });
  },
};

export const semanticScholarProvider: AcademicProvider = {
  name: 'semantic-scholar',
  async search(query, limit) {
    const url = new URL('https://api.semanticscholar.org/graph/v1/paper/search');
    url.searchParams.set('query', query);
    url.searchParams.set('limit', String(Math.min(limit, 100)));
    url.searchParams.set(
      'fields',
      'paperId,title,abstract,authors,year,url,externalIds,openAccessPdf,citationCount,publicationDate',
    );
    const headers = process.env.SEMANTIC_SCHOLAR_API_KEY
      ? { 'x-api-key': process.env.SEMANTIC_SCHOLAR_API_KEY }
      : undefined;
    const payload = await getJson<{
      data: Array<{
        paperId: string;
        title: string;
        abstract?: string | null;
        year?: number;
        url?: string;
        publicationDate?: string;
        citationCount?: number;
        authors?: Array<{ name: string }>;
        externalIds?: { DOI?: string; ArXiv?: string; PubMed?: string };
        openAccessPdf?: { url?: string } | null;
      }>;
    }>(url, headers);

    return payload.data.map((paper): AcademicPaper => {
      const doi = normalizeDoi(paper.externalIds?.DOI);
      return {
        id: paper.paperId,
        title: paper.title,
        url: paper.url || (doi ? `https://doi.org/${doi}` : `https://www.semanticscholar.org/paper/${paper.paperId}`),
        summary: paper.abstract || '',
        author: paper.authors?.map(({ name }) => name).join('; ') || null,
        publishedDate: paper.publicationDate,
        year: paper.year,
        doi,
        source: 'semantic-scholar',
        sources: ['semantic-scholar'],
        openAccessPdf: paper.openAccessPdf?.url,
        citationCount: paper.citationCount,
      };
    });
  },
};

export const crossrefProvider: AcademicProvider = {
  name: 'crossref',
  async search(query, limit) {
    const url = new URL('https://api.crossref.org/works');
    url.searchParams.set('query.bibliographic', query);
    url.searchParams.set('rows', String(limit));
    url.searchParams.set('select', 'DOI,title,author,abstract,published,URL,link,is-referenced-by-count');
    if (process.env.OPENALEX_MAILTO) url.searchParams.set('mailto', process.env.OPENALEX_MAILTO);
    const payload = await getJson<{
      message: {
        items: Array<{
          DOI?: string;
          title?: string[];
          abstract?: string;
          URL?: string;
          author?: Array<{ given?: string; family?: string }>;
          published?: { 'date-parts'?: number[][] };
          link?: Array<{ URL?: string; 'content-type'?: string }>;
          'is-referenced-by-count'?: number;
        }>;
      };
    }>(url);

    return payload.message.items.map((item): AcademicPaper => {
      const doi = normalizeDoi(item.DOI);
      const publishedDate = firstDate(item.published?.['date-parts']);
      const pdf = item.link?.find((link) => link['content-type'] === 'application/pdf')?.URL;
      return {
        id: doi || item.URL || item.title?.[0] || 'crossref:untitled',
        title: item.title?.[0] || 'Untitled paper',
        url: item.URL || (doi ? `https://doi.org/${doi}` : ''),
        summary: stripMarkup(item.abstract),
        author:
          item.author
            ?.map(({ given, family }) => [given, family].filter(Boolean).join(' '))
            .filter(Boolean)
            .join('; ') || null,
        publishedDate,
        year: publishedDate ? Number(publishedDate.slice(0, 4)) : undefined,
        doi,
        source: 'crossref',
        sources: ['crossref'],
        openAccessPdf: pdf,
        citationCount: item['is-referenced-by-count'],
      };
    });
  },
};

export const arxivProvider: AcademicProvider = {
  name: 'arxiv',
  async search(query, limit) {
    const url = new URL('https://export.arxiv.org/api/query');
    url.searchParams.set('search_query', `all:${query}`);
    url.searchParams.set('start', '0');
    url.searchParams.set('max_results', String(limit));
    url.searchParams.set('sortBy', 'relevance');
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = new XMLParser({ ignoreAttributes: false }).parse(await response.text()) as {
      feed?: { entry?: unknown | unknown[] };
    };
    const entries = parsed.feed?.entry ? (Array.isArray(parsed.feed.entry) ? parsed.feed.entry : [parsed.feed.entry]) : [];

    return entries.map((raw): AcademicPaper => {
      const entry = raw as {
        id: string;
        title: string;
        summary?: string;
        published?: string;
        author?: { name: string } | Array<{ name: string }>;
        link?: { '@_href'?: string; '@_type'?: string; '@_title'?: string } | Array<{ '@_href'?: string; '@_type'?: string; '@_title'?: string }>;
      };
      const authors = entry.author ? (Array.isArray(entry.author) ? entry.author : [entry.author]) : [];
      const links = entry.link ? (Array.isArray(entry.link) ? entry.link : [entry.link]) : [];
      const pdf = links.find((link) => link['@_title'] === 'pdf' || link['@_type'] === 'application/pdf')?.['@_href'];
      return {
        id: entry.id,
        title: String(entry.title || '').replace(/\s+/g, ' ').trim(),
        url: entry.id,
        summary: String(entry.summary || '').replace(/\s+/g, ' ').trim(),
        author: authors.map(({ name }) => name).join('; ') || null,
        publishedDate: entry.published,
        year: entry.published ? Number(entry.published.slice(0, 4)) : undefined,
        source: 'arxiv',
        sources: ['arxiv'],
        openAccessPdf: pdf,
      };
    });
  },
};

export const pubMedProvider: AcademicProvider = {
  name: 'pubmed',
  async search(query, limit) {
    const searchUrl = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi');
    searchUrl.searchParams.set('db', 'pubmed');
    searchUrl.searchParams.set('term', query);
    searchUrl.searchParams.set('retmode', 'json');
    searchUrl.searchParams.set('retmax', String(limit));
    const search = await getJson<{ esearchresult?: { idlist?: string[] } }>(searchUrl);
    const ids = search.esearchresult?.idlist || [];
    if (!ids.length) return [];

    const summaryUrl = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi');
    summaryUrl.searchParams.set('db', 'pubmed');
    summaryUrl.searchParams.set('id', ids.join(','));
    summaryUrl.searchParams.set('retmode', 'json');
    const summary = await getJson<{
      result?: Record<
        string,
        {
          uid?: string;
          title?: string;
          pubdate?: string;
          sortpubdate?: string;
          authors?: Array<{ name?: string }>;
          articleids?: Array<{ idtype?: string; value?: string }>;
        }
      >;
    }>(summaryUrl);

    return ids.flatMap((id): AcademicPaper[] => {
      const article = summary.result?.[id];
      if (!article?.title) return [];
      const doi = normalizeDoi(article.articleids?.find((value) => value.idtype === 'doi')?.value);
      const publishedDate = article.sortpubdate?.slice(0, 10) || article.pubdate;
      return [
        {
          id,
          title: article.title,
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          summary: '',
          author: article.authors?.map(({ name }) => name).filter(Boolean).join('; ') || null,
          publishedDate,
          year: publishedDate ? Number(publishedDate.slice(0, 4)) : undefined,
          doi,
          source: 'pubmed',
          sources: ['pubmed'],
        },
      ];
    });
  },
};

export function officialAcademicProviders() {
  const semanticScholarEnabled =
    process.env.ACADEMIC_SEMANTIC_SCHOLAR === 'true' && Boolean(process.env.SEMANTIC_SCHOLAR_API_KEY);
  return [
    openAlexProvider,
    ...(semanticScholarEnabled ? [semanticScholarProvider] : []),
    ...(process.env.ACADEMIC_CROSSREF === 'false' ? [] : [crossrefProvider]),
    ...(process.env.ACADEMIC_ARXIV === 'false' ? [] : [arxivProvider]),
    ...(process.env.ACADEMIC_PUBMED === 'false' ? [] : [pubMedProvider]),
    ...requestedSiteProviders(),
  ];
}
