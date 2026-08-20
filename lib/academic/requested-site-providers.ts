import 'server-only';

import { normalizeDoi } from './normalize';
import type { AcademicPaper, AcademicProvider, AcademicSource } from './types';

interface HostedPaperRecord {
  id?: string | number;
  title?: string;
  url?: string;
  link?: string;
  authors?: string | string[];
  author?: string | string[];
  abstract?: string;
  summary?: string;
  description?: string;
  year?: string | number;
  published_date?: string;
  publishedDate?: string;
  doi?: string;
  citations?: string | number;
  citation_count?: string | number;
  pdf?: string;
  pdf_url?: string;
}

function recordsFromPayload(payload: unknown): HostedPaperRecord[] {
  if (Array.isArray(payload)) return payload as HostedPaperRecord[];
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.results)) return record.results as HostedPaperRecord[];
  if (Array.isArray(record.papers)) return record.papers as HostedPaperRecord[];
  if (Array.isArray(record.data)) return record.data as HostedPaperRecord[];
  if (record.data && typeof record.data === 'object') {
    const data = record.data as Record<string, unknown>;
    if (Array.isArray(data.results)) return data.results as HostedPaperRecord[];
    if (Array.isArray(data.papers)) return data.papers as HostedPaperRecord[];
  }
  return [];
}

function asAuthors(value?: string | string[]) {
  if (Array.isArray(value)) return value.filter(Boolean).join('; ');
  return value || null;
}

function asNumber(value?: string | number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeHostedPaper(record: HostedPaperRecord, source: AcademicSource, index: number): AcademicPaper | null {
  const title = record.title?.trim();
  if (!title) return null;
  const doi = normalizeDoi(record.doi);
  const year = asNumber(record.year);
  const url = record.url || record.link || (doi ? `https://doi.org/${doi}` : '');
  return {
    id: String(record.id || doi || `${source}:${index}:${title}`),
    title,
    url,
    summary: record.abstract || record.summary || record.description || '',
    author: asAuthors(record.authors || record.author),
    publishedDate: record.published_date || record.publishedDate || (year ? `${year}-01-01` : undefined),
    year,
    doi,
    source,
    sources: [source],
    openAccessPdf: record.pdf_url || record.pdf,
    citationCount: asNumber(record.citation_count ?? record.citations),
  };
}

async function searchHostedJson(
  endpoint: string,
  source: AcademicSource,
  query: string,
  limit: number,
  headers?: HeadersInit,
) {
  const url = new URL(endpoint);
  url.searchParams.set('q', query);
  url.searchParams.set('page', '1');
  url.searchParams.set('limit', String(limit));
  const response = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(9_000),
    headers: { accept: 'application/json', ...headers },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const records = recordsFromPayload(await response.json());
  return records.flatMap((record, index) => {
    const paper = normalizeHostedPaper(record, source, index);
    return paper ? [paper] : [];
  });
}

export const dotaindexProvider: AcademicProvider = {
  name: 'dotaindex',
  search(query, limit) {
    const endpoint = process.env.DOTAINDEX_SCHOLAR_PROXY_URL || 'https://www.dotaindex.com/api/scholar/search';
    const headers = process.env.DOTAINDEX_CAPABILITY_TOKEN
      ? { 'x-capability-token': process.env.DOTAINDEX_CAPABILITY_TOKEN }
      : undefined;
    return searchHostedJson(endpoint, 'dotaindex', query, limit, headers);
  },
};

export const scholar673Provider: AcademicProvider = {
  name: 'scholar-673',
  async search(query, limit) {
    const endpoint = process.env.SCHOLAR_673_JSON_PROXY_URL;
    if (!endpoint) throw new Error('SCHOLAR_673_JSON_PROXY_URL is not configured');
    return searchHostedJson(endpoint, 'scholar-673', query, limit);
  },
};

export function requestedSiteProviders() {
  return [
    ...(process.env.ACADEMIC_DOTAINDEX === 'true' ? [dotaindexProvider] : []),
    ...(process.env.ACADEMIC_SCHOLAR_673 === 'true' ? [scholar673Provider] : []),
  ];
}
