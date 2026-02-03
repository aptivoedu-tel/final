import { supabase } from '../supabase/client';

export interface TotalStats {
    totalUsers: number;
    totalStudents: number;
    totalAdmins: number;
    totalSubjects: number;
    totalTopics: number;
    totalSubtopics: number;
    totalMCQs: number;
    totalPracticeSessions: number;
}

export interface GrowthData {
    date: string;
    count: number;
}

export interface SubjectDistribution {
    name: string;
    value: number;
    color: string;
}

export interface TopPerformer {
    id: string;
    name: string;
    email: string;
    averageScore: number;
    totalSessions: number;
}

export interface WeakTopic {
    topicName: string;
    averageScore: number;
    attemptCount: number;
}

export class AnalyticsService {
    /**
     * Get total statistics (Admin)
     */
    static async getTotalStats(): Promise<{ stats: TotalStats; error?: string }> {
        try {
            // Get user counts
            const { count: totalUsers } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true });

            const { count: totalStudents } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'student');

            const { count: totalAdmins } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .in('role', ['super_admin', 'institution_admin']);

            // Get content counts
            const { count: totalSubjects } = await supabase
                .from('subjects')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            const { count: totalTopics } = await supabase
                .from('topics')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            const { count: totalSubtopics } = await supabase
                .from('subtopics')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            const { count: totalMCQs } = await supabase
                .from('mcqs')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            const { count: totalPracticeSessions } = await supabase
                .from('practice_sessions')
                .select('*', { count: 'exact', head: true })
                .eq('is_completed', true);

            return {
                stats: {
                    totalUsers: totalUsers || 0,
                    totalStudents: totalStudents || 0,
                    totalAdmins: totalAdmins || 0,
                    totalSubjects: totalSubjects || 0,
                    totalTopics: totalTopics || 0,
                    totalSubtopics: totalSubtopics || 0,
                    totalMCQs: totalMCQs || 0,
                    totalPracticeSessions: totalPracticeSessions || 0
                }
            };
        } catch (error: any) {
            console.error('Error fetching total stats:', error);
            return {
                stats: {
                    totalUsers: 0,
                    totalStudents: 0,
                    totalAdmins: 0,
                    totalSubjects: 0,
                    totalTopics: 0,
                    totalSubtopics: 0,
                    totalMCQs: 0,
                    totalPracticeSessions: 0
                },
                error: error.message
            };
        }
    }

    /**
     * Get student growth over time
     */
    static async getStudentGrowth(period: 'week' | 'month' | 'year' = 'month'): Promise<{ data: GrowthData[]; error?: string }> {
        try {
            const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const { data, error } = await supabase
                .from('users')
                .select('created_at')
                .eq('role', 'student')
                .gte('created_at', startDate.toISOString())
                .order('created_at');

            if (error) throw error;

            // Group by date
            const grouped: { [key: string]: number } = {};
            data?.forEach(user => {
                const date = new Date(user.created_at).toISOString().split('T')[0];
                grouped[date] = (grouped[date] || 0) + 1;
            });

            // Convert to array and fill missing dates
            const growthData: GrowthData[] = [];
            for (let i = 0; i < days; i++) {
                const date = new Date();
                date.setDate(date.getDate() - (days - i - 1));
                const dateStr = date.toISOString().split('T')[0];
                growthData.push({
                    date: dateStr,
                    count: grouped[dateStr] || 0
                });
            }

            return { data: growthData };
        } catch (error: any) {
            console.error('Error fetching student growth:', error);
            return { data: [], error: error.message };
        }
    }

    /**
     * Get practice session statistics
     */
    static async getPracticeSessionStats(period: 'week' | 'month' | 'year' = 'month'): Promise<{ data: GrowthData[]; error?: string }> {
        try {
            const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const { data, error } = await supabase
                .from('practice_sessions')
                .select('started_at')
                .eq('is_completed', true)
                .gte('started_at', startDate.toISOString())
                .order('started_at');

            if (error) throw error;

            // Group by date
            const grouped: { [key: string]: number } = {};
            data?.forEach(session => {
                const date = new Date(session.started_at).toISOString().split('T')[0];
                grouped[date] = (grouped[date] || 0) + 1;
            });

            // Convert to array
            const sessionData: GrowthData[] = [];
            for (let i = 0; i < days; i++) {
                const date = new Date();
                date.setDate(date.getDate() - (days - i - 1));
                const dateStr = date.toISOString().split('T')[0];
                sessionData.push({
                    date: dateStr,
                    count: grouped[dateStr] || 0
                });
            }

            return { data: sessionData };
        } catch (error: any) {
            console.error('Error fetching practice session stats:', error);
            return { data: [], error: error.message };
        }
    }

    /**
     * Get top performing students
     */
    static async getTopPerformingStudents(limit: number = 10): Promise<{ students: TopPerformer[]; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('practice_sessions')
                .select(`
                  student_id,
                  score_percentage,
                  users:student_id (
                    id,
                    full_name,
                    email
                  )
                `)
                .eq('is_completed', true)
                .not('score_percentage', 'is', null);

            if (error) throw error;

            // Group by student and calculate average
            const studentScores: { [key: string]: { scores: number[]; name: string; email: string } } = {};

            data?.forEach((session: any) => {
                const studentId = session.student_id;
                if (!studentScores[studentId]) {
                    studentScores[studentId] = {
                        scores: [],
                        name: session.users?.full_name || 'Unknown',
                        email: session.users?.email || ''
                    };
                }
                studentScores[studentId].scores.push(session.score_percentage);
            });

            // Calculate averages and sort
            const performers: TopPerformer[] = Object.entries(studentScores)
                .map(([id, data]) => ({
                    id,
                    name: data.name,
                    email: data.email,
                    averageScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
                    totalSessions: data.scores.length
                }))
                .sort((a, b) => b.averageScore - a.averageScore)
                .slice(0, limit);

            return { students: performers };
        } catch (error: any) {
            console.error('Error fetching top performers:', error);
            return { students: [], error: error.message };
        }
    }

    /**
     * Get weakest topics across all students
     */
    static async getWeakestTopics(limit: number = 10): Promise<{ topics: WeakTopic[]; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('practice_sessions')
                .select(`
                  score_percentage,
                  subtopic_id,
                  subtopics:subtopic_id (
                    topic_id,
                    topics:topic_id (
                      name
                    )
                  )
                `)
                .eq('is_completed', true)
                .not('score_percentage', 'is', null);

            if (error) throw error;

            // Group by topic
            const topicScores: { [key: string]: number[] } = {};

            data?.forEach((session: any) => {
                const topicName = session.subtopics?.topics?.name;
                if (topicName) {
                    if (!topicScores[topicName]) {
                        topicScores[topicName] = [];
                    }
                    topicScores[topicName].push(session.score_percentage);
                }
            });

            // Calculate averages and sort
            const weakTopics: WeakTopic[] = Object.entries(topicScores)
                .map(([name, scores]) => ({
                    topicName: name,
                    averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
                    attemptCount: scores.length
                }))
                .sort((a, b) => a.averageScore - b.averageScore)
                .slice(0, limit);

            return { topics: weakTopics };
        } catch (error: any) {
            console.error('Error fetching weakest topics:', error);
            return { topics: [], error: error.message };
        }
    }

    /**
     * Get subject distribution
     */
    static async getSubjectDistribution(): Promise<{ data: SubjectDistribution[]; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('subjects')
                .select(`
                  id,
                  name,
                  color,
                  topics:topics(count)
                `)
                .eq('is_active', true);

            if (error) throw error;

            const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#f43f5e', '#06b6d4'];
            const distribution: SubjectDistribution[] = (data || []).map((subject: any, idx: number) => ({
                name: subject.name,
                value: subject.topics?.[0]?.count || 0,
                color: subject.color || colors[idx % colors.length]
            })).filter(item => item.value > 0); // Only show subjects with content

            return { data: distribution };
        } catch (error: any) {
            console.error('Error fetching subject distribution:', error);
            return { data: [], error: error.message };
        }
    }

    /**
     * Get university enrollment statistics
     */
    static async getUniversityEnrollmentStats(): Promise<{ data: any[]; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('student_university_enrollments')
                .select(`
                  university_id,
                  universities:university_id (
                    name
                  )
                `)
                .eq('is_active', true);

            if (error) throw error;

            // Count enrollments per university
            const enrollmentCounts: { [key: string]: number } = {};
            data?.forEach((enrollment: any) => {
                const uniName = enrollment.universities?.name || 'Unknown';
                enrollmentCounts[uniName] = (enrollmentCounts[uniName] || 0) + 1;
            });

            const stats = Object.entries(enrollmentCounts).map(([name, count]) => ({
                name,
                value: count
            }));

            return { data: stats };
        } catch (error: any) {
            console.error('Error fetching university enrollment stats:', error);
            return { data: [], error: error.message };
        }
    }

    /**
     * Get basic stats for an institution
     */
    static async getInstitutionStats(institutionId: number) {
        try {
            // Get student count
            const { count: totalStudents } = await supabase
                .from('student_university_enrollments')
                .select('*', { count: 'exact', head: true })
                .eq('institution_id', institutionId);

            // Get active today (simplified: sessions in last 24h)
            const yesterday = new Date();
            yesterday.setHours(yesterday.getHours() - 24);
            const { count: activeToday } = await supabase
                .from('practice_sessions')
                .select('student_id', { count: 'exact', head: true })
                .gte('started_at', yesterday.toISOString());
            // Note: This is a placeholder for "active students" in the last 24h. 
            // Real implementation would join with student_university_enrollments filter by inst.

            // Get university count
            const { data: unis } = await supabase
                .from('student_university_enrollments')
                .select('university_id')
                .eq('institution_id', institutionId);

            const uniqueUnis = [...new Set(unis?.map(u => u.university_id))];

            // Get avg score
            const { data: sessions } = await supabase
                .from('practice_sessions')
                .select('score_percentage')
                .gte('started_at', yesterday.toISOString()); // Just example

            return {
                stats: {
                    totalStudents: totalStudents || 0,
                    activeToday: activeToday || 0,
                    totalUniversities: uniqueUnis.length,
                    averagePerformance: 85 // Mock or calculate
                }
            };
        } catch (error) {
            console.error('Error fetching inst stats:', error);
            return { stats: { totalStudents: 0, activeToday: 0, totalUniversities: 0, averagePerformance: 0 } };
        }
    }

    /**
     * Get detailed institution-specific analytics (Hierarchical)
     */
    static async getInstitutionDetailedAnalytics(institutionId: number) {
        try {
            // 1. Get all enrollment links first
            const { data: enrolls, error: enrollError } = await supabase
                .from('student_university_enrollments')
                .select(`
                    student_id,
                    university_id,
                    university:universities(id, name, logo_url)
                `)
                .eq('institution_id', institutionId);

            if (enrollError) throw enrollError;
            const enrollments = (enrolls as any[]) || [];

            // 2. Extract unique student IDs and university IDs
            const studentIds = [...new Set(enrollments.map(e => e.student_id))];
            if (studentIds.length === 0) {
                return {
                    overall: { totalStudents: 0, averageScore: 0, totalSessions: 0, totalUniversities: 0 },
                    universityStats: [],
                    studentStats: []
                };
            }

            const universities = Array.from(new Map(enrollments.map(e => [e.university.id, e.university])).values()) as any[];

            // 3. Get practice sessions for these students
            const { data: sessions, error: sessionError } = await supabase
                .from('practice_sessions')
                .select('student_id, university_id, score_percentage, total_questions, started_at, is_completed')
                .in('student_id', studentIds)
                .eq('is_completed', true);

            if (sessionError) throw sessionError;

            // 4. Get User details separately for reliability
            const { data: userData } = await supabase
                .from('users')
                .select('id, full_name, email')
                .in('id', studentIds);

            const usersMap = new Map(userData?.map(u => [u.id, u]));

            // 5. Process Data for OVERALL Stats
            const totalSessions = sessions?.length || 0;
            const avgScore = sessions && sessions.length > 0
                ? Math.round(sessions.reduce((sum, s) => sum + (s.score_percentage || 0), 0) / sessions.length)
                : 0;

            // 6. Group Results by UNIVERSITY
            const universityStats = universities.map(uni => {
                const uniSessions = sessions?.filter(s => s.university_id === uni.id) || [];
                const uniAvg = uniSessions.length > 0
                    ? Math.round(uniSessions.reduce((sum, s) => sum + (s.score_percentage || 0), 0) / uniSessions.length)
                    : 0;
                const uniTotalQs = uniSessions.reduce((sum, s) => sum + (s.total_questions || 0), 0);
                const uniStudents = [...new Set(enrollments.filter(e => e.university_id === uni.id).map(e => e.student_id))].length;

                return {
                    id: uni.id,
                    name: uni.name,
                    logo_url: uni.logo_url,
                    averageScore: uniAvg,
                    totalSessions: uniSessions.length,
                    totalQuestions: uniTotalQs,
                    studentCount: uniStudents
                };
            });

            // 7. Group Results by STUDENT
            const studentStats = studentIds.map(sid => {
                const userObj: any = usersMap.get(sid) || { id: sid, full_name: 'Unknown' };
                const mySessions = sessions?.filter(s => s.student_id === sid) || [];
                const myAvg = mySessions.length > 0
                    ? Math.round(mySessions.reduce((sum, s) => sum + (s.score_percentage || 0), 0) / mySessions.length)
                    : 0;

                const myUnis = enrollments
                    .filter(e => e.student_id === sid)
                    .map(e => ({ id: e.university.id, name: e.university.name }));

                return {
                    id: sid,
                    name: userObj.full_name || 'Unknown',
                    email: userObj.email,
                    averageScore: myAvg,
                    totalSessions: mySessions.length,
                    universities: myUnis,
                    status: myAvg === 0 ? 'Not Started' : myAvg < 60 ? 'At Risk' : myAvg < 80 ? 'On Track' : 'Mastery'
                };
            });

            return {
                overall: {
                    totalStudents: studentIds.length,
                    averageScore: avgScore,
                    totalSessions,
                    totalUniversities: universities.length
                },
                universityStats,
                studentStats
            };
        } catch (error: any) {
            console.error('Institution Analytics Error:', error);
            throw error;
        }
    }

    /**
     * Get deep drill-down analytics for a specific student
     */
    static async getStudentDrilldownAnalytics(studentId: string) {
        try {
            // 1. Basic User Info
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id, full_name, email')
                .eq('id', studentId)
                .single();

            if (userError) throw userError;

            // 2. Fetch all completed sessions with full hierarchy
            const { data: sessions, error: sessionError } = await supabase
                .from('practice_sessions')
                .select(`
                    id,
                    score_percentage,
                    university_id,
                    university:universities(id, name),
                    subtopic:subtopics(
                        id,
                        name,
                        topic:topics(
                            id,
                            name,
                            subject:subjects(id, name, color)
                        )
                    ),
                    started_at,
                    time_spent_seconds
                `)
                .eq('student_id', studentId)
                .eq('is_completed', true);

            if (sessionError) throw sessionError;

            // 3. Process University Stats
            const uniMap = new Map();
            // 4. Process Subject Stats
            const subjectMap = new Map();
            // 5. Process Topic Stats
            const topicMap = new Map();

            (sessions || []).forEach((s: any) => {
                const score = s.score_percentage || 0;

                // University aggregation
                if (s.university) {
                    const u = s.university;
                    if (!uniMap.has(u.id)) uniMap.set(u.id, { name: u.name, scores: [], count: 0 });
                    const entry = uniMap.get(u.id);
                    entry.scores.push(score);
                    entry.count++;
                }

                // Subject & Topic aggregation
                const topic = s.subtopic?.topic;
                const subject = topic?.subject;

                if (subject) {
                    if (!subjectMap.has(subject.id)) subjectMap.set(subject.id, { name: subject.name, color: subject.color, scores: [], count: 0 });
                    const entry = subjectMap.get(subject.id);
                    entry.scores.push(score);
                    entry.count++;
                }

                if (topic) {
                    if (!topicMap.has(topic.id)) topicMap.set(topic.id, { name: topic.name, subjectName: subject?.name, scores: [], count: 0 });
                    const entry = topicMap.get(topic.id);
                    entry.scores.push(score);
                    entry.count++;
                }
            });

            const universityStats = Array.from(uniMap.values()).map(u => ({
                ...u,
                average: Math.round(u.scores.reduce((a: number, b: number) => a + b, 0) / u.scores.length)
            }));

            const subjectStats = Array.from(subjectMap.values()).map(s => ({
                ...s,
                average: Math.round(s.scores.reduce((a: number, b: number) => a + b, 0) / s.scores.length)
            }));

            const topicStats = Array.from(topicMap.values()).map(t => ({
                ...t,
                average: Math.round(t.scores.reduce((a: number, b: number) => a + b, 0) / t.scores.length)
            }));

            return {
                student: user,
                stats: {
                    totalSessions: sessions?.length || 0,
                    averageScore: sessions?.length ? Math.round(sessions.reduce((a, b) => a + (b.score_percentage || 0), 0) / sessions.length) : 0,
                    universityStats,
                    subjectStats,
                    topicStats
                }
            };
        } catch (error: any) {
            console.error('Student Drilldown Error:', error);
            throw error;
        }
    }
}
