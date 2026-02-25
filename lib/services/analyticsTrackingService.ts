// MongoDB-only analytics tracking service
// Queries MongoDB models directly instead of using Supabase client

import connectToDatabase from '@/lib/mongodb/connection';
import { PracticeSession, MCQAttempt, Topic, Subtopic } from '@/lib/mongodb/models';

export interface WeakTopic {
    topic: string;
    topicId?: number;
    accuracy: number;
    totalQuestions: number;
    weakestSubtopics: { id: number; name: string; accuracy: number }[];
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
    static async getWeakTopics(
        _client: any,
        studentId: string,
        universityId?: string
    ): Promise<{ data: WeakTopic[]; error?: string }> {
        try {
            await connectToDatabase();

            const filter: any = { student_id: studentId, is_completed: true };
            if (universityId && universityId !== 'general') {
                filter.university_id = parseInt(universityId);
            }

            const sessions = await PracticeSession.find(filter)
                .select('topic_id total_questions correct_answers score_percentage')
                .lean();

            if (!sessions || sessions.length === 0) {
                return { data: [] };
            }

            // Aggregate by topic_id
            const topicMap: Record<number, { total: number; correct: number }> = {};
            sessions.forEach((s: any) => {
                if (!s.topic_id) return;
                if (!topicMap[s.topic_id]) topicMap[s.topic_id] = { total: 0, correct: 0 };
                topicMap[s.topic_id].total += s.total_questions || 0;
                topicMap[s.topic_id].correct += s.correct_answers || 0;
            });

            const topicIds = Object.keys(topicMap).map(Number);
            const topics = await Topic.find({ id: { $in: topicIds } }).lean() as any[];

            const weakTopics: WeakTopic[] = await Promise.all(
                topics
                    .map(t => {
                        const stats = topicMap[t.id];
                        const accuracy = stats.total > 0
                            ? Math.round((stats.correct / stats.total) * 100)
                            : 0;
                        return { topic: t.name, topicId: t.id, accuracy, total: stats.total };
                    })
                    .filter(t => t.accuracy < 60)
                    .sort((a, b) => a.accuracy - b.accuracy)
                    .slice(0, 5)
                    .map(async t => {
                        // Find weakest subtopics for this topic
                        const subtopics = await Subtopic.find({ topic_id: t.topicId, is_active: true }).lean() as any[];
                        const subtopicIds = subtopics.map((s: any) => s.id);

                        const attempts = await MCQAttempt.find({
                            student_id: studentId,
                            subtopic_id: { $in: subtopicIds }
                        }).lean() as any[];

                        const subMap: Record<number, { total: number; correct: number }> = {};
                        attempts.forEach((a: any) => {
                            if (!subMap[a.subtopic_id]) subMap[a.subtopic_id] = { total: 0, correct: 0 };
                            subMap[a.subtopic_id].total++;
                            if (a.is_correct) subMap[a.subtopic_id].correct++;
                        });

                        const weakestSubtopics = subtopics
                            .filter((s: any) => subMap[s.id])
                            .map((s: any) => ({
                                id: s.id,
                                name: s.name,
                                accuracy: Math.round((subMap[s.id].correct / subMap[s.id].total) * 100)
                            }))
                            .sort((a, b) => a.accuracy - b.accuracy)
                            .slice(0, 3);

                        return {
                            topic: t.topic,
                            topicId: t.topicId,
                            accuracy: t.accuracy,
                            totalQuestions: t.total,
                            weakestSubtopics,
                        };
                    })
            );

            return { data: weakTopics };
        } catch (error: any) {
            console.error('Error fetching weak topics:', error);
            return { data: [], error: error.message };
        }
    }

    /**
     * Get performance trend (last 30 sessions)
     */
    static async getPerformanceTrend(
        _client: any,
        studentId: string,
        universityId?: string
    ): Promise<{ data: PerformanceTrend[]; error?: string }> {
        try {
            await connectToDatabase();

            const filter: any = { student_id: studentId, is_completed: true };
            if (universityId && universityId !== 'general') {
                filter.university_id = parseInt(universityId);
            }

            const sessions = await PracticeSession.find(filter)
                .sort({ completed_at: 1 })
                .limit(30)
                .select('completed_at score_percentage')
                .lean() as any[];

            const trend: PerformanceTrend[] = sessions
                .filter(s => s.score_percentage != null)
                .map(s => ({
                    date: new Date(s.completed_at || s.started_at).toLocaleDateString(),
                    accuracy: Math.round(s.score_percentage)
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
    static async getBehaviorSummary(
        _client: any,
        studentId: string,
        universityId?: string
    ): Promise<{ data: BehaviorSummary | null; error?: string }> {
        try {
            await connectToDatabase();

            const filter: any = { student_id: studentId, is_completed: true };
            if (universityId && universityId !== 'general') {
                filter.university_id = parseInt(universityId);
            }

            const sessions = await PracticeSession.find(filter)
                .select('total_questions time_spent_seconds')
                .lean() as any[];

            if (!sessions || sessions.length === 0) {
                return {
                    data: { totalOverthinkCount: 0, totalRushCount: 0, averageTimePerQuestion: 0 }
                };
            }

            const totalQs = sessions.reduce((sum, s) => sum + (s.total_questions || 0), 0);
            const totalTime = sessions.reduce((sum, s) => sum + (s.time_spent_seconds || 0), 0);
            const avgTime = totalQs > 0 ? Number((totalTime / totalQs).toFixed(1)) : 0;

            return {
                data: {
                    totalOverthinkCount: 0,
                    totalRushCount: 0,
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
    static async getTopicAccuracyData(
        _client: any,
        studentId: string,
        universityId?: string
    ): Promise<{ data: { topic: string; accuracy: number }[]; error?: string }> {
        const { data: weakTopics, error } = await this.getWeakTopics(_client, studentId, universityId);
        if (error) return { data: [], error };

        return {
            data: weakTopics.map(t => ({ topic: t.topic, accuracy: t.accuracy }))
        };
    }
}
