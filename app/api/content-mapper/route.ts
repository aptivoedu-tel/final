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
            console.log(`[API/ContentMapper] Inserting ${rows.length} new mappings for University ${university_id}...`);
            const lastMapping = await UniversityContentAccess.findOne({}, { id: 1 }).sort({ id: -1 });
            let nextId = (lastMapping?.id || 0) + 1;

            const rowsToInsert = rows.map((row: any) => {
                const diffs = row.difficulty_level
                    ? (row.difficulty_level === 'all' ? ['easy', 'medium', 'hard'] : row.difficulty_level.split(','))
                    : (row.allowed_difficulties || ['easy', 'medium', 'hard']);

                // Ensure we don't accidentally carry over a wrong ID from frontend
                const { id: dummyId, ...restOfRow } = row;

                return {
                    ...restOfRow,
                    id: nextId++,
                    university_id: parseInt(university_id),
                    institution_id: (institution_id === null || institution_id === 'null' || institution_id === undefined) ? null : parseInt(institution_id),
                    difficulty_level: diffs.length === 3 ? 'all' : diffs.join(','),
                    allowed_difficulties: diffs,
                    is_active: true
                };
            });

            await UniversityContentAccess.insertMany(rowsToInsert);
            console.log(`[API/ContentMapper] Bulk insertion complete.`);
        }

        return NextResponse.json({ success: true, count: rows?.length || 0 });
    } catch (error: any) {
        console.error('[API/ContentMapper] POST Internal Error:', error);
        return NextResponse.json({
            error: error.message || 'Mapping persistence failure',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
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

        if (institution_id === null || institution_id === 'null' || !institution_id || institution_id === 'undefined') {
            filter.institution_id = null;
        } else {
            filter.institution_id = parseInt(institution_id);
        }

        const data = await UniversityContentAccess.find(filter).lean();
        return NextResponse.json({ data });
    } catch (error: any) {
        console.error('[API/ContentMapper] GET Internal Error:', error);
        return NextResponse.json({
            error: error.message || 'Mapping retrieval failure',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
