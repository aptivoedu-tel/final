// MongoDB-only implementation of NotificationService
// Removes all Supabase dependencies. All logic routed via MongoNotificationService/API.

import { MongoNotificationService } from './mongoNotificationService';

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
    target?: string;
}

export interface CreateNotificationData {
    title: string;
    message: string;
    category: string;
    senderRole: string;
    institutionId?: number;
    imageUrl?: string;
}

export interface HistoryFilter {
    senderRole?: string;
    institutionId?: number;
}

export class NotificationService {
    /**
     * Send notification to all users (Super Admin only)
     */
    static async sendToAllUsers(data: CreateNotificationData): Promise<{ success: boolean; error?: string; notificationId?: number }> {
        try {
            // In MongoDB, we can fetch all users via an internal API or just pass a flag to the notification API
            const response = await fetch('/api/mongo/admin/notifications/send-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    recipientType: 'all'
                })
            });

            if (!response.ok) {
                const res = await response.json();
                return { success: false, error: res.error };
            }

            const result = await response.json();
            return { success: true, notificationId: result.notificationId };
        } catch (error: any) {
            console.error('Error sending notification to all users:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send notification to all admins (Super Admin and Institution Admin)
     */
    static async sendToAllAdmins(data: CreateNotificationData): Promise<{ success: boolean; error?: string; notificationId?: number }> {
        try {
            const response = await fetch('/api/mongo/admin/notifications/send-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    recipientType: 'admins'
                })
            });

            if (!response.ok) {
                const res = await response.json();
                return { success: false, error: res.error };
            }

            const result = await response.json();
            return { success: true, notificationId: result.notificationId };
        } catch (error: any) {
            console.error('Error sending notification to all admins:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send notification to all students
     */
    static async sendToAllStudents(data: CreateNotificationData): Promise<{ success: boolean; error?: string; notificationId?: number }> {
        try {
            const response = await fetch('/api/mongo/admin/notifications/send-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    recipientType: 'students'
                })
            });

            if (!response.ok) {
                const res = await response.json();
                return { success: false, error: res.error };
            }

            const result = await response.json();
            return { success: true, notificationId: result.notificationId };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Send notification to a specific institution
     */
    static async sendToInstitution(institutionId: number, data: CreateNotificationData): Promise<{ success: boolean; error?: string; notificationId?: number }> {
        try {
            const response = await fetch('/api/mongo/admin/notifications/send-bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    recipientType: 'institution',
                    institutionId
                })
            });

            if (!response.ok) {
                const res = await response.json();
                return { success: false, error: res.error };
            }

            const result = await response.json();
            return { success: true, notificationId: result.notificationId };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get sent notification history
     */
    static async getSentHistory(filter?: HistoryFilter): Promise<{ history: Notification[]; error?: string }> {
        try {
            const params = new URLSearchParams();
            if (filter?.senderRole) params.append('sender_role', filter.senderRole);
            if (filter?.institutionId) params.append('institution_id', filter.institutionId.toString());

            const response = await fetch(`/api/mongo/admin/notifications/history?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch history');

            const data = await response.json();
            return { history: data.history };
        } catch (error: any) {
            return { history: [], error: error.message };
        }
    }

    /**
     * Upload notification image
     */
    static async uploadNotificationImage(file: File): Promise<{ url: string | null; error?: string }> {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'notification');

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Upload failed');
            }

            const data = await response.json();
            return { url: data.url };
        } catch (error: any) {
            return { url: null, error: error.message };
        }
    }

    /**
     * Get user notifications
     */
    static async getUserNotifications(userId: string, limit: number = 20, offset: number = 0) {
        return MongoNotificationService.getUserNotifications(userId, limit, offset);
    }

    /**
     * Get unread count
     */
    static async getUnreadCount(userId: string) {
        return MongoNotificationService.getUnreadCount(userId);
    }

    /**
     * Mark as read
     */
    static async markAsRead(notificationId: number, userId: string) {
        return MongoNotificationService.markAsRead(notificationId, userId);
    }

    /**
     * Mark all as read
     */
    static async markAllAsRead(userId: string) {
        return MongoNotificationService.markAllAsRead(userId);
    }
}
