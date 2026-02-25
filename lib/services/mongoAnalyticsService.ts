export class MongoAnalyticsService {
    /**
     * Get student analytics summary from MongoDB via our new proxy API
     */
    static async getStudentAnalytics(studentId: string): Promise<{
        totalSessions: number;
        averageScore: number;
        totalTimeSpent: number;
        totalQuestionsAttempted: number;
        accuracyTrend: number[];
        currentStreak: number;
    }> {
        try {
            const response = await fetch(`/api/mongo/analytics?student_id=${studentId}`);
            if (!response.ok) throw new Error('Analytics failed');

            const data = await response.json();
            const a = data.analytics;

            return {
                totalSessions: a.total_sessions || 0,
                averageScore: a.avg_score || 0,
                totalTimeSpent: (a.total_study_minutes || 0) * 60,
                totalQuestionsAttempted: a.total_attempts || 0,
                accuracyTrend: a.accuracy_trend || [], // To be implemented in API fully if needed
                currentStreak: a.current_streak || 0
            };
        } catch (error) {
            console.error('Mongo getStudentAnalytics error:', error);
            return {
                totalSessions: 0,
                averageScore: 0,
                totalTimeSpent: 0,
                totalQuestionsAttempted: 0,
                accuracyTrend: [],
                currentStreak: 0
            };
        }
    }

    /**
     * Generic MongoDB API fetch for other analytics
     */
    static async getStats(type: string, params: any = {}): Promise<any> {
        try {
            const qs = new URLSearchParams(params).toString();
            const response = await fetch(`/api/mongo/analytics?type=${type}&${qs}`);
            return await response.json();
        } catch (error) {
            return { error: 'Failed to fetch' };
        }
    }
}
