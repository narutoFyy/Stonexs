import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { maindb } from '@/lib/db';
import { paperDownloadOrder } from '@/lib/db/schema';
import { createPaperDownloadUrl } from '@/lib/paper-delivery/storage';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const { id } = await context.params;
  const order = await maindb.query.paperDownloadOrder.findFirst({
    where: and(eq(paperDownloadOrder.id, id), eq(paperDownloadOrder.userId, session.user.id)),
  });
  if (!order) return NextResponse.json({ error: '订单不存在' }, { status: 404 });
  if (order.status !== 'delivered' || !order.objectKey) {
    return NextResponse.json({ error: '该订单尚未完成交付', status: order.status }, { status: 409 });
  }

  return NextResponse.json({
    orderId: order.id,
    status: order.status,
    downloadUrl: await createPaperDownloadUrl(order.objectKey, order.title),
  });
}
