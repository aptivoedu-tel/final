import { Notification, CreateNotificationData } from './notificationService';

export class MongoNotificationService {
    /**
     * Get user notifications from MongoDB via our new proxy API
     */
    static async getUserNotifications(
        userId: string,
        limit: number = 20,
        offset: number = 0
    ): Promise<{ notifications: Notification[]; unreadCount?: number; error?: string }> {
        try {
            const response = await fetch(`/api/mongo/notifications?user_id=${userId}&limit=${limit}&offset=${offset}`);
            if (!response.ok) throw new Error('Failed to fetch notifications');

            const data = await response.json();
            return {
                notifications: data.notifications || [],
                unreadCount: data.unread_count
            };
        } catch (error: any) {
            console.error('Mongo getUserNotifications error:', error);
            return { notifications: [], error: error.message };
        }
    }

    /**
     * Get unread count from MongoDB
     */
    static async getUnreadCount(userId: string): Promise<{ count: number; error?: string }> {
        try {
            // We can just call getUserNotifications with a limit of 1 to get the count
            const { unreadCount, error } = await this.getUserNotifications(userId, 1);
            if (error) throw new Error(error);
            return { count: unreadCount || 0 };
        } catch (error: any) {
            console.error('Mongo getUnreadCount error:', error);
            return { count: 0, error: error.message };
        }
    }

    /**
     * Mark notification as read in MongoDB
     */
    static async markAsRead(notificationId: number, userId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const response = await fetch('/api/mongo/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notification_id: notificationId,
                    user_id: userId
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                return { success: false, error: data.error };
            }

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Mark all as read in MongoDB
     */
    static async markAllAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const response = await fetch('/api/mongo/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    mark_all: true
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                return { success: false, error: data.error };
            }

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Send notification (Admin)
     */
    static async sendNotification(data: CreateNotificationData, recipients: string[]): Promise<{ success: boolean; error?: string }> {
        try {
            const response = await fetch('/api/mongo/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: data.title,
                    message: data.message,
                    category: data.category,
                    sender_role: data.senderRole,
                    recipients
                }),
            });

            if (!response.ok) {
                const res = await response.json();
                return { success: false, error: res.error };
            }

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
