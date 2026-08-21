import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getScientificFigureProviderConfig } from '@/lib/scientific-figures/config';

export const runtime = 'nodejs';
export const maxDuration = 60;

const requestSchema = z.object({
  idea: z.string().trim().min(10).max(2000),
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

function parsePromptOutput(content: string): z.infer<typeof promptOutput> {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1] || content;
  const candidates = [fenced.trim()];
  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');
  if (start >= 0 && end > start) candidates.push(fenced.slice(start, end + 1));
  for (const candidate of candidates) {
    try {
      return promptOutput.parse(JSON.parse(candidate));
    } catch {
      // Try the next common JSON wrapper before reporting a provider format error.
    }
  }
  throw new Error('中转站返回的提示词格式不正确');
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  let provider: ReturnType<typeof getScientificFigureProviderConfig>;
  try {
    provider = getScientificFigureProviderConfig();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '科研绘图服务尚未配置' }, { status: 503 });
  }

  let input: z.infer<typeof requestSchema>;
  try {
    input = requestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: '请先描述你的论文方向和想绘制的内容' }, { status: 400 });
  }

  try {
    const system = [
        '你是科研绘图提示词编辑。',
        '把用户的简短论文想法整理为一张通用 SCI 论文方法图的内容方案。',
        'backgroundPrompt 是给底图模型的具体内容简报，只描述研究对象、关键装置或环境、空间位置和视觉关系，不重复通用风格套话。',
        '底图内容必须是可放在论文图版边缘的真实科学对象，列出 3 到 6 个具体对象，避免抽象的“数据纹理”“未来科技”“复杂系统”等空泛词。',
        'backgroundPrompt 禁止文字、标签、数字、箭头、连接线、边框、图例、水印、logo、完整流程图和虚构实验结果；所有语义标注由 SVG 层生成。',
        '使用准确、克制、适合论文排版的视觉语言，描述清晰的构图和留白，避免电影海报、营销插画和装饰性堆砌。',
        'stageLabels 必须是三个简短的中文结构节点。',
      ].join(' ');
    const response = await fetch(`${provider.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json', authorization: `Bearer ${provider.languageApiKey}` },
      body: JSON.stringify({
        model: provider.languageModel,
        max_tokens: 1200,
        messages: [{ role: 'system', content: `${system} 只输出 JSON，字段为 title、backgroundPrompt、stageLabels。` }, { role: 'user', content: input.idea }],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) throw new Error(`中转站返回 HTTP ${response.status}`);
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error('中转站没有返回提示词');
    const output = parsePromptOutput(content);

    return NextResponse.json(output, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('[figure-prompt]', error);
    return NextResponse.json({ error: '提示词润色暂时不可用，请直接编辑下方字段后继续' }, { status: 502 });
  }
}
