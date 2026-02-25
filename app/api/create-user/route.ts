// MongoDB-only: Create User API
// Completely removes all Supabase dependencies

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/mongodb/connection';
import { User as MongoUser, Institution } from '@/lib/mongodb/models';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, fullName, role, institutionId, studentId } = body;

        if (!email || !password || !fullName || !role) {
            return NextResponse.json(
                { error: 'Missing required fields (email, password, fullName, role)' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        // Check for existing user
        const existing = await MongoUser.findOne({ email: email.toLowerCase() });
        if (existing) {
            return NextResponse.json({ error: 'User already exists with this email.' }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const userId = `mongo_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        const userPayload: any = {
            id: userId,
            email: email.toLowerCase(),
            password: hashedPassword,
            full_name: fullName,
            role,
            status: 'active',
            email_verified: true,
            is_solo: !institutionId,
            created_at: new Date(),
            updated_at: new Date(),
        };

        if (institutionId) userPayload.institution_id = parseInt(institutionId);
        if (studentId) userPayload.student_id_code = studentId;

        const newUser = await MongoUser.create(userPayload);

        console.log(`[CreateUser] Created user ${email} in MongoDB`);

        return NextResponse.json({
            success: true,
            user: { id: userId, email, role }
        });

    } catch (error: any) {
        console.error('[CreateUser] Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error: ' + error.message },
            { status: 500 }
        );
    }
}
