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

        // 1. Fetch Institution Domain
        // Ensure institutionId is a number
        const numericInstId = Number(institutionId);

        if (!numericInstId || isNaN(numericInstId)) {
            console.error('Invalid institutionId received:', institutionId);
            return NextResponse.json(
                { error: `Invalid Institution ID provided: ${institutionId}. Please check your account settings.` },
                { status: 400 }
            );
        }

        console.log('Fetching domain for institutionId:', numericInstId);

        const { data: instData, error: instError } = await supabaseAdmin
            .from('institutions')
            .select('domain, name')
            .eq('id', numericInstId)
            .maybeSingle();

        if (instError) {
            console.error('Database Error while fetching institution:', instError);
            return NextResponse.json(
                { error: `Database error: ${instError.message}` },
                { status: 500 }
            );
        }

        if (!instData) {
            console.error('Institution NOT FOUND:', { numericInstId });
            return NextResponse.json(
                { error: `Institution with ID ${numericInstId} was not found in the database. Please contact support.` },
                { status: 404 }
            );
        }

        if (!instData.domain) {
            console.error('Institution found but DOMAIN IS MISSING:', instData);
            return NextResponse.json(
                { error: `The institution "${instData.name}" (ID ${numericInstId}) does not have a domain assigned. Please assign a domain (e.g., ha.edu) in the Institutions manager.` },
                { status: 400 }
            );
        }

        const domain = instData.domain.toLowerCase();

        // 2. Synthesize Email (Supabase requires email)
        // Format: roll_number@institution_domain
        const email = `${studentId}@${domain}`.toLowerCase();

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
