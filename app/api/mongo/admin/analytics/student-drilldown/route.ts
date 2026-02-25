import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb/connection';
import { User, PracticeSession, Subject, Topic, University, StudentUniversityEnrollment } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('student_id');
        const startDateStr = searchParams.get('start_date');

        if (!studentId) return NextResponse.json({ error: 'student_id required' }, { status: 400 });

        await connectToDatabase();

        // 1. Get Student Data
        const student = await User.findOne({ id: studentId }).select('full_name email').lean() as any;
        if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

        // 2. Get All Relevant Content Names/Colors
        const [subjects, topics] = await Promise.all([
            Subject.find({ is_active: true }).lean() as any[],
            Topic.find({ is_active: true }).lean() as any[]
        ]);

        const subjectMap = new Map(subjects.map(s => [s.id, s]));
        const topicMap = new Map(topics.map(t => [t.id, t]));

        // 3. Get Student Sessions
        const sessionFilter: any = { student_id: studentId, is_completed: true };
        if (startDateStr) {
            sessionFilter.started_at = { $gte: new Date(startDateStr) };
        }
        const sessions = await PracticeSession.find(sessionFilter).lean() as any[];

        // 4. Calculate Stats by Subject
        const subjStatsMap: Record<number, { sum: number, count: number, name: string, color: string }> = {};
        sessions.forEach(s => {
            if (!s.subject_id) return;
            if (!subjStatsMap[s.subject_id]) {
                const subj = subjectMap.get(s.subject_id);
                subjStatsMap[s.subject_id] = { sum: 0, count: 0, name: subj?.name || 'Unknown', color: subj?.color || '#14b8a6' };
            }
            subjStatsMap[s.subject_id].sum += (s.score_percentage || 0);
            subjStatsMap[s.subject_id].count++;
        });

        const subjectStats = Object.values(subjStatsMap).map(s => ({
            name: s.name,
            average: Math.round(s.sum / s.count),
            count: s.count,
            color: s.color
        }));

        // 5. Calculate Stats by Topic
        const topStatsMap: Record<number, { sum: number, count: number, name: string, subjectName: string }> = {};
        sessions.forEach(s => {
            if (!s.topic_id) return;
            if (!topStatsMap[s.topic_id]) {
                const top = topicMap.get(s.topic_id);
                const subj = subjectMap.get(s.subject_id);
                topStatsMap[s.topic_id] = {
                    sum: 0,
                    count: 0,
                    name: top?.name || 'Unknown',
                    subjectName: subj?.name || 'Unknown'
                };
            }
            topStatsMap[s.topic_id].sum += (s.score_percentage || 0);
            topStatsMap[s.topic_id].count++;
        });

        const topicStats = Object.values(topStatsMap).map(t => ({
            name: t.name,
            average: Math.round(t.sum / t.count),
            count: t.count,
            subjectName: t.subjectName
        }));

        // 6. Calculate Stats by University (if multiple enrollments exist)
        const enrollments = await StudentUniversityEnrollment.find({ student_id: studentId }).lean() as any[];
        const universityIds = enrollments.map(e => e.university_id);
        const universities = await University.find({ id: { $in: universityIds } }).lean() as any[];

        const uniStats = universities.map(uni => {
            const uniSessions = sessions.filter(s => s.university_id === uni.id);
            const avg = uniSessions.length > 0
                ? Math.round(uniSessions.reduce((sum, s) => sum + (s.score_percentage || 0), 0) / uniSessions.length)
                : 0;
            return { name: uni.name, average: avg };
        });

        // 7. Overall Summary
        const overallAvg = sessions.length > 0
            ? Math.round(sessions.reduce((sum, s) => sum + (s.score_percentage || 0), 0) / sessions.length)
            : 0;

        return NextResponse.json({
            student,
            stats: {
                averageScore: overallAvg,
                totalSessions: sessions.length,
                universityStats: uniStats,
                subjectStats,
                topicStats
            }
        });

    } catch (error: any) {
        console.error('Student Drilldown Analytics Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
