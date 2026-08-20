import { NextRequest, NextResponse } from 'next/server';
import { searchAcademicPapers } from '@/lib/academic/search';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() || '';
  const requestedLimit = Number(request.nextUrl.searchParams.get('limit') || DEFAULT_LIMIT);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.floor(requestedLimit), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  if (!query) {
    return NextResponse.json({ error: '请输入关键词、作者或 DOI' }, { status: 400 });
  }

  try {
    const result = await searchAcademicPapers(query, limit);
    return NextResponse.json(result, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    console.error('[academic-search]', error);
    return NextResponse.json({ error: '文献服务暂时不可用，请稍后重试' }, { status: 502 });
  }
}
