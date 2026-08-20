import { randomUUID } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { maindb } from '@/lib/db';
import { paperDownloadOrder } from '@/lib/db/schema';
import { adjustWalletBalance, Sub2ApiError } from '@/lib/sub2api/client';
import { fulfillPaperDelivery } from '@/lib/paper-delivery/service';
import { downloadAndValidatePdf } from '@/lib/paper-delivery/validation';
import { createPaperDownloadUrl, paperObjectKey, storePaperPdf } from '@/lib/paper-delivery/storage';
import { PAPER_DOWNLOAD_PRICE_FEN, PAPER_DOWNLOAD_PRICE_YUAN, PaperDeliveryError } from '@/lib/paper-delivery/types';

export const runtime = 'nodejs';

const createOrderSchema = z.object({
  sourceUrl: z.string().url().max(4096),
  title: z.string().trim().min(1).max(500),
  doi: z.string().trim().max(255).optional(),
  clientRequestId: z.string().trim().min(8).max(128).optional(),
});

function apiError(error: unknown) {
  if (error instanceof PaperDeliveryError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof Sub2ApiError) {
    const status = error.status === 400 || error.status === 409 ? 402 : error.status;
    return NextResponse.json({ error: error.message, code: 'WALLET_ERROR' }, { status });
  }
  return NextResponse.json({ error: '论文交付失败', code: 'DELIVERY_FAILED' }, { status: 502 });
}

async function currentUser(request: NextRequest) {
  return auth.api.getSession({ headers: request.headers });
}

export async function GET(request: NextRequest) {
  const session = await currentUser(request);
  if (!session?.user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const orders = await maindb
    .select({
      id: paperDownloadOrder.id,
      title: paperDownloadOrder.title,
      doi: paperDownloadOrder.doi,
      amountFen: paperDownloadOrder.amountFen,
      status: paperDownloadOrder.status,
      sizeBytes: paperDownloadOrder.sizeBytes,
      createdAt: paperDownloadOrder.createdAt,
      deliveredAt: paperDownloadOrder.deliveredAt,
      refundedAt: paperDownloadOrder.refundedAt,
    })
    .from(paperDownloadOrder)
    .where(eq(paperDownloadOrder.userId, session.user.id))
    .orderBy(desc(paperDownloadOrder.createdAt))
    .limit(50);

  return NextResponse.json({ orders, priceYuan: PAPER_DOWNLOAD_PRICE_YUAN });
}

export async function POST(request: NextRequest) {
  const session = await currentUser(request);
  if (!session?.user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  let parsed: z.infer<typeof createOrderSchema>;
  try {
    parsed = createOrderSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: '论文下载参数不完整', code: 'INVALID_REQUEST' }, { status: 400 });
  }

  const clientRequestId = request.headers.get('idempotency-key')?.trim() || parsed.clientRequestId || randomUUID();
  if (clientRequestId.length < 8 || clientRequestId.length > 128) {
    return NextResponse.json({ error: '幂等键长度必须为 8 到 128 个字符', code: 'INVALID_IDEMPOTENCY_KEY' }, { status: 400 });
  }

  const remoteUserId = Number(session.user.id);
  if (!Number.isSafeInteger(remoteUserId) || remoteUserId <= 0) {
    return NextResponse.json({ error: '账号标识无效', code: 'INVALID_USER' }, { status: 400 });
  }

  const proposedId = randomUUID();
  const debitKey = `paper:${proposedId}:debit`;
  const refundKey = `paper:${proposedId}:refund`;
  const inserted = await maindb
    .insert(paperDownloadOrder)
    .values({
      id: proposedId,
      userId: session.user.id,
      clientRequestId,
      sourceUrl: parsed.sourceUrl,
      title: parsed.title,
      doi: parsed.doi || null,
      amountFen: PAPER_DOWNLOAD_PRICE_FEN,
      debitIdempotencyKey: debitKey,
      refundIdempotencyKey: refundKey,
    })
    .onConflictDoNothing({ target: [paperDownloadOrder.userId, paperDownloadOrder.clientRequestId] })
    .returning();

  const order = inserted[0] || (await maindb.query.paperDownloadOrder.findFirst({
    where: and(
      eq(paperDownloadOrder.userId, session.user.id),
      eq(paperDownloadOrder.clientRequestId, clientRequestId),
    ),
  }));
  if (!order) return NextResponse.json({ error: '订单创建失败', code: 'ORDER_CREATE_FAILED' }, { status: 500 });

  if (order.status === 'delivered' && order.objectKey) {
    return NextResponse.json({
      orderId: order.id,
      status: order.status,
      chargedYuan: PAPER_DOWNLOAD_PRICE_YUAN,
      downloadUrl: await createPaperDownloadUrl(order.objectKey, order.title),
    });
  }
  if (order.status === 'refunded' || order.status === 'failed') {
    return NextResponse.json(
      { orderId: order.id, status: order.status, error: order.failureMessage || '该订单未完成交付' },
      { status: 409 },
    );
  }

  try {
    const result = await fulfillPaperDelivery(
      {
        id: order.id,
        userId: order.userId,
        sourceUrl: order.sourceUrl,
        title: order.title,
        debitIdempotencyKey: order.debitIdempotencyKey,
        refundIdempotencyKey: order.refundIdempotencyKey,
      },
      {
        fetchPdf: downloadAndValidatePdf,
        objectKey: (current, pdf) => paperObjectKey(current.userId, current.id, pdf.sha256),
        storePdf: storePaperPdf,
        debit: async (idempotencyKey) => {
          await adjustWalletBalance({
            userId: remoteUserId,
            amount: PAPER_DOWNLOAD_PRICE_YUAN,
            operation: 'subtract',
            idempotencyKey,
            notes: `Paperwork PDF download ${order.id}`,
          });
        },
        refund: async (idempotencyKey) => {
          await adjustWalletBalance({
            userId: remoteUserId,
            amount: PAPER_DOWNLOAD_PRICE_YUAN,
            operation: 'add',
            idempotencyKey,
            notes: `Paperwork PDF refund ${order.id}`,
          });
        },
        issueDownload: createPaperDownloadUrl,
        record: async (update) => {
          await maindb
            .update(paperDownloadOrder)
            .set({ ...update, updatedAt: new Date() })
            .where(and(eq(paperDownloadOrder.id, order.id), eq(paperDownloadOrder.userId, session.user.id)));
        },
      },
    );

    return NextResponse.json({
      orderId: order.id,
      status: 'delivered',
      chargedYuan: PAPER_DOWNLOAD_PRICE_YUAN,
      downloadUrl: result.downloadUrl,
      sizeBytes: result.sizeBytes,
      sha256: result.sha256,
    });
  } catch (error) {
    return apiError(error);
  }
}
