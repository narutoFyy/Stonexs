import 'server-only';

import { mergeAcademicPapers } from './normalize';
import { officialAcademicProviders } from './providers';
import type { AcademicProvider, AcademicSearchResult } from './types';

export async function searchAcademicPapers(
  query: string,
  limit: number,
  providers: AcademicProvider[] = officialAcademicProviders(),
): Promise<AcademicSearchResult> {
  const settled = await Promise.allSettled(providers.map((provider) => provider.search(query, Math.min(limit, 20))));
  const successfulResults = settled.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));

  return {
    query,
    results: mergeAcademicPapers(successfulResults, limit),
    providers: settled.map((result, index) => ({
      source: providers[index].name,
      status: result.status === 'fulfilled' ? 'ok' : 'error',
      count: result.status === 'fulfilled' ? result.value.length : 0,
      ...(result.status === 'rejected'
        ? { message: result.reason instanceof Error ? result.reason.message : 'Provider request failed' }
        : {}),
    })),
  };
}
