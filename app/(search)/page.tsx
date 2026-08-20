import { ScholarSearchPage } from '@/components/scholar-search-page';
import { redirect } from 'next/navigation';

// The landing page also handles internal redirect query parameters after login.
// Keep it dynamic so `/?redirect=/figures` is evaluated per request.
export const dynamic = 'force-dynamic';

function safePath(value: string | string[] | undefined) {
  const target = Array.isArray(value) ? value[0] : value;
  return target && target.startsWith('/') && !target.startsWith('//') ? target : null;
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const redirectTarget = safePath(params.redirect ?? params.redirectTo);
  if (redirectTarget) redirect(redirectTarget);

  return <ScholarSearchPage />;
}
