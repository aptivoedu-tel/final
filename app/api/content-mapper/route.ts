import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import UniversityContentAccess from '@/lib/mongodb/models/UniversityContentAccess';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { university_id, institution_id, rows } = await req.json();

        if (!university_id) {
            return NextResponse.json({ error: 'university_id is required' }, { status: 400 });
        }

        await connectToDatabase();

        // 1. Delete existing mappings for this specific scope
        const deleteFilter: any = { university_id: parseInt(university_id) };
        if (institution_id === null || institution_id === undefined || institution_id === 'null') {
            deleteFilter.institution_id = null;
        } else {
            deleteFilter.institution_id = parseInt(institution_id);
        }
        await UniversityContentAccess.deleteMany(deleteFilter);

        // 2. Insert new rows
        if (rows && rows.length > 0) {
            const lastMapping = await UniversityContentAccess.findOne().sort({ id: -1 });
            let nextId = (lastMapping?.id || 0) + 1;

            const rowsToInsert = rows.map((row: any) => {
                const diffs = row.difficulty_level
                    ? (row.difficulty_level === 'all' ? ['easy', 'medium', 'hard'] : row.difficulty_level.split(','))
                    : (row.allowed_difficulties || ['easy', 'medium', 'hard']);

                return {
                    ...row,
                    id: nextId++,
                    university_id: parseInt(university_id),
                    institution_id: institution_id === null || institution_id === 'null' ? null : parseInt(institution_id),
                    difficulty_level: diffs.length === 3 ? 'all' : diffs.join(','),
                    allowed_difficulties: diffs
                };
            });

            await UniversityContentAccess.insertMany(rowsToInsert);
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

        if (!university_id) {
            return NextResponse.json({ error: 'university_id is required' }, { status: 400 });
        }

        await connectToDatabase();
        const filter: any = {
            university_id: parseInt(university_id),
            is_active: true
        };

        if (!institution_id || institution_id === 'null') {
            filter.institution_id = null;
        } else {
            filter.institution_id = parseInt(institution_id);
        }

        const data = await UniversityContentAccess.find(filter).lean();
        return NextResponse.json({ data });
    } catch (e: any) {
        console.error('Content mapper GET error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
