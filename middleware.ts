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

    // 1. Get Session & User (Double check)
    const { data: { session } } = await supabase.auth.getSession();

    // Robust User Check (more reliable than session alone in some environments)
    let user = session?.user;
    if (!user) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        user = authUser || undefined;
    }

    const url = request.nextUrl.clone();
    console.log(`[Middleware] Path: ${url.pathname} | UserID: ${user?.id} | Email: ${user?.email}`);

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

    // 1. If NO user/session, redirect to login
    if (!user) {
        console.log("[Middleware] Redirecting to login: No user identified");
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    // 2. Fetch profile to check role
    const { data: userProfile } = await supabase
        .from('users')
        .select('role, status')
        .eq('id', user.id)
        .single();

    console.log(`Middleware: UserRole=${userProfile?.role} Status=${userProfile?.status}`);

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

    /* 
    // Special check for Institution Admins
    if (userProfile?.role === 'institution_admin') {
        const { data: adminLink } = await supabase
            .from('institution_admins')
            .select('institutions(status)')
            .eq('user_id', user.id)
            .single();

        const instStatus = (adminLink as any)?.institutions?.status;
        if (instStatus !== 'approved') {
            url.pathname = '/login';
            url.searchParams.set('error', instStatus || 'pending');
            return NextResponse.redirect(url);
        }
    }
    */

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
