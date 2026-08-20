import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { maindb } from '@/lib/db';
import { scientificFigureJob } from '@/lib/db/schema';
import { readScientificFigureAsset } from '@/lib/scientific-figures/runner';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

const assets = {
  bundle: { key: 'bundleKey', filename: 'editable-figure.zip', contentType: 'application/zip' },
  preview: { key: 'previewKey', filename: 'preview.png', contentType: 'image/png' },
  svg: { key: 'svgKey', filename: 'figure.svg', contentType: 'image/svg+xml' },
  scene: { key: 'sceneKey', filename: 'scene.json', contentType: 'application/json' },
  background: { key: 'backgroundKey', filename: 'background.png', contentType: 'image/png' },
} as const;

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  const { id } = await context.params;
  const assetName = request.nextUrl.searchParams.get('type') as keyof typeof assets | null;
  if (!assetName || !assets[assetName]) return NextResponse.json({ error: '资源类型无效' }, { status: 400 });

  const job = await maindb.query.scientificFigureJob.findFirst({
    where: and(eq(scientificFigureJob.id, id), eq(scientificFigureJob.userId, session.user.id)),
  });
  if (!job) return NextResponse.json({ error: '绘图任务不存在' }, { status: 404 });
  if (job.status !== 'completed') return NextResponse.json({ error: '绘图任务尚未完成', status: job.status }, { status: 409 });

  const asset = assets[assetName];
  const key = job[asset.key];
  if (!key) return NextResponse.json({ error: '绘图资源不存在' }, { status: 404 });
  try {
    const body = await readScientificFigureAsset(key);
    const disposition = request.nextUrl.searchParams.get('disposition') === 'inline' ? 'inline' : 'attachment';
    return new NextResponse(body, {
      headers: {
        'Content-Type': asset.contentType,
        'Content-Length': String(body.byteLength),
        'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(asset.filename)}`,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch {
    return NextResponse.json({ error: '绘图资源读取失败' }, { status: 404 });
  }
}
