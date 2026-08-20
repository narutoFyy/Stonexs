'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileSearch,
  LoaderCircle,
  Search,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { SidebarLayout } from '@/components/sidebar-layout';
import { PaperDownloadButton } from '@/components/paper-download-button';
import type { AcademicPaper, AcademicSearchResult, AcademicSource } from '@/lib/academic/types';
import { cn } from '@/lib/utils';

const QUICK_QUERIES = ['泊车路径规划', '施工区自动驾驶', '大语言模型综述', '视觉定位 open access'];

const SOURCE_LABELS: Record<AcademicSource, string> = {
  openalex: 'OpenAlex',
  'semantic-scholar': 'Semantic Scholar',
  crossref: 'Crossref',
  arxiv: 'arXiv',
  pubmed: 'PubMed',
  dotaindex: 'Dotaindex',
  'scholar-673': '673 Scholar',
};

interface ScholarSearchPageProps {
  initialQuery?: string;
}

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function sourceLabel(source: AcademicSource) {
  return SOURCE_LABELS[source] || source;
}

function PaperResult({ paper }: { paper: AcademicPaper }) {
  const sources = paper.sources.length ? paper.sources : [paper.source];

  return (
    <article className="scholar-result-item">
      <div className="flex items-start gap-4">
        <div className="scholar-result-index" aria-hidden="true">
          <BookOpen className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex max-w-full items-start gap-2 text-left"
              >
                <h2 className="text-base font-semibold leading-6 text-[#f4eedf] transition-colors group-hover:text-[#d7bd7b]">
                  {paper.title}
                </h2>
                <ExternalLink className="mt-1 size-3.5 shrink-0 text-[#8ea5ac] opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#9eb1b5]">
                {paper.author && <span className="line-clamp-1">{paper.author}</span>}
                {paper.year && (
                  <>
                    <span className="text-[#60747c]">·</span>
                    <span>{paper.year}</span>
                  </>
                )}
                {paper.citationCount !== undefined && (
                  <>
                    <span className="text-[#60747c]">·</span>
                    <span>{paper.citationCount} 次引用</span>
                  </>
                )}
              </div>
            </div>
            {paper.openAccessPdf && (
              <PaperDownloadButton sourceUrl={paper.openAccessPdf} title={paper.title} doi={paper.doi} />
            )}
          </div>

          {paper.summary && <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#b7c4c7]">{paper.summary}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {sources.map((source) => (
              <span key={source} className="scholar-source-chip">
                {sourceLabel(source)}
              </span>
            ))}
            {paper.doi && <span className="scholar-doi">DOI {paper.doi}</span>}
            {paper.publishedDate && (
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-[#84999f]">
                <Clock3 className="size-3" />
                {formatDate(paper.publishedDate)}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function ProviderStatus({ result }: { result: AcademicSearchResult }) {
  const successful = result.providers.filter((provider) => provider.status === 'ok');
  const failed = result.providers.filter((provider) => provider.status === 'error');

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-[#d7bd7b]/20 py-3 text-xs">
      <span className="inline-flex items-center gap-1.5 text-[#d7bd7b]">
        <CheckCircle2 className="size-3.5" />
        {successful.length} 个来源已返回
      </span>
      {successful.map((provider) => (
        <span key={provider.source} className="text-[#8ea5ac]">
          {sourceLabel(provider.source)} {provider.count}
        </span>
      ))}
      {failed.length > 0 && (
        <span className="inline-flex items-center gap-1.5 text-[#d49b80]">
          <XCircle className="size-3.5" />
          {failed.length} 个来源暂不可用
        </span>
      )}
    </div>
  );
}

export function ScholarSearchPage({ initialQuery = '' }: ScholarSearchPageProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<AcademicSearchResult | null>(null);
  const [loading, setLoading] = useState(Boolean(initialQuery));
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(
    async (rawQuery: string, updateUrl = true) => {
      const nextQuery = rawQuery.trim();
      if (!nextQuery) return;

      setQuery(nextQuery);
      setLoading(true);
      setError(null);
      if (updateUrl) router.push(`/scholar?q=${encodeURIComponent(nextQuery)}`);

      try {
        const response = await fetch(`/api/papers/search?q=${encodeURIComponent(nextQuery)}&limit=30`, {
          cache: 'no-store',
        });
        const payload = (await response.json()) as AcademicSearchResult & { error?: string };
        if (!response.ok) throw new Error(payload.error || '搜索失败，请稍后重试');
        setResult(payload);
      } catch (searchError) {
        setResult(null);
        setError(searchError instanceof Error ? searchError.message : '搜索失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    setQuery(initialQuery);
    if (initialQuery.trim()) void runSearch(initialQuery, false);
    else {
      setResult(null);
      setError(null);
      setLoading(false);
    }
  }, [initialQuery, runSearch]);

  const resultCount = result?.results.length ?? 0;
  const hasQuery = Boolean(query.trim());
  const statusText = useMemo(() => {
    if (loading) return '正在从多个学术来源检索';
    if (error) return '检索请求未完成';
    if (result) return `找到 ${resultCount} 篇相关文献`;
    return '输入关键词、作者或 DOI 开始检索';
  }, [error, loading, result, resultCount]);

  return (
    <SidebarLayout>
      <main className="scholar-search-shell min-h-svh">
        <div className="scholar-search-grid" aria-hidden="true" />
        <div className="relative mx-auto flex min-h-svh w-full max-w-6xl flex-col px-8 py-7">
          <header className="flex items-center justify-between border-b border-[#d7bd7b]/20 pb-5">
            <div>
              <p className="shitou-kicker">SHITOU ACADEMIC / SCHOLAR INDEX</p>
              <p className="mt-1 text-sm text-[#b7c4c7]">混合检索 · 开放全文 · 研究生论文工作台</p>
            </div>
            <nav className="flex items-center gap-2 text-xs text-[#b7c4c7]">
              <Link className="scholar-nav-link scholar-nav-link-active" href="/scholar">
                文献搜索
              </Link>
              <Link className="scholar-nav-link" href="/figures">
                科研绘图
              </Link>
              <a
                className="scholar-nav-link"
                href="/api/academic/90tsg"
                target="_blank"
                rel="noopener noreferrer"
              >
                英文数据库 <ExternalLink className="size-3" />
              </a>
              <Link className="scholar-nav-link" href="/assistant">
                AI 研究助手
              </Link>
            </nav>
          </header>

          <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col pt-16">
            <div className="max-w-2xl">
              <p className="shitou-kicker">DIRECT RETRIEVAL / 01</p>
              <h1 className="mt-3 font-serif text-5xl font-normal leading-[1.06] text-[#f4eedf]">
                先检索文献，
                <br />
                再开始研究。
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-6 text-[#b7c4c7]">
                输入关键词、作者、标题或 DOI。石头学术会直接汇总多个学术索引，结果可追溯，AI 只在你需要时参与解读。
              </p>
            </div>

            <form
              className="scholar-search-form mt-10"
              onSubmit={(event) => {
                event.preventDefault();
                void runSearch(query);
              }}
            >
              <Search className="size-5 shrink-0 text-[#6d858c]" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索论文、作者或 DOI"
                aria-label="搜索论文、作者或 DOI"
                className="min-w-0 flex-1 bg-transparent text-base text-[#14242b] outline-none placeholder:text-[#75868c]"
              />
              {query && (
                <button
                  type="button"
                  aria-label="清空搜索词"
                  className="text-[#6d858c] transition-colors hover:text-[#14242b]"
                  onClick={() => {
                    setQuery('');
                    setResult(null);
                    setError(null);
                    router.push('/scholar');
                  }}
                >
                  ×
                </button>
              )}
              <button type="submit" disabled={loading || !query.trim()} className="scholar-search-submit">
                {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}
                搜索
              </button>
            </form>

            {!hasQuery && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#8ea5ac]">
                <span className="mr-1">试试：</span>
                {QUICK_QUERIES.map((quickQuery) => (
                  <button
                    type="button"
                    key={quickQuery}
                    className="scholar-query-chip"
                    onClick={() => void runSearch(quickQuery)}
                  >
                    {quickQuery}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-8 flex items-center justify-between text-xs text-[#8ea5ac]">
              <span>{statusText}</span>
              {hasQuery && !loading && (
                <Link href="/assistant" className="inline-flex items-center gap-1 text-[#d7bd7b] hover:text-[#f4eedf]">
                  用 AI 解读结果 <ArrowUpRight className="size-3" />
                </Link>
              )}
            </div>

            {loading && (
              <div className="mt-4 divide-y divide-[#d7bd7b]/15 border-y border-[#d7bd7b]/20">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="flex animate-pulse gap-4 py-6">
                    <div className="size-8 rounded-full bg-[#d7bd7b]/10" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 w-3/4 bg-[#d7bd7b]/10" />
                      <div className="h-3 w-1/2 bg-[#d7bd7b]/10" />
                      <div className="h-3 w-full bg-[#d7bd7b]/10" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && !loading && (
              <div className="mt-4 flex items-start gap-3 border border-[#d49b80]/35 bg-[#351f1e]/50 px-4 py-4 text-sm text-[#e3b3a0]">
                <XCircle className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="font-medium">检索未完成</p>
                  <p className="mt-1 text-xs text-[#c99788]">{error}</p>
                </div>
              </div>
            )}

            {result && !loading && !error && (
              <div className="mt-4 pb-10">
                <ProviderStatus result={result} />
                {result.results.length > 0 ? (
                  <div className="divide-y divide-[#d7bd7b]/15">
                    {result.results.map((paper) => (
                      <PaperResult key={`${paper.source}:${paper.id}`} paper={paper} />
                    ))}
                  </div>
                ) : (
                  <div className="border-b border-[#d7bd7b]/20 py-12 text-center text-sm text-[#9eb1b5]">
                    没有找到匹配文献，试试更短的关键词或 DOI。
                  </div>
                )}
              </div>
            )}

            {!hasQuery && (
              <div className="mt-auto grid gap-3 border-t border-[#d7bd7b]/20 pt-6 sm:grid-cols-3">
                {[
                  { icon: FileSearch, title: '直接检索', detail: '不经过 AI 改写，结果可复核' },
                  { icon: CheckCircle2, title: '混合来源', detail: '聚合多个学术索引并去重' },
                  { icon: Sparkles, title: '按需解读', detail: '搜索完成后再调用 AI 助手' },
                ].map(({ icon: Icon, title, detail }) => (
                  <div key={title} className="scholar-principle">
                    <Icon className="size-4 text-[#d7bd7b]" />
                    <div>
                      <p className="text-xs font-semibold text-[#f4eedf]">{title}</p>
                      <p className="mt-1 text-[11px] leading-5 text-[#8ea5ac]">{detail}</p>
                    </div>
                    <ChevronRight className="ml-auto size-3 text-[#60747c]" />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </SidebarLayout>
  );
}
