import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb/connection';
import ExamQuestion from '@/lib/mongodb/models/ExamQuestion';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const section_id = searchParams.get('section_id');
        const passage_id = searchParams.get('passage_id');

        if (!section_id && !passage_id) {
            return NextResponse.json({ error: 'Section ID or Passage ID required' }, { status: 400 });
        }

        const query: any = {};
        if (section_id) query.section_id = parseInt(section_id);
        if (passage_id) query.passage_id = parseInt(passage_id);

        const questions = await ExamQuestion.find(query).sort({ order_index: 1 }).lean();
        return NextResponse.json({ questions });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role === 'student') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const body = await req.json();

        // Handle bulk or single
        if (Array.isArray(body)) {
            const lastQ = await ExamQuestion.findOne({}, { id: 1 }).sort({ id: -1 });
            let nextId = (lastQ?.id || 0) + 1;

            const questions = body.map(q => {
                // Strip incoming ID to prevent collisions
                const { id: dummyId, ...rest } = q;
                return {
                    ...rest,
                    id: nextId++,
                    created_at: new Date()
                };
            });

            await ExamQuestion.insertMany(questions);
            return NextResponse.json({ success: true, count: questions.length });
        }

        const lastQ = await ExamQuestion.findOne({}, { id: 1 }).sort({ id: -1 });
        const nextId = (lastQ?.id || 0) + 1;

        // Strip incoming ID to prevent collisions
        const { id: dummyId, ...rest } = body;

        const question = await ExamQuestion.create({
            id: nextId,
            ...rest,
            created_at: new Date()
        });

        return NextResponse.json({ success: true, question });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role === 'student') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const body = await req.json();
        const { id, ...updates } = body;

        const question = await ExamQuestion.findOneAndUpdate({ id: parseInt(id) }, { $set: updates }, { new: true }).lean();
        return NextResponse.json({ success: true, question });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role === 'student') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        await ExamQuestion.deleteOne({ id: parseInt(id!) });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
