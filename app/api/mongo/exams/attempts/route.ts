import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb/connection';
import { ExamAttempt, ExamAnswer } from '@/lib/mongodb/models';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('student_id');
        const examId = searchParams.get('exam_id');

        if (!examId) return NextResponse.json({ error: 'Exam ID required' }, { status: 400 });

        await connectToDatabase();

        const query: any = { exam_id: parseInt(examId) };
        if (studentId) query.student_id = studentId;

        const attempts = await ExamAttempt.find(query).sort({ created_at: -1 }).lean();

        return NextResponse.json({ attempts });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { student_id, exam_id } = body;

        await connectToDatabase();

        const newAttempt = await ExamAttempt.create({
            id: uuidv4(),
            student_id,
            exam_id: parseInt(exam_id),
            status: 'in_progress',
            start_time: new Date(),
            score: 0,
            total_marks: 0
        });

        return NextResponse.json({ attempt: newAttempt });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { attempt_id, score, total_marks, status, time_spent_seconds } = body;

        await connectToDatabase();

        const updated = await ExamAttempt.findOneAndUpdate(
            { id: attempt_id },
            {
                $set: {
                    score,
                    total_marks,
                    status: status || 'completed',
                    time_spent_seconds,
                    end_time: new Date()
                }
            },
            { new: true }
        );

        return NextResponse.json({ attempt: updated });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
