import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb/connection';
import { PracticeSession, LearningStreak } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('student_id');
        if (!studentId) return NextResponse.json({ error: 'Missing student_id' }, { status: 400 });

        await connectToDatabase();

        const sessions = await PracticeSession.find({
            student_id: studentId,
            is_completed: true
        }).lean();

        const totalSessions = sessions.length;
        const totalSeconds = sessions.reduce((sum, s) => sum + (s.time_spent_seconds || 0), 0);
        const totalHours = Math.round(totalSeconds / 3600);

        const completedWithScore = sessions.filter(s => s.score_percentage != null);
        const avgScore = completedWithScore.length > 0
            ? Math.round(completedWithScore.reduce((sum, s) => sum + (s.score_percentage || 0), 0) / completedWithScore.length)
            : 0;

        const streakData = await LearningStreak.find({ student_id: studentId })
            .sort({ streak_date: -1 })
            .limit(30)
            .lean();

        const calculateStreak = (data: any[]) => {
            if (!data || data.length === 0) return 0;
            let streak = 0;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            for (let i = 0; i < data.length; i++) {
                const streakDate = new Date(data[i].streak_date);
                streakDate.setHours(0, 0, 0, 0);
                const expectedDate = new Date(today);
                expectedDate.setDate(expectedDate.getDate() - i);
                if (streakDate.getTime() === expectedDate.getTime()) streak++;
                else break;
            }
            return streak;
        };

        const currentStreak = calculateStreak(streakData);

        return NextResponse.json({
            stats: {
                totalSessions,
                totalHours,
                averageScore: avgScore,
                currentStreak
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
