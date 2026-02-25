import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb/connection';
import { User, Institution, University, PracticeSession, StudentUniversityEnrollment, Subject } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const institutionId = searchParams.get('institution_id');
        const startDateStr = searchParams.get('start_date');

        if (!institutionId) return NextResponse.json({ error: 'institution_id required' }, { status: 400 });

        await connectToDatabase();

        const instId = parseInt(institutionId);
        const filter: any = { institution_id: instId };
        if (startDateStr) {
            filter.started_at = { $gte: new Date(startDateStr) };
        }

        // 1. Get all students for this institution
        const students = await User.find({ institution_id: instId, role: 'student' }).lean() as any[];
        const studentIds = students.map(s => s.id);

        // 2. Get enrollments to link universities
        const enrollments = await StudentUniversityEnrollment.find({ student_id: { $in: studentIds } }).lean() as any[];
        const universityIds = Array.from(new Set(enrollments.map(e => e.university_id)));
        const universities = await University.find({ id: { $in: universityIds } }).lean() as any[];

        // 3. Get all practice sessions for these students
        const sessionFilter: any = { student_id: { $in: studentIds }, is_completed: true };
        if (startDateStr) {
            sessionFilter.started_at = { $gte: new Date(startDateStr) };
        }
        const sessions = await PracticeSession.find(sessionFilter).lean() as any[];

        // 4. Calculate University Stats
        const universityStats = universities.map(uni => {
            const uniStudentIds = enrollments.filter(e => e.university_id === uni.id).map(e => e.student_id);
            const uniSessions = sessions.filter(s => uniStudentIds.includes(s.student_id));

            const totalSessions = uniSessions.length;
            const avgScore = totalSessions > 0
                ? Math.round(uniSessions.reduce((sum, s) => sum + (s.score_percentage || 0), 0) / totalSessions)
                : 0;
            const totalQuestions = uniSessions.reduce((sum, s) => sum + (s.total_questions || 0), 0);

            return {
                id: uni.id,
                name: uni.name,
                logo_url: uni.logo_url,
                studentCount: uniStudentIds.length,
                averageScore: avgScore,
                totalSessions,
                totalQuestions
            };
        });

        // 5. Calculate Student Stats
        const studentStats = students.map(s => {
            const studentSessions = sessions.filter(sess => sess.student_id === s.id);
            const totalSessions = studentSessions.length;
            const avgScore = totalSessions > 0
                ? Math.round(studentSessions.reduce((sum, sess) => sum + (sess.score_percentage || 0), 0) / totalSessions)
                : 0;

            const studentUnis = enrollments.filter(e => e.student_id === s.id).map(e => {
                const u = universities.find(uni => uni.id === e.university_id);
                return u ? { name: u.name } : null;
            }).filter(Boolean);

            let status = 'On Track';
            if (avgScore >= 85) status = 'Mastery';
            else if (avgScore < 60 && totalSessions > 0) status = 'At Risk';
            else if (totalSessions === 0) status = 'Pending';

            return {
                id: s.id,
                name: s.full_name,
                email: s.email,
                averageScore: avgScore,
                totalSessions,
                status,
                universities: studentUnis
            };
        });

        // 6. Overall Stats
        const overallAvg = sessions.length > 0
            ? Math.round(sessions.reduce((sum, s) => sum + (s.score_percentage || 0), 0) / sessions.length)
            : 0;

        return NextResponse.json({
            overall: {
                totalStudents: students.length,
                totalUniversities: universities.length,
                averageScore: overallAvg,
                totalSessions: sessions.length
            },
            universityStats,
            studentStats
        });

    } catch (error: any) {
        console.error('Detailed Institution Analytics Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
