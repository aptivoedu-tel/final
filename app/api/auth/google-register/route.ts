// POST /api/auth/google-register
// Creates a new account for a user who wants to register via Google.
// Called from the register page BEFORE redirecting to Google OAuth.
// This stores their intent so the signIn callback can look it up.

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectToDatabase from '@/lib/mongodb/connection';
import User from '@/lib/mongodb/models/User';
import { sendEmail } from '@/lib/mail';
import { setPasswordEmailTemplate } from '@/lib/emailTemplates';

export async function POST(req: NextRequest) {
    try {
        const { email, name, googleId, avatarUrl } = await req.json();

        if (!email || !name) {
            return NextResponse.json({ error: 'Email and name are required.' }, { status: 400 });
        }

        await connectToDatabase();

        // Check if user already exists
        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
            // Already registered — just return success so they can log in
            return NextResponse.json({
                success: true,
                already_exists: true,
                message: 'Account already exists. You can log in with Google.',
            });
        }

        // Create user from Google profile
        const newUser = await User.create({
            id: `google_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            email: email.toLowerCase().trim(),
            full_name: name,
            role: 'student',
            status: 'active',
            email_verified: true,
            is_solo: true,
            provider: 'google',
            avatar_url: avatarUrl || null,
        });

        // Send optional set-password email
        try {
            const token = crypto.randomBytes(32).toString('hex');
            newUser.set_password_token = token;
            newUser.set_password_token_expiry = new Date(Date.now() + 30 * 60 * 1000);
            await newUser.save();

            const baseUrl = process.env.NEXTAUTH_URL || 'https://aptivoedu.vercel.app';
            await sendEmail({
                to: email,
                subject: 'Welcome to APTIVO – Set Your Password',
                html: setPasswordEmailTemplate(name, `${baseUrl}/set-password?token=${token}`),
            });
        } catch (emailErr) {
            console.error('[GOOGLE-REGISTER] Set-password email failed:', emailErr);
        }

        return NextResponse.json({
            success: true,
            message: 'Account created! You can now log in with Google.',
        }, { status: 201 });

    } catch (error: any) {
        console.error('[GOOGLE-REGISTER] Error:', error);
        return NextResponse.json({ error: error.message || 'Registration failed.' }, { status: 500 });
    }
}
