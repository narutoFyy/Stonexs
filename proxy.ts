import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, readCookie } from '@/lib/sub2api/cookies';

const protectedRoutes = ['/settings', '/searches', '/figures', '/downloads'];

function signInRedirect(request: NextRequest) {
  const url = new URL('/sign-in', request.url);
  url.searchParams.set('redirect', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/api/search') return NextResponse.next();
  if (pathname.startsWith('/new') || pathname.startsWith('/api/search')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/raycast')) {
    return NextResponse.next();
  }

  const sessionCookie = readCookie(request.headers.get('cookie'), ACCESS_COOKIE);

  // Allow /settings as a real page; still protect it behind auth
  if (pathname === '/settings') {
    if (!sessionCookie) {
      return signInRedirect(request);
    }
    return NextResponse.next();
  }

  // Do not redirect away from the sign-in page based on a stale cookie. The
  // login endpoint is the source of truth and can replace an expired token.

  if (!sessionCookie && protectedRoutes.some((route) => pathname.startsWith(route))) {
    return signInRedirect(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
