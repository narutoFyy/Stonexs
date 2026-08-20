'use client';

import Link from 'next/link';
import { ArrowUpRight, BookOpen, ChartNoAxesCombined, Orbit, Search, WalletCards } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh w-full bg-[#08131c] text-[#f4eedf] lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
      <aside className="relative hidden min-h-svh overflow-hidden border-r border-[#d7bd7b]/25 bg-[#08131c] lg:block">
        <div className="absolute inset-0 bg-[url('/visuals/shitou-astral-observatory.png')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-[#050c12]/70" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(215,189,123,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(215,189,123,0.08)_1px,transparent_1px)] bg-[size:72px_72px]" />
        <div className="relative flex min-h-svh flex-col justify-between p-12 xl:p-16">
          <div>
            <Link href="/" className="inline-flex items-center gap-3 text-xl">
              <span className="flex h-9 w-9 items-center justify-center border border-[#d7bd7b]/60 bg-[#0b1822] text-[#d7bd7b]">
                <Orbit className="h-4 w-4" />
              </span>
              <span className="font-serif">石头学术</span>
            </Link>
            <div className="mt-28 max-w-xl border-l-2 border-[#d7bd7b] pl-6">
              <p className="text-xs font-semibold tracking-[0.18em] text-[#d7bd7b]">研究生论文工作台</p>
              <h1 className="mt-5 font-serif text-6xl font-normal leading-[0.96] xl:text-7xl">石头学术</h1>
              <p className="mt-7 max-w-md text-base leading-7 text-[#b9c5c8]">
                用一个账号完成混合文献搜索、论文下载和科研绘图。研究记录与 yf-mail.com 余额保持同步。
              </p>
            </div>
          </div>

          <div className="grid max-w-xl grid-cols-3 border-y border-[#d7bd7b]/30 py-4 text-sm text-[#c9d2d4]">
            <div className="pr-4">
              <Search className="mb-3 h-4 w-4 text-[#d7bd7b]" />
              <span>混合搜索</span>
            </div>
            <div className="border-l border-[#d7bd7b]/20 px-4">
              <BookOpen className="mb-3 h-4 w-4 text-[#d7bd7b]" />
              <span>论文交付</span>
            </div>
            <div className="border-l border-[#d7bd7b]/20 pl-4">
              <ChartNoAxesCombined className="mb-3 h-4 w-4 text-[#d7bd7b]" />
              <span>科研绘图</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex min-h-svh flex-col bg-[#f3eedf] text-[#17242a]">
        <header className="flex items-center justify-between border-b border-[#b89a5d]/30 px-6 py-5 lg:px-12">
          <Link href="/" className="font-serif text-lg lg:hidden">
            石头学术
          </Link>
          <span className="ml-auto text-xs text-[#68777b]">研究工具 · 账户入口</span>
        </header>
        <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-12">{children}</div>
        <footer className="flex items-center justify-between border-t border-[#b89a5d]/30 px-6 py-4 text-xs text-[#68777b] lg:px-12">
          <span className="inline-flex items-center gap-2">
            <WalletCards className="h-3.5 w-3.5" />
            余额由 yf-mail.com 同步
          </span>
          <a
            className="inline-flex items-center gap-1 hover:text-[#1f6f78]"
            href="https://yf-mail.com"
            target="_blank"
            rel="noreferrer"
          >
            打开 yf-mail.com <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </footer>
      </main>
    </div>
  );
}
