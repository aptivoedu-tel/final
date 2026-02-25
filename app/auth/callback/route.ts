// NextAuth OAuth callback - replaces Supabase auth/callback
// Handles OAuth redirect after Google sign-in via NextAuth

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const next = searchParams.get('next') ?? '/dashboard';

    // NextAuth handles the OAuth exchange automatically.
    // This route just redirects to the intended destination.
    // The actual session is managed by NextAuth's /api/auth/* routes.
    return NextResponse.redirect(`${origin}${next}`);
}
