// POST /api/auth/set-password
// Lets Google-registered users set a password via a secure token

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/mongodb/connection';
import User from '@/lib/mongodb/models/User';

export async function POST(req: NextRequest) {
    try {
        const { token, password } = await req.json();

        if (!token || !password) {
            return NextResponse.json({ error: 'Token and password are required.' }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
        }

        await connectToDatabase();

        const user = await User.findOne({
            set_password_token: token,
            set_password_token_expiry: { $gt: new Date() },
        });

        if (!user) {
            return NextResponse.json({ error: 'Invalid or expired link. Please request a new one.' }, { status: 400 });
        }

        user.password = await bcrypt.hash(password, 12);
        user.set_password_token = undefined;
        user.set_password_token_expiry = undefined;
        await user.save();

        return NextResponse.json({ success: true, message: 'Password set! You can now log in with email and password.' });

    } catch (error: any) {
        console.error('[SET PASSWORD] Error:', error);
        return NextResponse.json({ error: 'Failed to set password.' }, { status: 500 });
    }
}
