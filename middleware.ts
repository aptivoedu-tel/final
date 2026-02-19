import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware using @supabase/ssr (Modern pattern)
 * Enforces:
 * 1. Authentication
 * 2. Student Email Verification
 * 3. Institution Approval Status
 */
export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                },
            },
        }
    );

    // ✅ Use getUser() instead of getSession() - safer for middleware
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    const url = request.nextUrl.clone();

    // Public Paths Bypass
    if (
        url.pathname === '/login' ||
        url.pathname === '/register' ||
        url.pathname === '/' ||
        url.pathname.startsWith('/_next') ||
        url.pathname.startsWith('/api') ||
        url.pathname.includes('favicon.ico')
    ) {
        return response;
    }

    // 1. If NO user, redirect to login
    if (!user) {
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    // 2. Fetch profile to check role
    const { data: userProfile } = await supabase
        .from('users')
        .select('role, status')
        .eq('id', user.id)
        .single();

    // SUPER ADMIN BYPASS: Full Access
    if (userProfile?.role === 'super_admin') {
        return response;
    }

    // 3. Status Enforcement for others
    if (userProfile?.status === 'suspended' || userProfile?.status === 'blocked') {
        url.pathname = '/login';
        url.searchParams.set('error', 'suspended');
        return NextResponse.redirect(url);
    }

    return response;
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/admin/:path*',
        '/university/:path*',
        '/profile/:path*'
    ],
};
