'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, FileText, LoaderCircle, RefreshCw } from 'lucide-react';
import { SidebarLayout } from '@/components/sidebar-layout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useUser } from '@/contexts/user-context';

interface DownloadOrder {
  id: string;
  title: string;
  doi?: string | null;
  amountFen: number;
  status: 'requested' | 'stored' | 'debited' | 'delivered' | 'refund_pending' | 'refunded' | 'failed';
  sizeBytes?: number | null;
  createdAt: string;
  deliveredAt?: string | null;
}

const statusLabels: Record<DownloadOrder['status'], string> = {
  requested: '准备中',
  stored: '文件已验证',
  debited: '正在交付',
  delivered: '已交付',
  refund_pending: '退款处理中',
  refunded: '已退款',
  failed: '未完成',
};

function formatBytes(value?: number | null) {
  if (!value) return '—';
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function DownloadsContent() {
  const [orders, setOrders] = useState<DownloadOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/papers/downloads', { cache: 'no-store' });
      const payload = (await response.json()) as { orders?: DownloadOrder[]; error?: string };
      if (!response.ok) throw new Error(payload.error || '下载记录加载失败');
      setOrders(payload.orders || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '下载记录加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  async function redownload(order: DownloadOrder) {
    setDownloading(order.id);
    try {
      const response = await fetch(`/api/papers/downloads/${order.id}`, { cache: 'no-store' });
      const payload = (await response.json()) as { downloadUrl?: string; error?: string };
      if (!response.ok || !payload.downloadUrl) throw new Error(payload.error || '下载链接生成失败');
      window.location.assign(payload.downloadUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '下载链接生成失败');
    } finally {
      setDownloading(null);
    }
  }

  return (
    <main className="min-h-svh w-full bg-[#f3eedf] text-[#17242a]">
      <header className="flex h-16 items-center border-b border-[#d7bd7b]/30 bg-[#0b1822] px-6 text-[#f4eedf]">
        <SidebarTrigger className="mr-3" />
        <div>
          <h1 className="text-base font-semibold">论文下载</h1>
          <p className="text-xs text-[#9fb0b5]">每次成功交付 ¥1.00</p>
        </div>
        <button
          type="button"
          onClick={() => void loadOrders()}
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#d7bd7b]/40 text-[#d7bd7b] hover:bg-[#172832]"
          title="刷新"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <section className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="mb-8 grid grid-cols-[1fr_140px_140px_120px] border-y border-[#b89a5d]/35 py-3 text-xs font-medium text-[#68777b]">
          <span>论文</span>
          <span>状态</span>
          <span>文件</span>
          <span className="text-right">操作</span>
        </div>

        {error && <p className="mb-5 border-l-2 border-red-600 pl-3 text-sm text-red-700">{error}</p>}
        {loading ? (
          <div className="flex h-40 items-center justify-center text-[#68777b]">
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            加载中
          </div>
        ) : orders.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center border-b border-[#b89a5d]/30 text-center">
            <FileText className="mb-4 h-7 w-7 text-[#1f6f78]" />
            <p className="text-sm font-medium">还没有论文下载记录</p>
            <p className="mt-2 text-xs text-[#68777b]">在文献搜索结果中选择开放 PDF 开始下载。</p>
          </div>
        ) : (
          <div className="divide-y divide-[#b89a5d]/20 border-b border-[#b89a5d]/35">
            {orders.map((order) => (
              <article
                key={order.id}
                className="grid min-h-20 grid-cols-[1fr_140px_140px_120px] items-center py-4 text-sm"
              >
                <div className="min-w-0 pr-8">
                  <h2 className="truncate font-medium">{order.title}</h2>
                  <p className="mt-1 truncate text-xs text-[#68777b]">
                    {order.doi || new Date(order.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                <span className={order.status === 'delivered' ? 'text-[#1f6f78]' : 'text-[#68777b]'}>
                  {statusLabels[order.status]}
                </span>
                <span className="text-[#68777b]">{formatBytes(order.sizeBytes)}</span>
                <div className="text-right">
                  {order.status === 'delivered' ? (
                    <button
                      type="button"
                      onClick={() => void redownload(order)}
                      disabled={downloading === order.id}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#1f6f78] px-3 text-xs font-medium text-[#1f6f78] hover:bg-[#1f6f78] hover:text-white disabled:opacity-50"
                    >
                      {downloading === order.id ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      再次下载
                    </button>
                  ) : (
                    <span className="text-xs text-[#879398]">¥{(order.amountFen / 100).toFixed(2)}</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default function DownloadsPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && !user) router.push('/sign-in?redirect=/downloads');
  }, [isLoading, router, user]);
  if (isLoading || !user) return null;
  return (
    <SidebarLayout>
      <DownloadsContent />
    </SidebarLayout>
  );
}
