import { afterEach, beforeAll, describe, expect, mock, test } from 'bun:test';
import { mergeAcademicPapers } from '@/lib/academic/normalize';
import type { AcademicPaper, AcademicProvider } from '@/lib/academic/types';

mock.module('server-only', () => ({}));

let searchAcademicPapers: typeof import('@/lib/academic/search').searchAcademicPapers;
let requestedSites: typeof import('@/lib/academic/requested-site-providers');
const originalFetch = globalThis.fetch;

beforeAll(async () => {
  ({ searchAcademicPapers } = await import('@/lib/academic/search'));
  requestedSites = await import('@/lib/academic/requested-site-providers');
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.ACADEMIC_DOTAINDEX;
  delete process.env.ACADEMIC_SCHOLAR_673;
  delete process.env.DOTAINDEX_SCHOLAR_PROXY_URL;
  delete process.env.SCHOLAR_673_JSON_PROXY_URL;
});

function paper(overrides: Partial<AcademicPaper> = {}): AcademicPaper {
  return {
    id: 'paper-1',
    title: 'Structured Scientific Figure Generation',
    url: 'https://example.com/paper',
    summary: '',
    doi: '10.1000/Example',
    source: 'openalex',
    sources: ['openalex'],
    ...overrides,
  };
}

describe('academic record normalization', () => {
  test('deduplicates DOI variants and merges provenance deterministically', () => {
    const result = mergeAcademicPapers(
      [
        [paper({ citationCount: 4 })],
        [
          paper({
            id: 'paper-2',
            doi: 'https://doi.org/10.1000/example',
            source: 'semantic-scholar',
            sources: ['semantic-scholar'],
            summary: 'A structured abstract.',
            openAccessPdf: 'https://example.com/paper.pdf',
            citationCount: 9,
          }),
        ],
      ],
      10,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      doi: '10.1000/example',
      summary: 'A structured abstract.',
      openAccessPdf: 'https://example.com/paper.pdf',
      citationCount: 9,
      sources: ['openalex', 'semantic-scholar'],
    });
  });

  test('deduplicates punctuation and whitespace variants of titles without a DOI', () => {
    const result = mergeAcademicPapers(
      [
        [paper({ doi: undefined, title: '自动驾驶：路径规划方法' })],
        [paper({ doi: undefined, id: 'paper-2', title: '自动驾驶 路径规划方法', source: 'crossref', sources: ['crossref'] })],
      ],
      10,
    );
    expect(result).toHaveLength(1);
  });
});

describe('academic provider aggregation', () => {
  test('keeps successful results when another provider fails', async () => {
    let receivedQuery = '';
    const providers: AcademicProvider[] = [
      {
        name: 'openalex',
        async search(query) {
          receivedQuery = query;
          return [paper()];
        },
      },
      {
        name: 'crossref',
        async search() {
          throw new Error('rate limited');
        },
      },
    ];

    const result = await searchAcademicPapers('自动驾驶 construction zone', 10, providers);

    expect(receivedQuery).toBe('自动驾驶 construction zone');
    expect(result.results).toHaveLength(1);
    expect(result.providers).toEqual([
      { source: 'openalex', status: 'ok', count: 1 },
      { source: 'crossref', status: 'error', count: 0, message: 'rate limited' },
    ]);
  });
});

describe('requested site adapters', () => {
  test('are independently disabled by default', () => {
    expect(requestedSites.requestedSiteProviders()).toEqual([]);
    process.env.ACADEMIC_DOTAINDEX = 'true';
    expect(requestedSites.requestedSiteProviders().map(({ name }) => name)).toEqual(['dotaindex']);
    process.env.ACADEMIC_SCHOLAR_673 = 'true';
    expect(requestedSites.requestedSiteProviders().map(({ name }) => name)).toEqual(['dotaindex', 'scholar-673']);
  });

  test('normalizes Dotaindex-compatible JSON through the experimental adapter', async () => {
    process.env.DOTAINDEX_SCHOLAR_PROXY_URL = 'https://dota-proxy.example/search';
    let request: Request | undefined;
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      request = new Request(input, init);
      return Response.json({
        data: {
          results: [
            {
              id: 'dota-1',
              title: '施工区自动驾驶规划',
              authors: ['张三', '李四'],
              year: 2025,
              abstract: '面向临时施工区的轨迹规划。',
              doi: '10.1000/DOTA',
              pdf_url: 'https://example.com/dota.pdf',
              citations: 8,
            },
          ],
        },
      });
    }) as unknown as typeof fetch;

    const results = await requestedSites.dotaindexProvider.search('施工区 planning', 10);

    expect(request?.url).toContain('q=%E6%96%BD%E5%B7%A5%E5%8C%BA+planning');
    expect(results[0]).toMatchObject({
      source: 'dotaindex',
      title: '施工区自动驾驶规划',
      author: '张三; 李四',
      doi: '10.1000/dota',
      citationCount: 8,
    });
  });

  test('keeps 673 behind an explicit JSON proxy contract', async () => {
    await expect(requestedSites.scholar673Provider.search('query', 10)).rejects.toThrow(
      'SCHOLAR_673_JSON_PROXY_URL is not configured',
    );
  });
});
