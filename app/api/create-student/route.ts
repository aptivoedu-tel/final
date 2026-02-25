// MongoDB-only: Create Student API
// Completely removes all Supabase dependencies

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/mongodb/connection';
import { User as MongoUser, Institution } from '@/lib/mongodb/models';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { studentId, name, password, institutionId } = body;

        if (!studentId || !name || !password || !institutionId) {
            return NextResponse.json(
                { error: 'Missing required fields (studentId, name, password, institutionId)' },
                { status: 400 }
            );
        }

        const numericInstId = Number(institutionId);
        if (!numericInstId || isNaN(numericInstId)) {
            return NextResponse.json(
                { error: `Invalid Institution ID: ${institutionId}` },
                { status: 400 }
            );
        }

        await connectToDatabase();

        // Fetch institution domain from MongoDB
        const institution = await Institution.findOne({ id: numericInstId });

        if (!institution) {
            return NextResponse.json(
                { error: `Institution with ID ${numericInstId} not found.` },
                { status: 404 }
            );
        }

        if (!institution.domain) {
            return NextResponse.json(
                { error: `Institution "${institution.name}" has no domain assigned. Please assign one in the Institutions manager.` },
                { status: 400 }
            );
        }

        const email = `${studentId}@${institution.domain.toLowerCase()}`;

        // Check if user already exists
        const existing = await MongoUser.findOne({ email });
        if (existing) {
            return NextResponse.json({ error: 'A student with this ID already exists.' }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const userId = `mongo_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        await MongoUser.create({
            id: userId,
            email,
            password: hashedPassword,
            full_name: name,
            role: 'student',
            status: 'active',
            email_verified: true,
            is_solo: false,
            institution_id: numericInstId,
            student_id_code: studentId,
            created_at: new Date(),
            updated_at: new Date(),
        });

        console.log(`[CreateStudent] Created student ${email} in MongoDB`);

        return NextResponse.json({
            success: true,
            user: { id: userId, email, studentId }
        });

    } catch (error: any) {
        console.error('[CreateStudent] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
