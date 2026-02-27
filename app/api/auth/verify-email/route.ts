// GET /api/auth/verify-email?token=xxx
// Verifies the user's email token and activates their account

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import User from '@/lib/mongodb/models/User';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.redirect(new URL('/login?error=invalid_token', req.url));
        }

        await connectToDatabase();

        const user = await User.findOne({
            verification_token: token,
            verification_token_expiry: { $gt: new Date() },
        });

        if (!user) {
            return NextResponse.redirect(new URL('/login?error=expired_token', req.url));
        }

        // Mark as verified
        user.email_verified = true;
        user.status = 'active';
        user.verification_token = undefined;
        user.verification_token_expiry = undefined;
        await user.save();

        return NextResponse.redirect(new URL('/login?verified=true', req.url));

    } catch (error: any) {
        console.error('[VERIFY EMAIL] Error:', error);
        return NextResponse.redirect(new URL('/login?error=server_error', req.url));
    }
}
