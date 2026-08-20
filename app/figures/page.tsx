'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ChartNoAxesCombined, Download, FileJson, LoaderCircle, PanelTop, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SidebarLayout } from '@/components/sidebar-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useUser } from '@/contexts/user-context';

interface FigureJob {
  id: string;
  title: string;
  stageLabels: string[];
  width: number;
  height: number;
  status: 'queued' | 'generating' | 'completed' | 'failed';
  elementCount?: number | null;
  errorMessage?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

function FiguresContent() {
  const [title, setTitle] = useState('科研方法流程图');
  const [idea, setIdea] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [languageModel, setLanguageModel] = useState('gpt-4.1-mini');
  const [imageModel, setImageModel] = useState('gpt-image-2');
  const [backgroundPrompt, setBackgroundPrompt] = useState(
    '表现研究问题、方法设计、数据分析和实验验证之间关系的通用科研场景，包含抽象实验装置、数据纹理和清晰的空间层次',
  );
  const [stages, setStages] = useState(['研究问题', '方法设计', '实验结果']);
  const [size, setSize] = useState('2048x1152');
  const [jobs, setJobs] = useState<FigureJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [promptLoading, setPromptLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    jobId: string;
    previewUrl: string;
    bundleUrl: string;
    elementCount: number;
  } | null>(null);

  async function refinePrompt() {
    if (idea.trim().length < 10) {
      setError('请先写下至少 10 个字的论文方向和绘图想法');
      return;
    }
    setPromptLoading(true);
    setError('');
    try {
      const response = await fetch('/api/figures/prompt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idea, baseUrl, apiKey, languageModel }),
      });
      const payload = (await response.json()) as {
        title?: string;
        backgroundPrompt?: string;
        stageLabels?: string[];
        error?: string;
      };
      if (!response.ok || !payload.title || !payload.backgroundPrompt || payload.stageLabels?.length !== 3) {
        throw new Error(payload.error || '提示词润色失败');
      }
      setTitle(payload.title);
      setBackgroundPrompt(payload.backgroundPrompt);
      setStages(payload.stageLabels);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '提示词润色失败');
    } finally {
      setPromptLoading(false);
    }
  }

  const presets = [
    {
      label: '方法流程',
      title: '科研方法流程图',
      prompt: '表现研究问题、方法设计、数据分析和实验验证之间关系的通用科研场景，包含抽象实验装置、数据纹理和清晰的空间层次',
      stages: ['研究问题', '方法设计', '实验结果'],
    },
    {
      label: '系统架构',
      title: '研究系统架构图',
      prompt: '表现数据输入、核心处理模块、分析输出之间关系的通用科研系统场景，包含模块化装置、信息流和层次分明的实验空间',
      stages: ['数据输入', '核心模块', '分析输出'],
    },
    {
      label: '实验方案',
      title: '实验设计示意图',
      prompt: '表现实验对象、实验条件、观测指标和结果分析的通用科研场景，包含实验器材、样本、测量痕迹和干净的论文插图质感',
      stages: ['实验对象', '实验条件', '观测指标'],
    },
  ];

  const loadJobs = useCallback(async () => {
    const response = await fetch('/api/figures', { cache: 'no-store' });
    if (!response.ok) return;
    const payload = (await response.json()) as { jobs?: FigureJob[] };
    setJobs(payload.jobs || []);
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await fetch('/api/figures', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, backgroundPrompt, stageLabels: stages, size, baseUrl, apiKey, imageModel }),
      });
      const payload = (await response.json()) as {
        previewUrl?: string;
        bundleUrl?: string;
        jobId?: string;
        elementCount?: number;
        error?: string;
      };
      if (!response.ok || !payload.previewUrl || !payload.bundleUrl || !payload.jobId)
        throw new Error(payload.error || '科研绘图生成失败');
      setResult({
        jobId: payload.jobId,
        previewUrl: payload.previewUrl,
        bundleUrl: payload.bundleUrl,
        elementCount: payload.elementCount || 0,
      });
      await loadJobs();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '科研绘图生成失败');
      await loadJobs();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-svh w-full bg-[#f3eedf] text-[#17242a]">
      <header className="flex h-16 items-center border-b border-[#d7bd7b]/30 bg-[#0b1822] px-6 text-[#f4eedf]">
        <SidebarTrigger className="mr-3" />
        <div>
          <h1 className="text-base font-semibold">科研绘图</h1>
          <p className="text-xs text-[#9fb0b5]">可编辑 SVG · scene.json · PNG 背景</p>
        </div>
      </header>
      <section className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_340px] gap-10 px-6 py-10">
        <div>
          <div className="mb-8 border-l-2 border-[#b89a5d] pl-5">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#1f6f78]">SCI FIGURE BUILDER</p>
            <h2 className="mt-3 font-serif text-4xl font-normal">把研究方法变成图。</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#68777b]">
              用自然语言描述你的研究场景。背景由科研绘图模型生成，标题、节点、箭头和结构全部保留为独立 SVG 元素，
              可继续在 Illustrator、Figma 或 Inkscape 中编辑。
            </p>
          </div>
          <div className="mb-8 flex flex-wrap gap-2">
            <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-[#1f6f78]">
              <Sparkles className="h-3.5 w-3.5" /> 快速开始
            </span>
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setTitle(preset.title);
                  setBackgroundPrompt(preset.prompt);
                  setStages(preset.stages);
                }}
                className="rounded-md border border-[#aa9f82] bg-[#fffaf0] px-3 py-2 text-xs hover:border-[#1f6f78]"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="mb-8 rounded-lg border border-[#b89a5d]/35 bg-[#f8f3e6] p-5">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">先告诉 AI 你想画什么</p>
                <p className="mt-1 text-xs text-[#68777b]">用一句话描述论文方向、研究对象和想表达的关系。</p>
              </div>
              <button
                type="button"
                onClick={() => void refinePrompt()}
                disabled={promptLoading}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-[#1f6f78] px-4 text-xs font-semibold text-white hover:bg-[#185b63] disabled:opacity-50"
              >
                {promptLoading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                AI 润色提示词
              </button>
            </div>
            <textarea
              value={idea}
              onChange={(event) => setIdea(event.target.value)}
              placeholder="例如：我研究城市道路中的多传感器融合定位，希望画出数据输入、融合方法和定位结果之间的关系。"
              className="min-h-24 w-full resize-y rounded-md border border-[#aa9f82] bg-[#fffaf0] px-3 py-3 text-sm leading-6 outline-none focus:border-[#1f6f78]"
              maxLength={2000}
            />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="中转站 Base URL，例如 https://api.example.com/v1" className="h-10 rounded-md border border-[#aa9f82] bg-[#fffaf0] px-3 text-xs outline-none focus:border-[#1f6f78]" />
              <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} type="password" placeholder="中转站 API Key（仅本次使用）" className="h-10 rounded-md border border-[#aa9f82] bg-[#fffaf0] px-3 text-xs outline-none focus:border-[#1f6f78]" />
              <input value={languageModel} onChange={(event) => setLanguageModel(event.target.value)} placeholder="语言模型，例如 gpt-4.1-mini" className="h-10 rounded-md border border-[#aa9f82] bg-[#fffaf0] px-3 text-xs outline-none focus:border-[#1f6f78]" />
              <input value={imageModel} onChange={(event) => setImageModel(event.target.value)} placeholder="生图模型，例如 gpt-image-2" className="h-10 rounded-md border border-[#aa9f82] bg-[#fffaf0] px-3 text-xs outline-none focus:border-[#1f6f78]" />
            </div>
          </div>
          <form onSubmit={submit} className="space-y-6">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">图题</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 w-full rounded-md border border-[#aa9f82] bg-[#fffaf0] px-3 text-sm outline-none focus:border-[#1f6f78]"
                maxLength={160}
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">AI 润色后的无文字底图提示词</span>
              <textarea
                value={backgroundPrompt}
                onChange={(event) => setBackgroundPrompt(event.target.value)}
                className="min-h-28 w-full resize-y rounded-md border border-[#aa9f82] bg-[#fffaf0] px-3 py-3 text-sm leading-6 outline-none focus:border-[#1f6f78]"
                maxLength={2000}
                required
              />
            </label>
            <div>
              <span className="mb-2 block text-sm font-medium">三段结构</span>
              <div className="grid grid-cols-3 gap-3">
                {stages.map((stage, index) => (
                  <input
                    key={index}
                    value={stage}
                    onChange={(event) =>
                      setStages((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)),
                      )
                    }
                    className="h-11 rounded-md border border-[#aa9f82] bg-[#fffaf0] px-3 text-sm outline-none focus:border-[#1f6f78]"
                    maxLength={40}
                    required
                  />
                ))}
              </div>
            </div>
            <div>
              <span className="mb-2 block text-sm font-medium">画布尺寸</span>
              <div className="flex gap-2">
                {[
                  ['2048x1152', '16:9 横版'],
                  ['1536x1152', '4:3 论文'],
                  ['1024x1024', '1:1 方形'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSize(value)}
                    className={`h-10 rounded-md border px-3 text-xs ${size === value ? 'border-[#1f6f78] bg-[#1f6f78] text-white' : 'border-[#aa9f82] bg-[#fffaf0] hover:border-[#1f6f78]'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="border-l-2 border-red-600 pl-3 text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 items-center gap-2 rounded-md bg-[#1f6f78] px-5 text-sm font-semibold text-white hover:bg-[#185b63] disabled:opacity-50"
            >
              {loading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <ChartNoAxesCombined className="h-4 w-4" />
              )}
              生成可编辑科研图
            </button>
          </form>
          {result && (
            <div className="mt-10 rounded-lg border border-[#b89a5d]/35 bg-[#f8f3e6] p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold">生成完成 · {result.elementCount} 个可编辑元素</span>
                <a href={result.bundleUrl} className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1f6f78]" download>
                  <Download className="h-3.5 w-3.5" /> 下载 ZIP
                </a>
              </div>
              <img src={result.previewUrl} alt="科研图预览" className="w-full border border-[#b89a5d]/25" />
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-[#b89a5d]/25 pt-3 text-xs text-[#1f6f78]">
                {[
                  ['preview', '预览 PNG'],
                  ['background', '背景 PNG'],
                  ['svg', '可编辑 SVG'],
                  ['scene', 'scene.json'],
                  ['bundle', '完整 ZIP'],
                ].map(([type, label]) => (
                  <a key={type} href={`/api/figures/${result.jobId}/asset?type=${type}`} className="hover:underline" download>
                    {label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        <aside className="border-l border-[#b89a5d]/35 pl-6">
          <div className="mb-4 flex items-center gap-2">
            <PanelTop className="h-4 w-4 text-[#1f6f78]" />
            <h3 className="text-sm font-semibold">最近任务</h3>
          </div>
          <div className="divide-y divide-[#b89a5d]/20">
            {jobs.length === 0 ? (
              <p className="py-6 text-xs text-[#68777b]">还没有绘图任务。</p>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="py-4">
                  <p className="truncate text-sm font-medium">{job.title}</p>
                  <p className="mt-1 text-xs text-[#68777b]">
                    {job.status === 'completed'
                      ? `${job.elementCount || 0} 个元素 · ${job.width}×${job.height}`
                      : job.status === 'failed'
                        ? job.errorMessage || '生成失败'
                        : '生成中'}
                  </p>
                  {job.status === 'completed' && (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#1f6f78]">
                      <a href={`/api/figures/${job.id}/asset?type=bundle`} className="inline-flex items-center gap-1 hover:underline">
                        <FileJson className="h-3.5 w-3.5" /> 下载编辑包
                      </a>
                      <a href={`/api/figures/${job.id}/asset?type=svg`} className="hover:underline">SVG</a>
                      <a href={`/api/figures/${job.id}/asset?type=scene`} className="hover:underline">JSON</a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}

export default function FiguresPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && !user) router.push('/sign-in?redirect=/figures');
  }, [isLoading, router, user]);
  if (isLoading || !user) return null;
  return (
    <SidebarLayout>
      <FiguresContent />
    </SidebarLayout>
  );
}
