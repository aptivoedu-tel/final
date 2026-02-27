// POST /api/auth/reset-password
// Resets the user's password using a valid token

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/mongodb/connection';
import User from '@/lib/mongodb/models/User';

export async function POST(req: NextRequest) {
    try {
        const { token, password } = await req.json();

        if (!token || !password) {
            return NextResponse.json({ error: 'Token and new password are required.' }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
        }

        await connectToDatabase();

        const user = await User.findOne({
            reset_token: token,
            reset_token_expiry: { $gt: new Date() },
        });

        if (!user) {
            return NextResponse.json({ error: 'Invalid or expired reset link.' }, { status: 400 });
        }

        user.password = await bcrypt.hash(password, 12);
        user.reset_token = undefined;
        user.reset_token_expiry = undefined;
        await user.save();

        return NextResponse.json({ success: true, message: 'Password reset successfully! You can now log in.' });

    } catch (error: any) {
        console.error('[RESET PASSWORD] Error:', error);
        return NextResponse.json({ error: 'Password reset failed.' }, { status: 500 });
    }
}
