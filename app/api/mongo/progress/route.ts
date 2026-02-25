import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import { SubtopicProgress, TopicProgress, LearningStreak } from '@/lib/mongodb/models';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const body = await req.json();
        const { student_id, subtopic_id, topic_id, is_completed = true } = body;

        if (!student_id) {
            return NextResponse.json({ error: 'student_id is required' }, { status: 400 });
        }

        if (subtopic_id) {
            await SubtopicProgress.findOneAndUpdate(
                { student_id, subtopic_id },
                {
                    is_completed,
                    reading_percentage: is_completed ? 100 : 0,
                    last_accessed_at: new Date(),
                    completed_at: is_completed ? new Date() : undefined
                },
                { upsert: true, new: true }
            );
        } else if (topic_id) {
            await TopicProgress.findOneAndUpdate(
                { student_id, topic_id },
                {
                    is_completed,
                    reading_percentage: is_completed ? 100 : 0,
                    last_accessed_at: new Date(),
                    completed_at: is_completed ? new Date() : undefined
                },
                { upsert: true, new: true }
            );
        } else {
            return NextResponse.json({ error: 'subtopic_id or topic_id is required' }, { status: 400 });
        }

        // Update streak
        const today = new Date().toISOString().split('T')[0];
        await LearningStreak.findOneAndUpdate(
            { student_id, streak_date: today },
            { student_id, streak_date: today },
            { upsert: true }
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('student_id');

        if (!studentId) {
            return NextResponse.json({ error: 'student_id is required' }, { status: 400 });
        }

        const [subtopicProgress, topicProgress] = await Promise.all([
            SubtopicProgress.find({ student_id: studentId }),
            TopicProgress.find({ student_id: studentId })
        ]);

        return NextResponse.json({
            subtopic_progress: subtopicProgress,
            topic_progress: topicProgress
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
