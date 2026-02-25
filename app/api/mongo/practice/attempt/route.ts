// MongoDB API - Single MCQ Attempt
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import { MCQ, MCQAttempt } from '@/lib/mongodb/models';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const body = await req.json();
        const { practice_session_id, mcq_id, student_id, selected_option, time_spent_seconds } = body;

        if (!mcq_id || !student_id) {
            return NextResponse.json({ error: 'mcq_id and student_id are required' }, { status: 400 });
        }

        // Check if correct
        const mcq = await MCQ.findOne({ id: mcq_id });
        if (!mcq) return NextResponse.json({ error: 'MCQ not found' }, { status: 404 });

        const isCorrect = selected_option !== 'SKIPPED' && selected_option === mcq.correct_option;

        // Save attempt
        const count = await MCQAttempt.countDocuments({});
        const attempt = await MCQAttempt.create({
            id: count + Date.now(),
            practice_session_id,
            mcq_id,
            student_id,
            selected_option,
            is_correct: isCorrect,
            time_spent_seconds: time_spent_seconds || 0,
            created_at: new Date()
        });

        // Update MCQ stats
        await MCQ.findOneAndUpdate(
            { id: mcq_id },
            {
                $inc: {
                    times_attempted: 1,
                    times_correct: isCorrect ? 1 : 0
                }
            }
        );

        return NextResponse.json({
            isCorrect,
            correctOption: mcq.correct_option,
            attempt
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
