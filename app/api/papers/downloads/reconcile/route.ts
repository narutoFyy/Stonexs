import { and, eq, inArray, lt } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { maindb } from '@/lib/db';
import { paperDownloadOrder } from '@/lib/db/schema';
import { PAPER_DOWNLOAD_PRICE_YUAN } from '@/lib/paper-delivery/types';
import { adjustWalletBalance } from '@/lib/sub2api/client';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const staleBefore = new Date(Date.now() - 15 * 60 * 1000);
  const orders = await maindb
    .select()
    .from(paperDownloadOrder)
    .where(
      and(
        inArray(paperDownloadOrder.status, ['debited', 'refund_pending']),
        lt(paperDownloadOrder.updatedAt, staleBefore),
      ),
    )
    .limit(100);

  const results: Array<{ orderId: string; status: 'refunded' | 'pending'; error?: string }> = [];
  for (const order of orders) {
    const remoteUserId = Number(order.userId);
    if (!Number.isSafeInteger(remoteUserId) || remoteUserId <= 0) {
      results.push({ orderId: order.id, status: 'pending', error: 'Invalid user id' });
      continue;
    }

    try {
      await maindb
        .update(paperDownloadOrder)
        .set({ status: 'refund_pending', updatedAt: new Date() })
        .where(eq(paperDownloadOrder.id, order.id));
      await adjustWalletBalance({
        userId: remoteUserId,
        amount: PAPER_DOWNLOAD_PRICE_YUAN,
        operation: 'add',
        idempotencyKey: order.refundIdempotencyKey,
        notes: `Paperwork PDF reconciliation refund ${order.id}`,
      });
      await maindb
        .update(paperDownloadOrder)
        .set({ status: 'refunded', refundedAt: new Date(), updatedAt: new Date() })
        .where(eq(paperDownloadOrder.id, order.id));
      results.push({ orderId: order.id, status: 'refunded' });
    } catch (cause) {
      results.push({
        orderId: order.id,
        status: 'pending',
        error: cause instanceof Error ? cause.message : 'Refund failed',
      });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
