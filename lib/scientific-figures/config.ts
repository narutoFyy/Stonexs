import 'server-only';

import { serverEnv } from '@/env/server';

export function getScientificFigureProviderConfig() {
  const legacyApiKey = serverEnv.SCIENTIFIC_FIGURES_API_KEY || serverEnv.OPENAI_API_KEY;
  const languageApiKey = serverEnv.SCIENTIFIC_FIGURES_LANGUAGE_API_KEY || legacyApiKey;
  const imageApiKey = serverEnv.SCIENTIFIC_FIGURES_IMAGE_API_KEY || legacyApiKey;
  const baseUrl = serverEnv.SCIENTIFIC_FIGURES_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  if (!languageApiKey || !imageApiKey || !baseUrl) throw new Error('科研绘图服务尚未配置');
  return {
    languageApiKey,
    imageApiKey,
    baseUrl,
    imageModel: serverEnv.SCIENTIFIC_FIGURES_IMAGE_MODEL || 'gpt-image-2',
    languageModel: serverEnv.SCIENTIFIC_FIGURES_LANGUAGE_MODEL || 'gpt-5.6-sol',
  };
}
