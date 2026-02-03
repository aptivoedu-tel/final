import { supabase } from '../supabase/client';

export interface Notification {
    id: number;
    title: string;
    message: string;
    category: string;
    sender_role?: string;
    institution_id?: number;
    institution_name?: string;
    created_at: string;
    is_read?: boolean;
    read_at?: string;
    image_url?: string;
}

export interface CreateNotificationData {
    title: string;
    message: string;
    category: string;
    senderRole: string;
    institutionId?: number;
    imageUrl?: string;
}

export class NotificationService {
    /**
     * Send notification to all users (Super Admin only)
     */
    static async sendToAllUsers(data: CreateNotificationData): Promise<{ success: boolean; error?: string; notificationId?: number }> {
        try {
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('id')
                .in('status', ['active', 'pending']);

            if (usersError) throw usersError;
            if (!users || users.length === 0) {
                return { success: false, error: 'No recipients found' };
            }

            const userIds = users.map(u => u.id);

            let dbCategory = data.category;
            if (dbCategory === 'info' || dbCategory === 'success') dbCategory = 'normal';
            if (dbCategory !== 'important' && dbCategory !== 'alert' && dbCategory !== 'normal') dbCategory = 'normal';

            const { data: result, error } = await supabase.rpc('send_bulk_notification', {
                p_title: data.title,
                p_message: data.message,
                p_category: dbCategory,
                p_sender_role: data.senderRole,
                p_institution_id: data.institutionId || null,
                p_user_ids: userIds as any,
                p_image_url: data.imageUrl || null
            });

            if (error) throw error;

            return { success: true, notificationId: result as number };
        } catch (error: any) {
            console.error('Error sending notification to all users:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send notification to specific institution's students (Institution Admin)
     */
    static async sendToInstitutionStudents(
        institutionId: number,
        data: CreateNotificationData
    ): Promise<{ success: boolean; error?: string; notificationId?: number }> {
        try {
            // Get all students enrolled in this institution
            // Note: student_university_enrollments table column might be active/status
            const { data: enrollments, error: enrollError } = await supabase
                .from('student_university_enrollments' as any)
                .select('student_id')
                .eq('institution_id', institutionId);

            if (enrollError) throw enrollError;
            if (!enrollments || enrollments.length === 0) {
                return { success: false, error: 'No students found for this institution' };
            }

            const userIds = [...new Set(enrollments.map((e: any) => e.student_id))];

            let dbCategory = data.category;
            if (dbCategory === 'info' || dbCategory === 'success') dbCategory = 'normal';
            if (dbCategory !== 'important' && dbCategory !== 'alert' && dbCategory !== 'normal') dbCategory = 'normal';

            const { data: result, error } = await supabase.rpc('send_bulk_notification', {
                p_title: data.title,
                p_message: data.message,
                p_category: dbCategory,
                p_sender_role: data.senderRole,
                p_institution_id: institutionId,
                p_user_ids: userIds as any,
                p_image_url: data.imageUrl || null
            });

            if (error) throw error;

            return { success: true, notificationId: result as number };
        } catch (error: any) {
            console.error('Error sending notification to institution students:', error);
            return { success: false, error: error.message };
        }
    }

    static async sendToSpecificUsers(
        userIds: string[],
        data: CreateNotificationData
    ): Promise<{ success: boolean; error?: string; notificationId?: number }> {
        try {
            let dbCategory = data.category;
            if (dbCategory === 'info' || dbCategory === 'success') dbCategory = 'normal';
            if (dbCategory !== 'important' && dbCategory !== 'alert' && dbCategory !== 'normal') dbCategory = 'normal';

            const { data: result, error } = await supabase.rpc('send_bulk_notification', {
                p_title: data.title,
                p_message: data.message,
                p_category: dbCategory,
                p_sender_role: data.senderRole,
                p_institution_id: data.institutionId || null,
                p_user_ids: userIds as any,
                p_image_url: data.imageUrl || null
            });

            if (error) throw error;

            return { success: true, notificationId: result as number };
        } catch (error: any) {
            console.error('Error sending notification to specific users:', error);
            return { success: false, error: error.message };
        }
    }

    static async sendNotification(
        data: CreateNotificationData,
        recipients: string[]
    ): Promise<{ success: boolean; error?: string; notificationId?: number }> {
        return this.sendToSpecificUsers(recipients, data);
    }

    static async getUserNotifications(
        userId: string,
        limit: number = 20,
        offset: number = 0
    ): Promise<{ notifications: Notification[]; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('notification_recipients')
                .select(`
                    id,
                    is_read,
                    read_at,
                    created_at,
                    notifications:notification_id (
                        id,
                        title,
                        message,
                        category,
                        sender_role,
                        institution_id,
                        image_url,
                        created_at,
                        institution:institutions(name)
                    )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;

            const notifications: Notification[] = (data || []).map((item: any) => ({
                id: item.notifications.id,
                title: item.notifications.title,
                message: item.notifications.message,
                category: item.notifications.category,
                sender_role: item.notifications.sender_role,
                institution_id: item.notifications.institution_id,
                institution_name: item.notifications.institution?.name,
                image_url: item.notifications.image_url,
                created_at: item.notifications.created_at,
                is_read: item.is_read,
                read_at: item.read_at
            }));

            return { notifications };
        } catch (error: any) {
            console.error('Error fetching user notifications:', error);
            return { notifications: [], error: error.message };
        }
    }

    static async getUnreadCount(userId: string): Promise<{ count: number; error?: string }> {
        try {
            const { data, error } = await supabase.rpc('get_unread_notification_count', {
                p_user_id: userId
            });

            if (error) throw error;

            return { count: data as number || 0 };
        } catch (error: any) {
            console.error('Error fetching unread count:', error);
            return { count: 0, error: error.message };
        }
    }

    static async markAsRead(notificationId: number, userId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const { data, error } = await supabase.rpc('mark_notification_read', {
                p_notification_id: notificationId,
                p_user_id: userId
            });

            if (error) throw error;

            return { success: !!data };
        } catch (error: any) {
            console.error('Error marking notification as read:', error);
            return { success: false, error: error.message };
        }
    }

    static async markAllAsRead(userId: string): Promise<{ success: boolean; count: number; error?: string }> {
        try {
            const { data, error } = await supabase.rpc('mark_all_notifications_read', {
                p_user_id: userId
            });

            if (error) throw error;

            return { success: true, count: data as number || 0 };
        } catch (error: any) {
            console.error('Error marking all notifications as read:', error);
            return { success: false, count: 0, error: error.message };
        }
    }

    /**
     * Get history of sent notifications
     */
    static async getSentHistory(options: {
        senderRole?: string;
        institutionId?: number;
        limit?: number;
    } = {}): Promise<{ history: Notification[]; error?: string }> {
        try {
            let query = supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false });

            if (options.senderRole) {
                query = query.eq('sender_role', options.senderRole);
            }

            if (options.institutionId) {
                query = query.eq('institution_id', options.institutionId);
            }

            if (options.limit) {
                query = query.limit(options.limit);
            } else {
                query = query.limit(20);
            }

            const { data, error } = await query;

            if (error) throw error;

            return {
                history: (data || []).map((n: any) => ({
                    ...n,
                    created_at: n.created_at
                })) as Notification[]
            };
        } catch (error: any) {
            console.error('Error fetching sent history:', error);
            return { history: [], error: error.message };
        }
    }
}
