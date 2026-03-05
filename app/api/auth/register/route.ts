// POST /api/auth/register
// Registers a new user and sends a verification email

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import connectToDatabase from '@/lib/mongodb/connection';
import User from '@/lib/mongodb/models/User';
import { sendEmail } from '@/lib/mail';
import { verificationEmailTemplate } from '@/lib/emailTemplates';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, password, full_name, role = 'student', institution_id, institution_name, institution_type } = body;

        if (!email || !password || !full_name) {
            return NextResponse.json({ error: 'Email, password, and full name are required.' }, { status: 400 });
        }

        await connectToDatabase();

        // Check duplicate
        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
            return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
        }

        let finalInstitutionId = institution_id;

        // If it's an institution admin and they provided a name but no ID, create a NEW pending institution
        if (role === 'institution_admin' && !institution_id && institution_name) {
            const { Institution } = await import('@/lib/mongodb/models');
            const lastInst = await Institution.findOne().sort({ id: -1 });
            const nextId = (lastInst?.id || 0) + 1;

            const inst = await Institution.create({
                id: nextId,
                name: institution_name,
                institution_type: institution_type || 'Other',
                status: 'pending',
                admin_name: full_name,
                admin_email: email.toLowerCase().trim(),
                is_active: false
            });
            finalInstitutionId = inst.id;
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 min

        const newUser = await User.create({
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email: email.toLowerCase().trim(),
            full_name,
            role,
            status: role === 'student' ? 'active' : 'pending',
            email_verified: false,
            is_solo: !finalInstitutionId,
            institution_id: finalInstitutionId,
            password: hashedPassword,
            provider: 'credentials',
            verification_token: verificationToken,
            verification_token_expiry: verificationExpiry,
            created_at: new Date(),
        });

        // Send verification email
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const verificationLink = `${baseUrl}/api/auth/verify-email?token=${verificationToken}`;

        try {
            await sendEmail({
                to: email,
                subject: 'Verify Your Email – APTIVO',
                html: verificationEmailTemplate(full_name, verificationLink),
            });
        } catch (emailErr) {
            console.error('[REGISTER] Email send failed:', emailErr);
            // Don't fail registration if email fails — just log it
        }

        return NextResponse.json({
            success: true,
            message: 'Account created! Please check your email to verify your account.',
            user: {
                id: newUser.id,
                email: newUser.email,
                full_name: newUser.full_name,
                role: newUser.role,
            }
        }, { status: 201 });

    } catch (error: any) {
        console.error('[REGISTER] Error:', error);
        return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
    }
}
