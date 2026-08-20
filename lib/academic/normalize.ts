import type { AcademicPaper, AcademicSource } from './types';

export function normalizeDoi(value?: string | null) {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase().replace(/^https?:\/\/(?:dx\.)?doi\.org\//, '').replace(/^doi:\s*/, '');
  return normalized || undefined;
}

function titleKey(title: string) {
  return title
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\p{P}\p{S}\s]+/gu, ' ')
    .trim();
}

function paperKey(paper: AcademicPaper) {
  const doi = normalizeDoi(paper.doi);
  return doi ? `doi:${doi}` : `title:${titleKey(paper.title)}`;
}

function uniqueSources(sources: AcademicSource[]) {
  return [...new Set(sources)];
}

function mergePair(primary: AcademicPaper, secondary: AcademicPaper): AcademicPaper {
  return {
    ...primary,
    url: primary.url || secondary.url,
    summary: primary.summary || secondary.summary,
    author: primary.author || secondary.author,
    publishedDate: primary.publishedDate || secondary.publishedDate,
    year: primary.year || secondary.year,
    doi: normalizeDoi(primary.doi || secondary.doi),
    openAccessPdf: primary.openAccessPdf || secondary.openAccessPdf,
    citationCount: Math.max(primary.citationCount || 0, secondary.citationCount || 0) || undefined,
    sources: uniqueSources([...primary.sources, ...secondary.sources]),
  };
}

export function mergeAcademicPapers(providerResults: AcademicPaper[][], limit: number) {
  const merged = new Map<string, AcademicPaper & { rank: number }>();
  let rank = 0;

  for (const papers of providerResults) {
    for (const paper of papers) {
      const normalizedPaper: AcademicPaper = {
        ...paper,
        title: paper.title.trim(),
        doi: normalizeDoi(paper.doi),
        sources: uniqueSources(paper.sources.length ? paper.sources : [paper.source]),
      };
      if (!normalizedPaper.title) continue;

      const key = paperKey(normalizedPaper);
      const current = merged.get(key);
      if (current) {
        merged.set(key, { ...mergePair(current, normalizedPaper), rank: current.rank });
      } else {
        merged.set(key, { ...normalizedPaper, rank });
        rank += 1;
      }
    }
  }

  return [...merged.values()]
    .sort((a, b) => {
      const sourceDifference = b.sources.length - a.sources.length;
      if (sourceDifference) return sourceDifference;
      const citationDifference = (b.citationCount || 0) - (a.citationCount || 0);
      if (citationDifference) return citationDifference;
      return a.rank - b.rank;
    })
    .slice(0, limit)
    .map(({ rank: _rank, ...paper }) => paper);
}

export function abstractFromInvertedIndex(index?: Record<string, number[]> | null) {
  if (!index) return '';
  return Object.entries(index)
    .flatMap(([word, positions]) => positions.map((position) => ({ word, position })))
    .sort((a, b) => a.position - b.position)
    .map(({ word }) => word)
    .join(' ');
}
