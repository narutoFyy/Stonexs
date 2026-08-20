'use client';

import { useRef, useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { sileo } from 'sileo';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface PaperDownloadButtonProps {
  sourceUrl: string;
  title: string;
  doi?: string;
}

export function PaperDownloadButton({ sourceUrl, title, doi }: PaperDownloadButtonProps) {
  const pathname = usePathname();
  const requestId = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function downloadPaper() {
    setLoading(true);
    requestId.current ||= crypto.randomUUID();

    try {
      const response = await fetch('/api/papers/downloads', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': requestId.current,
        },
        body: JSON.stringify({ sourceUrl, title, doi }),
      });
      const payload = (await response.json()) as { downloadUrl?: string; error?: string; status?: string };

      if (response.status === 401) {
        window.location.assign(`/sign-in?redirect=${encodeURIComponent(pathname || '/')}`);
        return;
      }
      if (!response.ok || !payload.downloadUrl) {
        if (payload.status === 'failed' || payload.status === 'refunded') requestId.current = null;
        throw new Error(payload.error || '论文下载失败');
      }

      setOpen(false);
      requestId.current = null;
      sileo.success({ title: '论文已交付', description: '本次下载已扣除 ¥1.00' });
      window.location.assign(payload.downloadUrl);
    } catch (error) {
      sileo.error({
        title: '下载未完成',
        description: error instanceof Error ? error.message : '请稍后重试',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 border border-[#d7bd7b]/55 bg-[#f0ead9] px-2.5 text-[11px] font-medium text-[#1b353c] transition-colors hover:bg-[#217d84] hover:text-[#f4eedf]"
        >
          <Download className="h-3.5 w-3.5" />
          下载 PDF · ¥1
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md rounded-none border-black bg-white text-black">
        <AlertDialogHeader>
          <AlertDialogTitle>确认下载这篇论文？</AlertDialogTitle>
          <AlertDialogDescription className="leading-6 text-neutral-600">
            系统会先验证 PDF，交付成功后从 yf-mail.com 余额扣除 ¥1.00。交付失败会自动退款。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="border-y border-black/15 py-3 text-sm font-medium">{title}</div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>取消</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(event) => {
              event.preventDefault();
              void downloadPaper();
            }}
            className="rounded-none bg-[#002FA7] text-white hover:bg-[#002FA7]/90"
          >
            {loading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
            确认支付 ¥1.00
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
