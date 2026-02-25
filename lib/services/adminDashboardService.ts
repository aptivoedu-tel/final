// MongoDB-only implementation of AdminDashboardService
// Removes all Supabase dependencies.

import { AdminStats, RecentActivity } from './adminDashboardService';

export class AdminDashboardService {
    /**
     * Get admin dashboard statistics
     */
    static async getAdminStats(institutionId?: number): Promise<{ stats: AdminStats; error?: string }> {
        try {
            const url = institutionId
                ? `/api/mongo/admin/stats?institution_id=${institutionId}`
                : '/api/mongo/admin/stats';

            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch admin stats');

            const data = await res.json();
            return { stats: data.stats };
        } catch (error: any) {
            console.error('Error fetching admin stats:', error);
            return {
                stats: {
                    totalQuestions: 0,
                    activeStudents: 0,
                    subjects: 0,
                    topics: 0,
                    changePercentages: {
                        questions: '0%',
                        students: '0%',
                        subjects: '0%',
                        topics: '0'
                    }
                },
                error: error.message
            };
        }
    }

    /**
     * Get recent activity
     */
    static async getRecentActivity(limit: number = 10, institutionId?: number): Promise<{ activities: RecentActivity[]; error?: string }> {
        try {
            // institutionId filter not yet implemented in API but could be added
            const res = await fetch(`/api/mongo/admin/activity?limit=${limit}`);
            if (!res.ok) throw new Error('Failed to fetch activity');

            const data = await res.json();

            const activities: RecentActivity[] = (data.activities || []).map((log: any) => {
                const timeAgo = this.getTimeAgo(new Date(log.created_at));

                let action = 'Activity';
                let subject = 'Unknown';
                let icon = 'activity';
                let color = 'text-gray-600 bg-gray-50';

                if (log.activity_type === 'subject_created') {
                    action = 'New Subject Added';
                    subject = log.activity_data?.name || 'Unknown Subject';
                    icon = 'layers';
                    color = 'text-purple-600 bg-purple-50';
                } else if (log.activity_type === 'mcq_upload') {
                    action = 'MCQs Uploaded';
                    subject = log.activity_data?.subject || 'Unknown Subject';
                    icon = 'upload';
                    color = 'text-emerald-600 bg-emerald-50';
                } else if (log.activity_type === 'content_updated') {
                    action = 'Content Updated';
                    subject = log.activity_data?.topic || 'Unknown Topic';
                    icon = 'edit';
                    color = 'text-emerald-600 bg-green-50';
                } else if (log.activity_type === 'student_enrolled') {
                    action = 'Student Enrolled';
                    subject = log.activity_data?.topic || 'Unknown Topic';
                    icon = 'user-plus';
                    color = 'text-teal-600 bg-teal-50';
                }

                return {
                    action,
                    subject,
                    time: timeAgo,
                    icon,
                    color
                };
            });

            return { activities };
        } catch (error: any) {
            console.error('Error fetching activity:', error);
            return { activities: [], error: error.message };
        }
    }

    /**
     * Get time ago string
     */
    private static getTimeAgo(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) {
            return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else {
            return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        }
    }

    /**
     * Log activity
     */
    static async logActivity(
        userId: string,
        activityType: string,
        activityData: any
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const res = await fetch('/api/mongo/admin/activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activity_type: activityType, activity_data: activityData })
            });
            if (!res.ok) throw new Error('Failed to log activity');
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get institution details for admin
     */
    static async getInstitutionDetails(userId: string): Promise<{ institution: any; error?: string }> {
        try {
            // Reuse the profile API for institution details
            const res = await fetch(`/api/mongo/profile/institutions?admin_id=${userId}`);
            if (!res.ok) return { institution: null };
            const data = await res.json();
            // Return the first one for now
            return { institution: data.institutions?.[0]?.institutions || null };
        } catch (error: any) {
            return { institution: null, error: error.message };
        }
    }
}
