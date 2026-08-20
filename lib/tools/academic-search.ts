import { tool, type UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import { searchAcademicPapers } from '@/lib/academic/search';
import type { ChatMessage } from '@/lib/types';

export function academicSearchTool(dataStream?: UIMessageStreamWriter<ChatMessage>) {
  return tool({
    description: 'Search scholarly papers across multiple academic indexes with one or more queries.',
    inputSchema: z.object({
      queries: z.array(z.string().trim().min(1)).min(1).max(5),
      maxResults: z.array(z.number().int().min(1).max(50)).optional(),
    }),
    execute: async ({ queries, maxResults }: { queries: string[]; maxResults?: number[] }) => {
      const searches = await Promise.all(
        queries.map(async (query, index) => {
          const currentMaxResults = maxResults?.[index] || maxResults?.[0] || 20;
          dataStream?.write({
            type: 'data-query_completion',
            data: {
              query,
              index,
              total: queries.length,
              status: 'started',
              resultsCount: 0,
              imagesCount: 0,
            },
          });

          try {
            const result = await searchAcademicPapers(query, currentMaxResults);
            dataStream?.write({
              type: 'data-query_completion',
              data: {
                query,
                index,
                total: queries.length,
                status: 'completed',
                resultsCount: result.results.length,
                imagesCount: 0,
              },
            });
            return result;
          } catch (error) {
            dataStream?.write({
              type: 'data-query_completion',
              data: {
                query,
                index,
                total: queries.length,
                status: 'error',
                resultsCount: 0,
                imagesCount: 0,
              },
            });
            return {
              query,
              results: [],
              providers: [],
              error: error instanceof Error ? error.message : 'Academic search failed',
            };
          }
        }),
      );

      return { searches };
    },
  });
}
