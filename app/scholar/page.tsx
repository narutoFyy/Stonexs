import { ScholarSearchPage } from '@/components/scholar-search-page';

interface ScholarRouteProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ScholarRoute({ searchParams }: ScholarRouteProps) {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q : '';
  return <ScholarSearchPage initialQuery={query} />;
}
