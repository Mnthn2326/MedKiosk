import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { sanitizeRedirectPath } from '@/lib/authRoutes';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // Validate and sanitize the redirect destination to prevent open redirects (AUTH-05)
  const nextParam = searchParams.get('next');
  const safeNext = sanitizeRedirectPath(nextParam, '/');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(safeNext, origin).toString());
    }
  }

  // return the user to an error page with some instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`);
}
