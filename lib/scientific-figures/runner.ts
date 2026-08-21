import 'server-only';

import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { XMLParser } from 'fast-xml-parser';
import JSZip from 'jszip';
import sharp from 'sharp';
import { buildScientificScene, sceneElementIds, scientificBackgroundPrompt } from './scene';

const execFileAsync = promisify(execFile);

export interface GenerateScientificFigureInput {
  jobId: string;
  userId: string;
  title: string;
  backgroundPrompt: string;
  stageLabels: [string, string, string];
  requestedSize: string;
  imageApiKey?: string;
  imageBaseUrl?: string;
  imageModel?: string;
}

function skillDirectory() {
  return process.env.MY_IMAGE_SCI_SKILL_DIR || path.join(process.env.CODEX_HOME || path.join(homedir(), '.codex'), 'skills', 'my-image-sci');
}

function storageRoot() {
  return process.env.SCIENTIFIC_FIGURES_STORAGE_ROOT || path.join(process.cwd(), 'storage', 'scientific-figures');
}

async function storeFile(relativeKey: string, body: Uint8Array) {
  const absolutePath = path.join(storageRoot(), relativeKey);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, body);
}

export async function readScientificFigureAsset(relativeKey: string) {
  const root = path.resolve(storageRoot());
  const absolutePath = path.resolve(root, relativeKey);
  if (absolutePath !== root && !absolutePath.startsWith(`${root}${path.sep}`)) throw new Error('资源路径无效');
  return readFile(absolutePath);
}

function parseGeneratorOutput(stdout: string) {
  const payload = JSON.parse(stdout) as {
    ok: boolean;
    results?: Array<{ ok: boolean; path?: string; error?: string }>;
  };
  const result = payload.results?.find((item) => item.ok && item.path);
  if (!payload.ok || !result?.path) throw new Error(payload.results?.find((item) => !item.ok)?.error || '背景图生成失败');
  return result.path;
}

function collectSvgIds(value: unknown, ids = new Set<string>()) {
  if (!value || typeof value !== 'object') return ids;
  if (Array.isArray(value)) {
    value.forEach((item) => collectSvgIds(item, ids));
    return ids;
  }
  const record = value as Record<string, unknown>;
  if (typeof record['@_id'] === 'string') ids.add(record['@_id']);
  Object.values(record).forEach((child) => collectSvgIds(child, ids));
  return ids;
}

export async function generateScientificFigure(input: GenerateScientificFigureInput) {
  const tempRoot = await mkdtemp(path.join(tmpdir(), 'paperwork-figure-'));
  const backgroundPath = path.join(tempRoot, 'background.png');
  const scenePath = path.join(tempRoot, 'scene.json');
  const svgPath = path.join(tempRoot, 'figure.svg');
  const previewPath = path.join(tempRoot, 'preview.png');

  try {
    const skillDir = skillDirectory();
    const generateScript = path.join(skillDir, 'scripts', 'generate.mjs');
    const buildSceneScript = path.join(skillDir, 'scripts', 'build-scene.mjs');
    const prompt = scientificBackgroundPrompt(input.backgroundPrompt);
    const imageConfigPath = path.join(tempRoot, 'my-image.env');
    const normalizedBaseUrl = input.imageBaseUrl?.trim().replace(/\/+$/, '');
    if (input.imageApiKey && input.imageBaseUrl) {
      await writeFile(
        imageConfigPath,
        `OPENAI_BASE_URL=${JSON.stringify(normalizedBaseUrl)}\nOPENAI_API_KEY=${JSON.stringify(input.imageApiKey)}\nIMAGE_MODEL=${JSON.stringify(input.imageModel || 'gpt-image-2')}\n`,
        { encoding: 'utf8', mode: 0o600 },
      );
    }
    const generatorEnv = input.imageApiKey && input.imageBaseUrl
      ? {
          ...process.env,
          MY_IMAGE_GEN_ENV_FILE: imageConfigPath,
          OPENAI_BASE_URL: normalizedBaseUrl,
          OPENAI_API_KEY: input.imageApiKey,
          IMAGE_MODEL: input.imageModel || 'gpt-image-2',
        }
      : process.env;
    const { stdout } = await execFileAsync(process.execPath, [
      generateScript,
      '--prompt', prompt,
      '--size', input.requestedSize,
      '--quality', 'high',
      '--count', '1',
      '--output-dir', tempRoot,
    ], {
      timeout: 330_000,
      maxBuffer: 1024 * 1024,
      env: generatorEnv,
    });
    const generatedPath = parseGeneratorOutput(stdout);
    await sharp(generatedPath).png().toFile(backgroundPath);

    const metadata = await sharp(backgroundPath).metadata();
    if (!metadata.width || !metadata.height) throw new Error('背景图尺寸读取失败');
    const scene = buildScientificScene({
      title: input.title,
      stageLabels: input.stageLabels,
      width: metadata.width,
      height: metadata.height,
    });
    await writeFile(scenePath, `${JSON.stringify(scene, null, 2)}\n`, 'utf8');
    await execFileAsync(process.execPath, [buildSceneScript, '--scene', scenePath, '--output', svgPath], {
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    });

    const svg = await readFile(svgPath, 'utf8');
    const parsedSvg = new XMLParser({ ignoreAttributes: false }).parse(svg);
    const actualIds = collectSvgIds(parsedSvg);
    const expectedIds = sceneElementIds(scene);
    const missingIds = expectedIds.filter((id) => !actualIds.has(id));
    if (missingIds.length) throw new Error(`SVG 缺少可编辑元素: ${missingIds.join(', ')}`);

    await sharp(Buffer.from(svg)).png().toFile(previewPath);
    const files = {
      'background.png': await readFile(backgroundPath),
      'scene.json': await readFile(scenePath),
      'figure.svg': await readFile(svgPath),
      'preview.png': await readFile(previewPath),
    };
    const zip = new JSZip();
    Object.entries(files).forEach(([name, contents]) => zip.file(name, contents));
    const bundle = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });

    const prefix = `scientific-figures/${encodeURIComponent(input.userId)}/${input.jobId}`;
    const keys = {
      backgroundKey: `${prefix}/background.png`,
      sceneKey: `${prefix}/scene.json`,
      svgKey: `${prefix}/figure.svg`,
      previewKey: `${prefix}/preview.png`,
      bundleKey: `${prefix}/figure-bundle.zip`,
    };
    await Promise.all([
      storeFile(keys.backgroundKey, files['background.png']),
      storeFile(keys.sceneKey, files['scene.json']),
      storeFile(keys.svgKey, files['figure.svg']),
      storeFile(keys.previewKey, files['preview.png']),
      storeFile(keys.bundleKey, bundle),
    ]);

    return { ...keys, width: metadata.width, height: metadata.height, elementCount: expectedIds.length };
  } finally {
    if (tempRoot.startsWith(path.join(tmpdir(), 'paperwork-figure-'))) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  }
}

export function createScientificFigureAssetUrl(jobId: string, type: string) {
  return `/api/figures/${encodeURIComponent(jobId)}/asset?type=${encodeURIComponent(type)}`;
}
