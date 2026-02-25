import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb/connection';
import { ExamAnswer } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const attemptId = searchParams.get('attempt_id');

        if (!attemptId) return NextResponse.json({ error: 'Missing attempt_id' }, { status: 400 });

        await connectToDatabase();

        const answers = await ExamAnswer.find({ attempt_id: attemptId }).lean();
        return NextResponse.json({ answers });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { attempt_id, question_id, answer } = body;

        await connectToDatabase();

        // Get last id to increment
        const last = await ExamAnswer.findOne().sort({ id: -1 });
        const nextId = (last?.id || 0) + 1;

        const updated = await ExamAnswer.findOneAndUpdate(
            { attempt_id, question_id: parseInt(question_id) },
            {
                $set: { answer },
                $setOnInsert: { id: nextId }
            },
            { upsert: true, new: true }
        );

        return NextResponse.json({ answer: updated });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
