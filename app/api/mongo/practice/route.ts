// MongoDB API - Practice Sessions
// POST: Start a new practice session
// GET: Get user practice history

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectToDatabase from '@/lib/mongodb/connection';
import PracticeSession from '@/lib/mongodb/models/PracticeSession';
import MCQAttempt from '@/lib/mongodb/models/MCQAttempt';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('student_id');
        const limit = parseInt(searchParams.get('limit') || '20');

        if (!studentId) {
            return NextResponse.json({ error: 'student_id is required' }, { status: 400 });
        }

        const sessions = await PracticeSession.find({ student_id: studentId })
            .sort({ started_at: -1 })
            .limit(limit);

        return NextResponse.json({ sessions, count: sessions.length });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const body = await req.json();
        const { student_id, subtopic_id, topic_id, university_id, session_type = 'practice', mcq_ids = [] } = body;

        if (!student_id) {
            return NextResponse.json({ error: 'student_id is required' }, { status: 400 });
        }

        const count = await PracticeSession.countDocuments({});
        const session = await PracticeSession.create({
            id: count + Date.now(),
            student_id,
            subtopic_id,
            topic_id,
            university_id,
            session_type,
            started_at: new Date(),
            is_completed: false,
            total_questions: 0,
            correct_answers: 0,
            wrong_answers: 0,
            skipped_questions: 0,
            time_spent_seconds: 0,
            mcq_ids: mcq_ids,
        });

        return NextResponse.json({ session }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH: Complete a session and save attempts
export async function PATCH(req: NextRequest) {
    try {
        await connectToDatabase();
        const body = await req.json();
        const {
            session_id,
            attempts = [],
            time_spent_seconds,
            total_questions,
            correct_answers,
            wrong_answers,
            skipped_questions
        } = body;

        if (!session_id) {
            return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
        }

        let finalTotal = total_questions;
        let finalCorrect = correct_answers;
        let finalWrong = wrong_answers;
        let finalSkipped = skipped_questions;

        // If counts not provided, calculate from attempts array
        if (finalTotal === undefined && attempts.length > 0) {
            finalCorrect = attempts.filter((a: any) => a.is_correct).length;
            finalWrong = attempts.filter((a: any) => !a.is_correct && a.selected_option && a.selected_option !== 'SKIPPED').length;
            finalSkipped = attempts.filter((a: any) => !a.selected_option || a.selected_option === 'SKIPPED').length;
            finalTotal = attempts.length;
        }

        const score = finalTotal > 0 ? Math.round(((finalCorrect || 0) / finalTotal) * 100) : 0;

        // Update session
        const session = await PracticeSession.findOneAndUpdate(
            { id: session_id },
            {
                completed_at: new Date(),
                is_completed: true,
                total_questions: finalTotal || 0,
                correct_answers: finalCorrect || 0,
                wrong_answers: finalWrong || 0,
                skipped_questions: finalSkipped || 0,
                score_percentage: score,
                time_spent_seconds: time_spent_seconds || 0,
            },
            { new: true }
        );

        // Save attempts if provided
        let attemptsSaved = 0;
        if (attempts && attempts.length > 0) {
            const attemptCount = await MCQAttempt.countDocuments({});
            const attemptDocs = attempts.map((a: any, i: number) => ({
                id: attemptCount + i + Date.now(),
                practice_session_id: session_id,
                mcq_id: a.mcq_id,
                student_id: a.student_id,
                selected_option: a.selected_option,
                is_correct: a.is_correct,
                time_spent_seconds: a.time_spent_seconds || 0,
                created_at: new Date(),
            }));
            await MCQAttempt.insertMany(attemptDocs);
            attemptsSaved = attemptDocs.length;
        }

        return NextResponse.json({ session, attempts_saved: attemptsSaved });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
