import { SupabaseClient } from '@supabase/supabase-js';

export interface WeakTopic {
    topic: string;
    topicId?: number;
    accuracy: number;
    totalQuestions: number;
    weakestSubtopics: {
        id: number;
        name: string;
        accuracy: number;
    }[];
}

export interface PerformanceTrend {
    date: string;
    accuracy: number;
}

export interface BehaviorSummary {
    totalOverthinkCount: number;
    totalRushCount: number;
    averageTimePerQuestion: number;
}

export class AnalyticsTrackingService {
    /**
     * Get weak topics where accuracy < 60%
     */
    static async getWeakTopics(client: SupabaseClient, studentId: string, universityId?: string): Promise<{ data: WeakTopic[]; error?: string }> {
        try {
            // 1. Fetch data from practice_attempts as requested
            let query = client
                .from('practice_attempts')
                .select('topic, total_questions, correct')
                .eq('student_id', studentId);

            if (universityId && universityId !== 'general') {
                query = query.eq('university_id', universityId);
            }

            const { data: attempts, error } = await query;

            if (error) throw error;

            // Aggregate by topic name
            const topicMap: Record<string, { total: number; correct: number }> = {};

            attempts.forEach(attempt => {
                if (!topicMap[attempt.topic]) {
                    topicMap[attempt.topic] = { total: 0, correct: 0 };
                }
                topicMap[attempt.topic].total += attempt.total_questions;
                topicMap[attempt.topic].correct += attempt.correct;
            });

            const weakTopicEntries = Object.entries(topicMap)
                .map(([topic, stats]) => ({
                    topic,
                    accuracy: Math.round((stats.correct / stats.total) * 100),
                    totalQuestions: stats.total
                }))
                .filter(topic => topic.accuracy < 60)
                .sort((a, b) => a.accuracy - b.accuracy);

            if (weakTopicEntries.length === 0) {
                // Fallback: Try to get data from practice_sessions if attempts are empty
                let fallbackQuery = client
                    .from('practice_sessions')
                    .select('topic_id, score_percentage, total_questions, topics(name)')
                    .eq('student_id', studentId)
                    .eq('is_completed', true);

                if (universityId && universityId !== 'general') {
                    fallbackQuery = fallbackQuery.eq('university_id', universityId);
                }

                const { data: sessionData } = await fallbackQuery;

                if (sessionData && sessionData.length > 0) {
                    const sessionTopicMap: Record<string, { total: number; correct: number; id: number }> = {};
                    sessionData.forEach(s => {
                        const name = (s.topics as any)?.name || 'General';
                        if (!sessionTopicMap[name]) sessionTopicMap[name] = { total: 0, correct: 0, id: s.topic_id };
                        sessionTopicMap[name].total += s.total_questions;
                        sessionTopicMap[name].correct += Math.round((s.score_percentage * s.total_questions) / 100);
                    });

                    const fallbackWeak = Object.entries(sessionTopicMap)
                        .map(([name, stats]) => ({
                            topic: name,
                            topicId: stats.id,
                            accuracy: Math.round((stats.correct / stats.total) * 100),
                            totalQuestions: stats.total,
                            weakestSubtopics: []
                        }))
                        .filter(t => t.accuracy < 60)
                        .slice(0, 3);

                    return { data: fallbackWeak };
                }

                return { data: [] };
            }

            // 2. For each weak topic, find the weakest subtopics
            const weakTopicsWithSubtopics: WeakTopic[] = [];

            for (const entry of weakTopicEntries) {
                // Find topic_id by name
                const { data: topicData } = await client
                    .from('topics')
                    .select('id')
                    .eq('name', entry.topic)
                    .maybeSingle();

                let weakestSubtopics: { id: number; name: string; accuracy: number }[] = [];

                if (topicData) {
                    // Get subtopics for this topic
                    const { data: subtopics } = await client
                        .from('subtopics')
                        .select('id, name')
                        .eq('topic_id', topicData.id);

                    if (subtopics && subtopics.length > 0) {
                        const subtopicIds = subtopics.map(s => s.id);

                        // Fetch mcq_attempts for these subtopics
                        const { data: mcqAttempts } = await client
                            .from('mcq_attempts')
                            .select('is_correct, mcqs!inner(subtopic_id, topic_id)')
                            .eq('student_id', studentId)
                            .or(`mcqs.subtopic_id.in.(${subtopicIds.join(',')}),mcqs.topic_id.eq.${topicData.id}`);

                        if (mcqAttempts && mcqAttempts.length > 0) {
                            const subtopicStats: Record<number, { total: number; correct: number }> = {};

                            mcqAttempts.forEach((att: any) => {
                                const subId = att.mcqs.subtopic_id;
                                if (subId) {
                                    if (!subtopicStats[subId]) subtopicStats[subId] = { total: 0, correct: 0 };
                                    subtopicStats[subId].total += 1;
                                    if (att.is_correct) subtopicStats[subId].correct += 1;
                                }
                            });

                            weakestSubtopics = subtopics
                                .map(s => ({
                                    id: s.id,
                                    name: s.name,
                                    accuracy: subtopicStats[s.id]
                                        ? Math.round((subtopicStats[s.id].correct / subtopicStats[s.id].total) * 100)
                                        : 0
                                }))
                                .filter(s => subtopicStats[s.id])
                                .sort((a, b) => a.accuracy - b.accuracy)
                                .slice(0, 3);
                        }
                    }
                }

                weakTopicsWithSubtopics.push({
                    ...entry,
                    topicId: topicData?.id,
                    weakestSubtopics
                });
            }

            return { data: weakTopicsWithSubtopics };
        } catch (error: any) {
            console.error('Error fetching weak topics:', error);
            return { data: [], error: error.message };
        }
    }

    /**
     * Get performance trend
     */
    static async getPerformanceTrend(client: SupabaseClient, studentId: string, universityId?: string): Promise<{ data: PerformanceTrend[]; error?: string }> {
        try {
            let query = client
                .from('practice_attempts')
                .select('created_at, total_questions, correct')
                .eq('student_id', studentId);

            if (universityId && universityId !== 'general') {
                query = query.eq('university_id', universityId);
            }

            const { data, error } = await query.order('created_at', { ascending: true });

            if (error) throw error;

            if (!data || data.length === 0) {
                // Fallback: use practice_sessions for trend data
                let fallbackQuery = client
                    .from('practice_sessions')
                    .select('completed_at, score_percentage')
                    .eq('student_id', studentId)
                    .eq('is_completed', true)
                    .not('score_percentage', 'is', null);

                if (universityId && universityId !== 'general') {
                    fallbackQuery = fallbackQuery.eq('university_id', universityId);
                }

                const { data: sessions } = await fallbackQuery
                    .order('completed_at', { ascending: true })
                    .limit(30);

                if (sessions && sessions.length > 0) {
                    const trend: PerformanceTrend[] = sessions.map(s => ({
                        date: new Date(s.completed_at).toLocaleDateString(),
                        accuracy: Math.round(s.score_percentage)
                    }));
                    return { data: trend };
                }
                return { data: [] };
            }

            const trend: PerformanceTrend[] = data.map(attempt => ({
                date: new Date(attempt.created_at).toLocaleDateString(),
                accuracy: Math.round((attempt.correct / attempt.total_questions) * 100)
            }));

            return { data: trend };
        } catch (error: any) {
            console.error('Error fetching performance trend:', error);
            return { data: [], error: error.message };
        }
    }

    /**
     * Get behavior summary
     */
    static async getBehaviorSummary(client: SupabaseClient, studentId: string, universityId?: string): Promise<{ data: BehaviorSummary | null; error?: string }> {
        try {
            let query = client
                .from('practice_attempts')
                .select('overthink_count, rush_count, avg_time_seconds, total_questions')
                .eq('student_id', studentId);

            if (universityId && universityId !== 'general') {
                query = query.eq('university_id', universityId);
            }

            const { data, error } = await query;

            if (error) throw error;

            if (!data || data.length === 0) {
                // Try fallback from practice_sessions
                let fallbackQuery = client
                    .from('practice_sessions')
                    .select('score_percentage, total_questions, time_spent_seconds')
                    .eq('student_id', studentId)
                    .eq('is_completed', true);

                if (universityId && universityId !== 'general') {
                    fallbackQuery = fallbackQuery.eq('university_id', universityId);
                }

                const { data: sessions } = await fallbackQuery;

                if (sessions && sessions.length > 0) {
                    const totalQs = sessions.reduce((sum, s) => sum + s.total_questions, 0);
                    const totalTime = sessions.reduce((sum, s) => sum + s.time_spent_seconds, 0);
                    const avgTime = totalQs > 0 ? Number((totalTime / totalQs).toFixed(1)) : 0;

                    return {
                        data: {
                            totalOverthinkCount: 0,
                            totalRushCount: 0,
                            averageTimePerQuestion: avgTime
                        }
                    };
                }

                return {
                    data: {
                        totalOverthinkCount: 0,
                        totalRushCount: 0,
                        averageTimePerQuestion: 0
                    }
                };
            }

            const totalOverthink = data.reduce((sum, item) => sum + (item.overthink_count || 0), 0);
            const totalRush = data.reduce((sum, item) => sum + (item.rush_count || 0), 0);
            const totalWeightedTime = data.reduce((sum, item) => sum + ((item.avg_time_seconds || 0) * item.total_questions), 0);
            const totalQs = data.reduce((sum, item) => sum + item.total_questions, 0);
            const avgTime = totalQs > 0 ? Number((totalWeightedTime / totalQs).toFixed(1)) : 0;

            return {
                data: {
                    totalOverthinkCount: totalOverthink,
                    totalRushCount: totalRush,
                    averageTimePerQuestion: avgTime
                }
            };
        } catch (error: any) {
            console.error('Error fetching behavior summary:', error);
            return { data: null, error: error.message };
        }
    }

    /**
     * Get topic accuracy distribution
     */
    static async getTopicAccuracyData(client: SupabaseClient, studentId: string, universityId?: string): Promise<{ data: { topic: string; accuracy: number }[]; error?: string }> {
        try {
            let query = client
                .from('practice_attempts')
                .select('topic, total_questions, correct')
                .eq('student_id', studentId);

            if (universityId && universityId !== 'general') {
                query = query.eq('university_id', universityId);
            }

            const { data, error } = await query;

            if (error) throw error;

            const topicMap: Record<string, { total: number; correct: number }> = {};

            data.forEach(attempt => {
                if (!topicMap[attempt.topic]) {
                    topicMap[attempt.topic] = { total: 0, correct: 0 };
                }
                topicMap[attempt.topic].total += attempt.total_questions;
                topicMap[attempt.topic].correct += attempt.correct;
            });

            const result = Object.entries(topicMap).map(([topic, stats]) => ({
                topic,
                accuracy: Math.round((stats.correct / stats.total) * 100)
            }));

            return { data: result };
        } catch (error: any) {
            console.error('Error fetching topic accuracy:', error);
            return { data: [], error: error.message };
        }
    }
}
