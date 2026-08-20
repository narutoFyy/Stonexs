export const ACCESS_COOKIE = 'research_access';
export const REFRESH_COOKIE = 'research_refresh';

export function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;

  for (const pair of cookieHeader.split(';')) {
    const separator = pair.indexOf('=');
    if (separator === -1) continue;
    const key = pair.slice(0, separator).trim();
    if (key !== name) continue;
    return decodeURIComponent(pair.slice(separator + 1).trim());
  }

  return null;
}
