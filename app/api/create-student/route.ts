import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Admin Client
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
    : null;

export async function POST(request: Request) {
    if (!supabaseAdmin) {
        return NextResponse.json(
            { error: 'Server Configuration Error: SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' },
            { status: 500 }
        );
    }

    try {
        const body = await request.json();
        const { studentId, name, password, institutionId } = body;

        if (!studentId || !name || !password || !institutionId) {
            return NextResponse.json(
                { error: 'Missing required fields (studentId, name, password, institutionId)' },
                { status: 400 }
            );
        }

        // 1. Synthesize Email (Supabase requires email)
        // We use a pattern: ID@institutionID.aptivo.local to avoid collisions across institutions?
        // Or stick to ID@aptivo-student.local if IDs are globally unique?
        // Let's use ID + Institution ID to be safe against duplicate Roll Numbers across schools
        // e.g. 101@99.aptivo-student.local
        const email = `${studentId}.${institutionId}@aptivo-student.local`.toLowerCase();

        // 2. Create User in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true, // Auto confirm
            user_metadata: {
                full_name: name,
                student_id_code: studentId,
                role: 'student',
                institution_id: institutionId
            }
        });

        if (authError) {
            console.error('Auth Create Error:', authError);
            return NextResponse.json(
                { error: authError.message },
                { status: 400 }
            );
        }

        const userId = authData.user.id;

        // 3. Upsert into public.users table (Ensures record exists even if trigger failed)
        const { error: dbError } = await supabaseAdmin
            .from('users')
            .upsert({
                id: userId,
                email: email,
                student_id_code: studentId,
                full_name: name,
                role: 'student',
                institution_id: institutionId,
                initial_password: password,
                status: 'active',
                created_at: new Date().toISOString()
            });

        if (dbError) {
            console.error('DB Upsert Error:', dbError);
            return NextResponse.json(
                { error: 'Failed to save user profile: ' + dbError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            user: { id: userId, email, studentId }
        });

    } catch (error: any) {
        console.error('Create Student API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
