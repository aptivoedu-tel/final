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
            { error: 'Server Configuration Error: SUPABASE_SERVICE_ROLE_KEY is missing' },
            { status: 500 }
        );
    }

    try {
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json(
                { error: 'Missing userId' },
                { status: 400 }
            );
        }

        // 1. Delete from Auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (authError) {
            console.error('Auth Delete Error:', authError);
            // If user doesn't exist in Auth, we might still want to try deleting from DB
            // but usually they are synced. 
            // If they are only in DB, we'll continue.
        }

        // 2. Delete from public.users (though ON DELETE CASCADE from Auth should handle it if synced correctly)
        // But in this schema, users table uses uuid_generate_v4() and might not be linked to Auth.uid() via FK in some cases?
        // Wait, schema.sql says users table has id UUID PRIMARY KEY.
        // AuthService syncs them using the same ID.

        const { error: dbError } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', userId);

        if (dbError) {
            console.error('DB Delete Error:', dbError);
            return NextResponse.json(
                { error: 'Failed to delete user profile: ' + dbError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'User deleted successfully from both Auth and Database'
        });

    } catch (error: any) {
        console.error('Delete User API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
