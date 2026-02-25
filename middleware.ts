// MongoDB-only Middleware — removes ALL Supabase dependencies
import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_PATHS = [
    '/login',
    '/register',
    '/',
    '/set-password',
];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public paths, Next.js internals, API routes, and static files
    if (
        PUBLIC_PATHS.some(p => pathname === p) ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.includes('favicon.ico') ||
        pathname.startsWith('/login_illustration') ||
        pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2|ttf)$/)
    ) {
        return NextResponse.next();
    }

    // Verify JWT token via NextAuth
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    // Role-based path protection
    const role = token.role as string | undefined;

    // Protect admin routes — only super_admin and institution_admin can access
    if (pathname.startsWith('/admin') && role !== 'super_admin' && role !== 'institution_admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Protect institution-admin routes
    if (pathname.startsWith('/institution-admin') && role !== 'institution_admin' && role !== 'super_admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/admin/:path*',
        '/university/:path*',
        '/profile/:path*',
        '/institution-admin/:path*',
        '/analytics/:path*',
        '/practice/:path*',
        '/progress/:path*',
        '/set-password',
    ],
};
