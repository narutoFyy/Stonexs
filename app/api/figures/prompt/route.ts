import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

const requestSchema = z.object({
  idea: z.string().trim().min(10).max(2000),
  apiKey: z.string().trim().min(1).max(500),
  baseUrl: z.string().url().max(500),
  languageModel: z.string().trim().min(1).max(120).default('gpt-4.1-mini'),
});

const promptOutput = z.object({
  title: z.string().trim().min(2).max(160),
  backgroundPrompt: z.string().trim().min(20).max(2000),
  stageLabels: z.tuple([
    z.string().trim().min(1).max(40),
    z.string().trim().min(1).max(40),
    z.string().trim().min(1).max(40),
  ]),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  let input: z.infer<typeof requestSchema>;
  try {
    input = requestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: '请先描述你的论文方向和想绘制的内容' }, { status: 400 });
  }

  try {
    const system = [
        '你是科研绘图提示词编辑。',
        '把用户的简短论文想法整理为一张通用 SCI 论文方法图的绘图方案。',
        'backgroundPrompt 只描述无文字的视觉背景，禁止文字、标签、箭头、边框、图例、水印和 logo。',
        '使用准确、克制、适合论文排版的视觉语言，避免虚构实验结果。',
        'stageLabels 必须是三个简短的中文结构节点。',
      ].join(' ');
    const response = await fetch(`${input.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json', authorization: `Bearer ${input.apiKey}` },
      body: JSON.stringify({
        model: input.languageModel,
        temperature: 0.35,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: `${system} 只输出 JSON，字段为 title、backgroundPrompt、stageLabels。` }, { role: 'user', content: input.idea }],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) throw new Error(`中转站返回 HTTP ${response.status}`);
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error('中转站没有返回提示词');
    let output: z.infer<typeof promptOutput>;
    try {
      const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1] || content;
      output = promptOutput.parse(JSON.parse(fenced));
    } catch {
      throw new Error('中转站返回的提示词格式不正确');
    }

    return NextResponse.json(output, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('[figure-prompt]', error);
    return NextResponse.json({ error: '提示词润色暂时不可用，请直接编辑下方字段后继续' }, { status: 502 });
  }
}
