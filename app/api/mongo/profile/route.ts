import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb/connection';
import { StudentUniversityEnrollment, University, InstitutionAdmin, Institution, ActivityLog, PracticeSession, LearningStreak, User } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('student_id');
        const adminId = searchParams.get('admin_id');
        const userId = searchParams.get('user_id') || (session.user as any).id;
        const checkAdmin = searchParams.get('checkAdmin') === 'true';
        const path = req.nextUrl.pathname;

        await connectToDatabase();

        // --- Base Profile / Metadata ---
        if (path === '/api/mongo/profile') {
            const ids = searchParams.get('ids');
            if (ids) {
                const idArray = ids.split(',');
                const users = await User.find({ id: { $in: idArray } }).select('id full_name email').lean();
                return NextResponse.json({ users });
            }

            if (checkAdmin) {
                const adminLink = await InstitutionAdmin.findOne({ user_id: userId }).lean();
                return NextResponse.json({ data: adminLink });
            }

            const profile = await User.findOne({ id: userId }).lean();
            if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
            return NextResponse.json({ data: profile });
        }

        // --- Universities ---
        if (path.endsWith('/universities')) {
            if (!studentId) return NextResponse.json({ error: 'Missing student_id' }, { status: 400 });

            const enrollments = await StudentUniversityEnrollment.find({
                student_id: studentId,
                is_active: true
            }).lean();

            const universityIds = enrollments.map((e: any) => e.university_id);
            const universities = await University.find({ id: { $in: universityIds } }).lean();

            // Format to match the expected structure in ProfilePage
            const formatted = enrollments.map((e: any) => ({
                enrollment_date: e.enrollment_date,
                is_active: e.is_active,
                universities: universities.find((u: any) => u.id === e.university_id)
            })).filter(item => item.universities);

            return NextResponse.json({ universities: formatted });
        }

        // --- Institutions ---
        if (path.endsWith('/institutions')) {
            if (!adminId) return NextResponse.json({ error: 'Missing admin_id' }, { status: 400 });

            const adminAccess = await InstitutionAdmin.find({ user_id: adminId }).lean();
            const institutionIds = adminAccess.map((a: any) => a.institution_id);
            const institutions = await Institution.find({ id: { $in: institutionIds } }).lean();

            const formatted = adminAccess.map((a: any) => ({
                assigned_at: a.assigned_at,
                institutions: institutions.find((i: any) => i.id === a.institution_id)
            })).filter(item => item.institutions);

            return NextResponse.json({ institutions: formatted });
        }

        // --- Activity ---
        if (path.endsWith('/activity')) {
            if (!userId) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
            const limit = parseInt(searchParams.get('limit') || '10');

            const activities = await ActivityLog.find({ user_id: userId })
                .sort({ created_at: -1 })
                .limit(limit)
                .lean();

            return NextResponse.json({ activities });
        }

        // --- Stats ---
        if (path.endsWith('/stats')) {
            if (!studentId) return NextResponse.json({ error: 'Missing student_id' }, { status: 400 });

            const sessions = await PracticeSession.find({
                student_id: studentId,
                is_completed: true
            }).lean();

            const totalSessions = sessions.length;
            const totalSeconds = (sessions as any[]).reduce((sum: number, s: any) => sum + (s.time_spent_seconds || 0), 0);
            const totalHours = Math.round(totalSeconds / 3600);

            const completedWithScore = (sessions as any[]).filter((s: any) => s.score_percentage != null);
            const avgScore = completedWithScore.length > 0
                ? Math.round(completedWithScore.reduce((sum: number, s: any) => sum + (s.score_percentage || 0), 0) / completedWithScore.length)
                : 0;

            // Get streaks
            const streakData = await LearningStreak.find({ student_id: studentId })
                .sort({ streak_date: -1 })
                .limit(30)
                .lean();

            // Helper to calculate streak from dates
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
        }

        return NextResponse.json({ error: 'Invalid profile endpoint' }, { status: 404 });

    } catch (error: any) {
        console.error('Profile API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
