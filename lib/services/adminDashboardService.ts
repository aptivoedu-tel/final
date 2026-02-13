import { supabase } from '@/lib/supabase/client';

export interface AdminStats {
    totalQuestions: number;
    activeStudents: number;
    subjects: number;
    topics: number;
    changePercentages: {
        questions: string;
        students: string;
        subjects: string;
        topics: string;
    };
}

export interface RecentActivity {
    action: string;
    subject: string;
    time: string;
    icon: string;
    color: string;
}

export class AdminDashboardService {
    /**
     * Get admin dashboard statistics
     */
    static async getAdminStats(institutionId?: number): Promise<{ stats: AdminStats; error?: string }> {
        try {
            // Get total MCQs count
            const { count: mcqCount } = await supabase
                .from('mcqs')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            // Get active students count
            let studentsQuery = supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'student')
                .eq('status', 'active');

            // If institution admin, filter by institution
            if (institutionId) {
                const { data: enrollments } = await supabase
                    .from('student_university_enrollments')
                    .select('student_id')
                    .eq('institution_id', institutionId)
                    .eq('is_active', true);

                const studentIds = enrollments?.map(e => e.student_id) || [];
                if (studentIds.length > 0) {
                    studentsQuery = studentsQuery.in('id', studentIds);
                }
            }

            const { count: studentCount } = await studentsQuery;

            // Get subjects count
            const { count: subjectCount } = await supabase
                .from('subjects')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            // Get topics count
            const { count: topicCount } = await supabase
                .from('topics')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            // Calculate change percentages (compare with last month)
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

            // MCQs change
            const { count: oldMcqCount } = await supabase
                .from('mcqs')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true)
                .lt('created_at', oneMonthAgo.toISOString());

            const mcqChange = this.calculatePercentageChange(oldMcqCount || 0, mcqCount || 0);

            // Students change
            const { count: oldStudentCount } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'student')
                .eq('status', 'active')
                .lt('created_at', oneMonthAgo.toISOString());

            const studentChange = this.calculatePercentageChange(oldStudentCount || 0, studentCount || 0);

            return {
                stats: {
                    totalQuestions: mcqCount || 0,
                    activeStudents: studentCount || 0,
                    subjects: subjectCount || 0,
                    topics: topicCount || 0,
                    changePercentages: {
                        questions: mcqChange,
                        students: studentChange,
                        subjects: '0%', // Subjects don't change often
                        topics: '+1' // Topics change occasionally
                    }
                }
            };
        } catch (error: any) {
            console.error('Error fetching admin stats details:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
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
                error: error.message || 'Unknown error'
            };
        }
    }

    /**
     * Calculate percentage change
     */
    private static calculatePercentageChange(oldValue: number, newValue: number): string {
        if (oldValue === 0) return newValue > 0 ? '+100%' : '0%';
        const change = ((newValue - oldValue) / oldValue) * 100;
        return change > 0 ? `+${Math.round(change)}%` : `${Math.round(change)}%`;
    }

    /**
     * Get recent activity
     */
    static async getRecentActivity(limit: number = 10, institutionId?: number): Promise<{ activities: RecentActivity[]; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('activity_logs')
                .select(`
          activity_type,
          activity_data,
          created_at,
          users:user_id (
            full_name,
            role
          )
        `)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            const activities: RecentActivity[] = (data || []).map((log: any) => {
                const timeAgo = this.getTimeAgo(new Date(log.created_at));

                // Parse activity type and create readable message
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
            // Check if it's a "relation does not exist" error (table not created)
            const isTableMissing = error?.code === '42P01' || error?.message?.includes('relation') || error?.message?.includes('does not exist');

            if (isTableMissing) {
                console.warn('Activity logs table does not exist yet. Returning empty activities.');
                return { activities: [] };
            }

            console.error('Error fetching recent activity:', {
                message: error?.message || 'Unknown error',
                code: error?.code || 'N/A',
                details: error?.details || 'N/A',
                hint: error?.hint || 'N/A',
                fullError: error
            });
            return { activities: [], error: error?.message || 'Failed to fetch recent activity' };
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
            const { error } = await supabase
                .from('activity_logs')
                .insert({
                    user_id: userId,
                    activity_type: activityType,
                    activity_data: activityData
                });

            if (error) throw error;

            return { success: true };
        } catch (error: any) {
            console.error('Error logging activity:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get institution details for admin
     */
    static async getInstitutionDetails(userId: string): Promise<{ institution: any; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('institution_admins')
                .select(`
          institution_id,
          institutions:institution_id (
            id,
            name,
            institution_type,
            contact_email,
            contact_phone
          )
        `)
                .eq('user_id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return { institution: null };
                }
                throw error;
            }

            return { institution: data?.institutions };
        } catch (error: any) {
            console.error('Error fetching institution details:', error);
            return { institution: null, error: error.message };
        }
    }
}
