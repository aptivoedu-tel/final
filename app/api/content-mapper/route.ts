import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Use service role to bypass RLS for admin operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const { university_id, institution_id, rows } = await req.json();
        console.log(`[API POST] university_id: ${university_id}, institution_id: ${institution_id}, rows_count: ${rows?.length || 0}`);

        if (!university_id) {
            return NextResponse.json({ error: 'university_id is required' }, { status: 400 });
        }

        // 1. Delete existing mappings for this specific scope
        let deleteQuery = supabaseAdmin
            .from('university_content_access')
            .delete()
            .eq('university_id', university_id);

        if (institution_id === null || institution_id === undefined) {
            deleteQuery = deleteQuery.is('institution_id', null);
        } else {
            deleteQuery = deleteQuery.eq('institution_id', institution_id);
        }

        const { error: deleteError } = await deleteQuery;
        if (deleteError) {
            console.error('Delete error:', deleteError);
            return NextResponse.json({ error: `Delete failed: ${deleteError.message}` }, { status: 500 });
        }

        // 2. Insert new rows (only if there are any)
        if (rows && rows.length > 0) {
            // Ensure each row has both difficulty_level and allowed_difficulties
            const rowsToInsert = rows.map((row: any) => {
                const diffs = row.difficulty_level
                    ? (row.difficulty_level === 'all' ? ['easy', 'medium', 'hard'] : row.difficulty_level.split(','))
                    : (row.allowed_difficulties || ['easy', 'medium', 'hard']);

                return {
                    ...row,
                    difficulty_level: diffs.length === 3 ? 'all' : diffs.join(','),
                    allowed_difficulties: diffs
                };
            });

            const { error: insertError } = await supabaseAdmin
                .from('university_content_access')
                .insert(rowsToInsert);

            if (insertError) {
                console.error('Insert error:', insertError);
                return NextResponse.json({ error: `Insert failed: ${insertError.message}` }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true, count: rows?.length || 0 });
    } catch (e: any) {
        console.error('Content mapper API error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const university_id = searchParams.get('university_id');
        const institution_id = searchParams.get('institution_id');
        console.log(`[API GET] university_id: ${university_id}, institution_id: ${institution_id}`);

        if (!university_id) {
            return NextResponse.json({ error: 'university_id is required' }, { status: 400 });
        }

        let query = supabaseAdmin
            .from('university_content_access')
            .select('subject_id, topic_id, subtopic_id, session_limit, difficulty_level')
            .eq('university_id', parseInt(university_id))
            .eq('is_active', true);

        if (!institution_id || institution_id === 'null') {
            query = query.is('institution_id', null);
        } else {
            query = query.eq('institution_id', parseInt(institution_id));
        }

        const { data, error } = await query;

        if (error) {
            console.error('Fetch error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data: data || [] });
    } catch (e: any) {
        console.error('Content mapper GET error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
