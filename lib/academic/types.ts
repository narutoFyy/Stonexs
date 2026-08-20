export type AcademicSource =
  | 'openalex'
  | 'semantic-scholar'
  | 'crossref'
  | 'arxiv'
  | 'pubmed'
  | 'dotaindex'
  | 'scholar-673';

export interface AcademicPaper {
  id: string;
  title: string;
  url: string;
  summary: string;
  author?: string | null;
  publishedDate?: string;
  year?: number;
  doi?: string;
  source: AcademicSource;
  sources: AcademicSource[];
  openAccessPdf?: string;
  citationCount?: number;
}

export interface AcademicProviderStatus {
  source: AcademicSource;
  status: 'ok' | 'error';
  count: number;
  message?: string;
}

export interface AcademicSearchResult {
  query: string;
  results: AcademicPaper[];
  providers: AcademicProviderStatus[];
}

export interface AcademicProvider {
  name: AcademicSource;
  search(query: string, limit: number): Promise<AcademicPaper[]>;
}
