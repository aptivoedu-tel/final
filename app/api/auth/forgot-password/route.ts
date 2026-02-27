// POST /api/auth/forgot-password
// Sends a password reset email with a secure time-limited token

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectToDatabase from '@/lib/mongodb/connection';
import User from '@/lib/mongodb/models/User';
import { sendEmail } from '@/lib/mail';
import { passwordResetEmailTemplate } from '@/lib/emailTemplates';

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
        }

        await connectToDatabase();
        const user = await User.findOne({ email: email.toLowerCase().trim() });

        // Always return success to prevent email enumeration attacks
        if (!user) {
            return NextResponse.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 min

        user.reset_token = resetToken;
        user.reset_token_expiry = resetExpiry;
        await user.save();

        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

        await sendEmail({
            to: email,
            subject: 'Reset Your APTIVO Password',
            html: passwordResetEmailTemplate(user.full_name, resetLink),
        });

        return NextResponse.json({ success: true, message: 'Password reset link sent to your email.' });

    } catch (error: any) {
        console.error('[FORGOT PASSWORD] Error:', error);
        return NextResponse.json({ error: 'Failed to send reset email.' }, { status: 500 });
    }
}
