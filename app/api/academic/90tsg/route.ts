import { NextResponse } from 'next/server';

const DEFAULT_ENTRY = 'http://www.90tsg.com/e/action/ShowInfo.php?classid=84&id=4519';

// Keep the provider URL configurable; credentials and browser cookies stay out
// of the application and are handled by the user's existing browser session.
export function GET() {
  const entry = process.env.TSG_ENGLISH_DATABASE_ENTRY_URL || DEFAULT_ENTRY;
  return NextResponse.redirect(entry, 307);
}
