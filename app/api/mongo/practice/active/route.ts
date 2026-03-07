import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import PracticeSession from '@/lib/mongodb/models/PracticeSession';
import MCQAttempt from '@/lib/mongodb/models/MCQAttempt';
import { MCQ } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('student_id');
        const topicId = searchParams.get('topic_id');
        const subtopicId = searchParams.get('subtopic_id');
        const universityId = searchParams.get('university_id');

        if (!studentId) {
            return NextResponse.json({ error: 'student_id is required' }, { status: 400 });
        }

        const query: any = {
            student_id: studentId,
            is_completed: false
        };

        if (subtopicId) query.subtopic_id = Number(subtopicId);
        if (topicId) query.topic_id = Number(topicId);
        if (universityId) query.university_id = Number(universityId);

        // Find the most recent incomplete session
        const session = await PracticeSession.findOne(query).sort({ started_at: -1 });

        if (!session) {
            return NextResponse.json({ session: null }, { status: 404 });
        }

        // Fetch corresponding MCQ Attempts
        const attempts = await MCQAttempt.find({ practice_session_id: session.id }).sort({ created_at: 1 });

        // Fetch the loaded MCQs
        let mcqs = [];
        if (session.mcq_ids && session.mcq_ids.length > 0) {
            mcqs = await MCQ.find({ id: { $in: session.mcq_ids } });
            // Keep original order
            const mcqMap = new Map();
            mcqs.forEach(m => mcqMap.set(m.id, m));
            mcqs = session.mcq_ids.map((id: number) => mcqMap.get(id)).filter(Boolean);
        }

        return NextResponse.json({
            session,
            attempts,
            mcqs
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
