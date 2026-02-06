import { supabase } from '@/lib/supabase/client';

export interface StudentStats {
    enrolledTopics: number;
    questionsSolved: number;
    currentStreak: number;
    overallAccuracy: number;
    totalStudyTime: number; // in seconds
}

export interface PerformanceData {
    subject: string;
    score: number;
    fullMark: number;
}

export interface ProgressData {
    name: string;
    score: number;
    subtopicId: number;
}

export interface ContinueLearningItem {
    title: string;
    progress: number;
    subtopicId: number;
    topicId: number;
    color: string;
}

export class DashboardService {
    /**
     * Get student's main statistics
     */
    static async getStudentStats(studentId: string): Promise<{ stats: StudentStats; error?: string }> {
        try {
            // Get enrolled topics count
            const { count: enrolledCount } = await supabase
                .from('student_topic_enrollments')
                .select('*', { count: 'exact', head: true })
                .eq('student_id', studentId)
                .eq('is_active', true);

            // Get total modules (subtopics) completed
            const { count: modulesCount } = await supabase
                .from('subtopic_progress')
                .select('*', { count: 'exact', head: true })
                .eq('student_id', studentId)
                .eq('is_completed', true);

            // Get current streak
            const { data: streakData } = await supabase
                .from('learning_streaks')
                .select('streak_date')
                .eq('student_id', studentId)
                .order('streak_date', { ascending: false })
                .limit(30);

            const currentStreak = this.calculateStreak(streakData || []);

            // Get overall accuracy
            const { data: attempts } = await supabase
                .from('mcq_attempts')
                .select('is_correct')
                .eq('student_id', studentId);

            const totalAttempts = attempts?.length || 0;
            const correctAttempts = attempts?.filter(a => a.is_correct).length || 0;
            const overallAccuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

            // Get total study time
            const { data: studyData } = await supabase
                .from('practice_sessions')
                .select('time_spent_seconds')
                .eq('student_id', studentId);

            const totalStudyTime = studyData?.reduce((acc, curr) => acc + (curr.time_spent_seconds || 0), 0) || 0;

            return {
                stats: {
                    enrolledTopics: enrolledCount || 0,
                    questionsSolved: modulesCount || 0,
                    currentStreak,
                    overallAccuracy,
                    totalStudyTime
                }
            };
        } catch (error: any) {
            console.error('Error fetching student stats:', error);
            return {
                stats: {
                    enrolledTopics: 0,
                    questionsSolved: 0,
                    currentStreak: 0,
                    overallAccuracy: 0,
                    totalStudyTime: 0
                },
                error: error.message
            };
        }
    }

    /**
     * Calculate current streak from streak data
     */
    private static calculateStreak(streakData: { streak_date: string }[]): number {
        if (!streakData || streakData.length === 0) return 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const mostRecentDate = new Date(streakData[0].streak_date);
        mostRecentDate.setHours(0, 0, 0, 0);

        // If the latest activity is older than yesterday, the streak is broken
        if (mostRecentDate.getTime() < yesterday.getTime()) {
            return 0;
        }

        let streak = 0;
        // Count backwards from the most recent activity date
        for (let i = 0; i < streakData.length; i++) {
            const streakDate = new Date(streakData[i].streak_date);
            streakDate.setHours(0, 0, 0, 0);

            const expectedDate = new Date(mostRecentDate);
            expectedDate.setDate(mostRecentDate.getDate() - i);
            expectedDate.setHours(0, 0, 0, 0);

            if (streakDate.getTime() === expectedDate.getTime()) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    }

    /**
     * Get performance data by subject (for radar chart)
     */
    static async getPerformanceBySubject(studentId: string): Promise<{ data: PerformanceData[]; error?: string }> {
        try {
            const { data, error } = await supabase.rpc('get_student_performance_by_subject', {
                p_student_id: studentId
            });

            if (error) {
                // If function doesn't exist, use fallback query
                const { data: sessions } = await supabase
                    .from('practice_sessions')
                    .select(`
                        score_percentage,
                        subtopics (
                            topics (
                                subjects (
                                    name
                                )
                            )
                        )
                    `)
                    .eq('student_id', studentId)
                    .eq('is_completed', true);

                // Group by subject and calculate average
                const subjectScores: { [key: string]: number[] } = {};

                sessions?.forEach((session: any) => {
                    const subjectName = session.subtopics?.topics?.subjects?.name;
                    if (subjectName && session.score_percentage !== null) {
                        if (!subjectScores[subjectName]) {
                            subjectScores[subjectName] = [];
                        }
                        subjectScores[subjectName].push(parseFloat(session.score_percentage.toString()));
                    }
                });

                const performanceData: PerformanceData[] = Object.entries(subjectScores).map(([subject, scores]) => ({
                    subject,
                    score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
                    fullMark: 100
                }));

                return { data: performanceData };
            }

            return { data: data || [] };
        } catch (error: any) {
            console.error('Error fetching performance by subject:', error);
            return { data: [], error: error.message };
        }
    }

    /**
     * Get progress by subtopic (for progress bars)
     */
    static async getProgressBySubtopic(studentId: string, limit: number = 5): Promise<{ data: ProgressData[]; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('subtopic_progress')
                .select(`
          subtopic_id,
          reading_percentage,
          subtopics:subtopic_id (
            name
          )
        `)
                .eq('student_id', studentId)
                .order('last_accessed_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            const progressData: ProgressData[] = (data || []).map((item: any) => ({
                name: item.subtopics?.name || 'Unknown',
                score: Math.round(item.reading_percentage || 0),
                subtopicId: item.subtopic_id
            }));

            return { data: progressData };
        } catch (error: any) {
            console.error('Error fetching progress by subtopic:', error);
            return { data: [], error: error.message };
        }
    }

    /**
     * Get continue learning items (recently accessed subtopics)
     */
    static async getContinueLearningItems(studentId: string, limit: number = 3): Promise<{ data: ContinueLearningItem[]; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('subtopic_progress')
                .select(`
          subtopic_id,
          reading_percentage,
          subtopics:subtopic_id (
            name,
            topic_id,
            topics:topic_id (
              subject_id,
              subjects:subject_id (
                color
              )
            )
          )
        `)
                .eq('student_id', studentId)
                .eq('is_completed', false)
                .order('last_accessed_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            const colors = ['text-indigo-600', 'text-orange-600', 'text-teal-600', 'text-purple-600'];

            const items: ContinueLearningItem[] = (data || []).map((item: any, index: number) => ({
                title: item.subtopics?.name || 'Unknown',
                progress: Math.round(item.reading_percentage || 0),
                subtopicId: item.subtopic_id,
                topicId: item.subtopics?.topic_id || 0,
                color: colors[index % colors.length]
            }));

            return { data: items };
        } catch (error: any) {
            console.error('Error fetching continue learning items:', error);
            return { data: [], error: error.message };
        }
    }

    /**
     * Get recommended subtopic based on weaknesses
     */
    static async getRecommendedSubtopic(studentId: string): Promise<{ subtopic: any; error?: string }> {
        try {
            const { data, error } = await supabase
                .rpc('detect_student_weaknesses', { student_uuid: studentId });

            if (error) throw error;

            if (!data || data.length === 0) {
                return { subtopic: null };
            }

            // Get the first weakness (highest priority)
            const weakness = data[0];

            // Reconstruct the expected object structure for the UI
            // The UI expects { subtopics: { name: '...', topic: { ... } } }
            // Let's fetch the full subtopic detail since RPC only gives us names
            const { data: fullSubtopic } = await supabase
                .from('subtopics')
                .select(`
                    id,
                    name,
                    topic_id,
                    topics (
                        name,
                        subject_id,
                        subjects (
                            name
                        )
                    )
                `)
                .eq('id', weakness.subtopic_id)
                .single();

            if (!fullSubtopic) return { subtopic: null };

            return {
                subtopic: {
                    subtopic_id: weakness.subtopic_id,
                    weakness_score: 100 - weakness.avg_score,
                    subtopics: fullSubtopic
                }
            };
        } catch (error: any) {
            console.error('Error fetching recommended subtopic:', error.message || error);
            return { subtopic: null, error: error.message };
        }
    }

    /**
     * Get real-time rank for the student
     */
    static async getStudentRank(studentId: string): Promise<{ rank: number; totalStudents: number; change: string }> {
        try {
            // Get all student's accuracy from practice sessions
            const { data: allStats } = await supabase
                .from('practice_sessions')
                .select('student_id, score_percentage')
                .eq('is_completed', true);

            if (!allStats || allStats.length === 0) return { rank: 1, totalStudents: 1, change: '→ 0' };

            const studentAverages: Record<string, { total: number; count: number }> = {};

            allStats.forEach(s => {
                if (s.score_percentage === null) return;
                if (!studentAverages[s.student_id]) {
                    studentAverages[s.student_id] = { total: 0, count: 0 };
                }
                studentAverages[s.student_id].total += s.score_percentage;
                studentAverages[s.student_id].count += 1;
            });

            const sortedAverages = Object.keys(studentAverages)
                .map(id => ({
                    id,
                    avg: studentAverages[id].total / studentAverages[id].count
                }))
                .sort((a, b) => b.avg - a.avg);

            const rankIndex = sortedAverages.findIndex(a => a.id === studentId);
            const rank = rankIndex === -1 ? sortedAverages.length + 1 : rankIndex + 1;

            return {
                rank,
                totalStudents: sortedAverages.length,
                change: rank < sortedAverages.length / 4 ? '↑ 2 places' : '→ Steady'
            };
        } catch (e) {
            return { rank: 0, totalStudents: 0, change: '→ 0' };
        }
    }

    /**
     * Get dynamic milestones for the student
     */
    static async getRecentMilestones(studentId: string): Promise<any[]> {
        try {
            const { data: sessions } = await supabase
                .from('practice_sessions')
                .select('score_percentage, started_at, total_questions')
                .eq('student_id', studentId)
                .eq('is_completed', true)
                .order('started_at', { ascending: false })
                .limit(20);

            const milestones = [];

            if (sessions && sessions.length > 5) {
                milestones.push({
                    title: 'Consistency King',
                    desc: `Completed ${sessions.length} sessions recently`,
                    icon: 'TrendingUp',
                    color: 'text-primary-dark',
                    bg: 'bg-primary/10'
                });
            }

            const highAccuracy = sessions?.filter(s => s.score_percentage >= 90).length || 0;
            if (highAccuracy > 0) {
                milestones.push({
                    title: 'Sharp Shooter',
                    desc: `Achieved 90%+ in ${highAccuracy} sessions`,
                    icon: 'CheckCircle2',
                    color: 'text-primary-dark',
                    bg: 'bg-primary/10'
                });
            }

            if (milestones.length === 0) {
                milestones.push({
                    title: 'Academic Starter',
                    desc: 'Started the learning journey',
                    icon: 'Zap',
                    color: 'text-primary-dark',
                    bg: 'bg-primary/10'
                });
            }

            return milestones;
        } catch (e) {
            return [];
        }
    }
}
