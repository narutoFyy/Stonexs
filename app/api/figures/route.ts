import { desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { maindb } from '@/lib/db';
import { scientificFigureJob } from '@/lib/db/schema';
import { getScientificFigureProviderConfig } from '@/lib/scientific-figures/config';
import { createScientificFigureAssetUrl, generateScientificFigure } from '@/lib/scientific-figures/runner';
import { debitSharedBalance, SharedBalanceError } from '@/lib/sub2api/database';

export const runtime = 'nodejs';
export const maxDuration = 360;

const figureSchema = z.object({
  title: z.string().trim().min(2).max(160),
  backgroundPrompt: z.string().trim().min(10).max(2000),
  stageLabels: z.tuple([
    z.string().trim().min(1).max(40),
    z.string().trim().min(1).max(40),
    z.string().trim().min(1).max(40),
  ]),
  size: z.enum(['2048x1152', '1536x1152', '1024x1024']).default('2048x1152'),
});

async function sessionFor(request: NextRequest) {
  return auth.api.getSession({ headers: request.headers });
}

export async function GET(request: NextRequest) {
  const session = await sessionFor(request);
  if (!session?.user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  const jobs = await maindb
    .select({
      id: scientificFigureJob.id,
      title: scientificFigureJob.title,
      stageLabels: scientificFigureJob.stageLabels,
      width: scientificFigureJob.width,
      height: scientificFigureJob.height,
      status: scientificFigureJob.status,
      elementCount: scientificFigureJob.elementCount,
      errorMessage: scientificFigureJob.errorMessage,
      createdAt: scientificFigureJob.createdAt,
      completedAt: scientificFigureJob.completedAt,
    })
    .from(scientificFigureJob)
    .where(eq(scientificFigureJob.userId, session.user.id))
    .orderBy(desc(scientificFigureJob.createdAt))
    .limit(30);
  return NextResponse.json({ jobs });
}

export async function POST(request: NextRequest) {
  const session = await sessionFor(request);
  if (!session?.user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  let input: z.infer<typeof figureSchema>;
  try {
    input = figureSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: '请完整填写图题、背景描述和三个流程节点' }, { status: 400 });
  }

  let provider: ReturnType<typeof getScientificFigureProviderConfig>;
  try {
    provider = getScientificFigureProviderConfig();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '科研绘图服务尚未配置' }, { status: 503 });
  }

  const remoteUserId = Number(session.user.id);
  if (!Number.isSafeInteger(remoteUserId) || remoteUserId <= 0) {
    return NextResponse.json({ error: '账号标识无效' }, { status: 400 });
  }

  const [requestedWidth, requestedHeight] = input.size.split('x').map(Number);
  const [job] = await maindb
    .insert(scientificFigureJob)
    .values({
      userId: session.user.id,
      title: input.title,
      backgroundPrompt: input.backgroundPrompt,
      stageLabels: input.stageLabels,
      width: requestedWidth,
      height: requestedHeight,
    })
    .returning();
  if (!job) return NextResponse.json({ error: '绘图任务创建失败' }, { status: 500 });

  try {
    await maindb
      .update(scientificFigureJob)
      .set({ status: 'generating', updatedAt: new Date() })
      .where(eq(scientificFigureJob.id, job.id));
    const generated = await generateScientificFigure({
      jobId: job.id,
      userId: session.user.id,
      title: input.title,
      backgroundPrompt: input.backgroundPrompt,
      stageLabels: input.stageLabels,
      requestedSize: input.size,
      imageApiKey: provider.imageApiKey,
      imageBaseUrl: provider.baseUrl,
      imageModel: provider.imageModel,
    });
    await debitSharedBalance({
      userId: remoteUserId,
      amount: 1,
      idempotencyKey: `figure:${job.id}:debit`,
      notes: `Scientific figure generation ${job.id}`,
    });
    await maindb
      .update(scientificFigureJob)
      .set({
        status: 'completed',
        ...generated,
        completedAt: new Date(),
        updatedAt: new Date(),
        errorMessage: null,
      })
      .where(eq(scientificFigureJob.id, job.id));

    return NextResponse.json({
      jobId: job.id,
      status: 'completed',
      width: generated.width,
      height: generated.height,
      elementCount: generated.elementCount,
      previewUrl: createScientificFigureAssetUrl(job.id, 'preview'),
      bundleUrl: createScientificFigureAssetUrl(job.id, 'bundle'),
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : '科研绘图生成失败';
    await maindb
      .update(scientificFigureJob)
      .set({ status: 'failed', errorMessage: message.slice(0, 2000), updatedAt: new Date() })
      .where(eq(scientificFigureJob.id, job.id));
    const status = cause instanceof SharedBalanceError ? cause.status : 502;
    return NextResponse.json({ jobId: job.id, status: 'failed', error: message }, { status });
  }
}
