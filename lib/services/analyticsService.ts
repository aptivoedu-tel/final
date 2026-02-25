// MongoDB-only implementation of AnalyticsService
// Removes all Supabase dependencies. All logic routed via MongoDB API endpoints.

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
     * Get detailed institutional analytics including university and student breakdowns
     */
    static async getInstitutionDetailedAnalytics(institutionId: number, startDate?: Date) {
        try {
            const dateStr = startDate ? `&start_date=${startDate.toISOString()}` : '';
            const res = await fetch(`/api/mongo/admin/analytics/institution?institution_id=${institutionId}${dateStr}`);
            if (!res.ok) throw new Error('Failed to fetch detailed analytics');
            return res.json();
        } catch (error) {
            console.error('getInstitutionDetailedAnalytics error:', error);
            throw error;
        }
    }

    /**
     * Get granular analytics for a specific student (topic/subject breakdown)
     */
    static async getStudentDrilldownAnalytics(studentId: string, startDate?: Date) {
        try {
            const dateStr = startDate ? `&start_date=${startDate.toISOString()}` : '';
            const res = await fetch(`/api/mongo/admin/analytics/student-drilldown?student_id=${studentId}${dateStr}`);
            if (!res.ok) throw new Error('Failed to fetch student drilldown');
            return res.json();
        } catch (error) {
            console.error('getStudentDrilldownAnalytics error:', error);
            throw error;
        }
    }

    /**
     * Get student's performance analytics
     */
    static async getStudentAnalytics(studentId: string) {
        try {
            const response = await fetch(`/api/mongo/analytics?student_id=${studentId}`);
            if (!response.ok) throw new Error('Analytics failed');
            const data = await response.json();
            return data.analytics;
        } catch (error) {
            console.error('getStudentAnalytics error:', error);
            return null;
        }
    }

    /**
     * Get total statistics (Admin)
     */
    static async getTotalStats(): Promise<{ stats: TotalStats; error?: string }> {
        try {
            const res = await fetch('/api/mongo/admin/analytics/total-stats');
            if (!res.ok) throw new Error('Failed to fetch total stats');
            const data = await res.json();
            return { stats: data.stats };
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
     * Get student growth data over time
     */
    static async getStudentGrowth(period: number | 'week' | 'month' | 'year' = 30): Promise<{ data: GrowthData[]; error?: string }> {
        try {
            let days = 30;
            if (period === 'week') days = 7;
            else if (period === 'month') days = 30;
            else if (period === 'year') days = 365;
            else if (typeof period === 'number') days = period;

            const res = await fetch(`/api/mongo/admin/analytics/growth?days=${days}`);
            if (!res.ok) throw new Error('Failed to fetch growth data');
            const data = await res.json();
            return { data: data.growth || [] };
        } catch (error: any) {
            return { data: [], error: error.message };
        }
    }

    /**
     * Get distribution of MCQs by subject
     */
    static async getSubjectDistribution(): Promise<{ data: SubjectDistribution[]; error?: string }> {
        try {
            const res = await fetch('/api/mongo/admin/analytics/subject-distribution');
            if (!res.ok) throw new Error('Failed to fetch subject distribution');
            const data = await res.json();
            return { data: data.distribution || [] };
        } catch (error: any) {
            return { data: [], error: error.message };
        }
    }

    /**
     * Get top performing students
     */
    static async getTopPerformers(limit: number = 5): Promise<{ data: TopPerformer[]; error?: string }> {
        try {
            const res = await fetch(`/api/mongo/admin/analytics/top-performers?limit=${limit}`);
            if (!res.ok) throw new Error('Failed to fetch top performers');
            const data = await res.json();
            return { data: data.performers || [] };
        } catch (error: any) {
            return { data: [], error: error.message };
        }
    }

    /**
     * Get topics with lowest performance
     */
    static async getWeakTopics(limit: number = 5): Promise<{ topics: WeakTopic[]; error?: string }> {
        try {
            const res = await fetch(`/api/mongo/admin/analytics/weak-topics?limit=${limit}`);
            if (!res.ok) throw new Error('Failed to fetch weak topics');
            const data = await res.json();
            return { topics: data.topics || [] };
        } catch (error: any) {
            return { topics: [], error: error.message };
        }
    }

    /**
     * Alias for getWeakTopics (backward compatibility)
     */
    static async getWeakestTopics(limit: number = 5) {
        return this.getWeakTopics(limit);
    }

    /**
     * Get institution-specific statistics
     */
    static async getInstitutionStats(institutionId: number): Promise<{ stats: any; error?: string }> {
        try {
            const res = await fetch(`/api/mongo/admin/stats?institution_id=${institutionId}`);
            if (!res.ok) throw new Error('Failed to fetch institution stats');
            const data = await res.json();
            return { stats: data.stats };
        } catch (error: any) {
            return { stats: null, error: error.message };
        }
    }
}

