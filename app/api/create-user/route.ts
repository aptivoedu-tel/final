import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Admin Client
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
        const { email, password, fullName, role, institutionId, studentId } = body;

        if (!email || !password || !fullName || !role) {
            return NextResponse.json(
                { error: 'Missing required fields (email, password, fullName, role)' },
                { status: 400 }
            );
        }

        console.log(`Creating user: ${email} with role: ${role}`);

        // 1. Create User in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true, // Auto confirm
            user_metadata: {
                full_name: fullName,
                role: role,
                institution_id: institutionId ? parseInt(institutionId) : null,
                student_id: studentId || null
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

        // 2. Upsert into public.users table (Ensures record exists even if trigger failed)
        const userPayload: any = {
            id: userId,
            email: email,
            full_name: fullName,
            role: role,
            status: 'active',
            initial_password: password, // Store for easy distribution if needed
            created_at: new Date().toISOString()
        };

        if (institutionId) {
            userPayload.institution_id = parseInt(institutionId);
        }
        if (studentId) {
            userPayload.student_id_code = studentId;
        }

        const { error: dbError } = await supabaseAdmin
            .from('users')
            .upsert(userPayload);

        if (dbError) {
            console.error('DB Upsert Error:', dbError);
            // Optionally rollback auth user? simpler to just return error
            return NextResponse.json(
                { error: 'Failed to save user profile: ' + dbError.message },
                { status: 500 }
            );
        }

        // 3. Handle specific role tables
        if (role === 'institution_admin' && institutionId) {
            const { error: adminError } = await supabaseAdmin
                .from('institution_admins')
                .upsert({
                    user_id: userId,
                    institution_id: parseInt(institutionId)
                });

            if (adminError) {
                console.error('Institution Admin Upsert Error:', adminError);
            }
        }

        return NextResponse.json({
            success: true,
            user: { id: userId, email, role }
        });

    } catch (error: any) {
        console.error('Create User API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error: ' + error.message },
            { status: 500 }
        );
    }
}
