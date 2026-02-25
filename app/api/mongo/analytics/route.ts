// MongoDB API - Analytics
// GET: Get student analytics summary

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import { PracticeSession, MCQAttempt, LearningStreak, Subject, Topic } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('student_id');
        const type = searchParams.get('type');

        if (!studentId) {
            return NextResponse.json({ error: 'student_id is required' }, { status: 400 });
        }

        if (type === 'subject_performance') {
            const sessions = await PracticeSession.find({ student_id: studentId, is_completed: true }).lean();
            const subjectScores: Record<number, number[]> = {};

            // We need names too
            const subjects = await Subject.find({ is_active: true }).lean();

            for (const session of sessions) {
                if (session.score_percentage !== null) {
                    const subjId = session.subject_id;
                    if (subjId) {
                        if (!subjectScores[subjId]) subjectScores[subjId] = [];
                        subjectScores[subjId].push(session.score_percentage);
                    }
                }
            }

            const performance: any[] = subjects.map((s: any) => {
                const scores = subjectScores[s.id] || [];
                return {
                    subject: s.name,
                    score: scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0,
                    fullMark: 100
                };
            }).filter((p: any) => p.score > 0 || subjects.length < 5); // Keep at least some or those with scores

            return NextResponse.json({ performance });
        }

        if (type === 'study_activity') {
            const days = parseInt(searchParams.get('days') || '7');
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - (days - 1));
            startDate.setHours(0, 0, 0, 0);

            const sessions = await PracticeSession.find({
                student_id: studentId,
                started_at: { $gte: startDate }
            }).lean();

            const activityMap: Record<string, number> = {};
            const labels: string[] = [];

            for (let i = 0; i < days; i++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + i);
                const dateStr = timeframeLabel(date, days <= 7 ? 'week' : 'month');
                activityMap[dateStr] = 0;
                labels.push(dateStr);
            }

            sessions.forEach((s: any) => {
                const dateStr = timeframeLabel(new Date(s.started_at), days <= 7 ? 'week' : 'month');
                if (activityMap[dateStr] !== undefined) {
                    activityMap[dateStr] += (s.time_spent_seconds || 0) / 3600;
                }
            });

            const activity = labels.map((label: string) => ({
                name: label,
                hours: parseFloat(activityMap[label].toFixed(2))
            }));

            return NextResponse.json({ activity });
        }

        // Default: Full Analytics Summary
        const [sessions, streaks, attempts] = await Promise.all([
            PracticeSession.find({ student_id: studentId, is_completed: true }).sort({ started_at: -1 }),
            LearningStreak.find({ student_id: studentId }).sort({ streak_date: -1 }),
            MCQAttempt.find({ student_id: studentId }),
        ]);

        const totalSessions = sessions.length;
        const totalAttempts = attempts.length;
        const totalCorrect = attempts.filter((a: any) => a.is_correct).length;
        const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

        let currentStreak = 0;
        const streakDates = streaks.map((s: any) => s.streak_date).sort().reverse();
        const today = new Date().toISOString().split('T')[0];

        for (let i = 0; i < streakDates.length; i++) {
            const expected = new Date();
            expected.setDate(expected.getDate() - i);
            const expectedStr = expected.toISOString().split('T')[0];
            if (streakDates.includes(expectedStr)) {
                currentStreak++;
            } else if (i === 0) {
                // Streak might be from yesterday
                continue;
            } else {
                break;
            }
        }

        const recentSessions = sessions.slice(0, 10);
        const avgScore = recentSessions.length > 0
            ? Math.round(recentSessions.reduce((sum: number, s: any) => sum + (s.score_percentage || 0), 0) / recentSessions.length)
            : 0;

        const totalTimeMinutes = Math.round(
            sessions.reduce((sum: number, s: any) => sum + (s.time_spent_seconds || 0), 0) / 60
        );

        return NextResponse.json({
            analytics: {
                total_sessions: totalSessions,
                total_attempts: totalAttempts,
                overall_accuracy: overallAccuracy,
                current_streak: currentStreak,
                avg_score: avgScore,
                total_study_minutes: totalTimeMinutes,
                recent_sessions: recentSessions.slice(0, 5),
                totalStudyTime: sessions.reduce((sum: number, s: any) => sum + (s.time_spent_seconds || 0), 0),
                questionsSolved: totalAttempts
            }
        });
    } catch (error: any) {
        console.error('Analytics Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function timeframeLabel(date: Date, timeframe: 'week' | 'month') {
    if (timeframe === 'week') {
        return date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    }
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
}
