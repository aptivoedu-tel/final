// Profile Service — MongoDB-only implementation
// All Supabase calls removed. Routes through MongoDB API endpoints or MongoProfileService.

import { MongoProfileService } from './mongoProfileService';

const IS_MONGO = process.env.NEXT_PUBLIC_DATABASE_TYPE === 'MONGODB';

export interface ProfileData {
    id: string;
    email: string;
    full_name: string;
    role: string;
    status: string;
    avatar_url?: string;
    email_verified: boolean;
    is_solo?: boolean;
    created_at: string;
    updated_at: string;
}

export interface UpdateProfileData {
    full_name?: string;
    avatar_url?: string;
}

export interface ChangePasswordData {
    currentPassword: string;
    newPassword: string;
}

export class ProfileService {
    /**
     * Get user profile
     */
    static async getProfile(userId: string): Promise<{ profile: ProfileData | null; error?: string }> {
        return MongoProfileService.getProfile(userId);
    }

    /**
     * Update user profile
     */
    static async updateProfile(
        userId: string,
        updates: UpdateProfileData
    ): Promise<{ success: boolean; error?: string }> {
        return MongoProfileService.updateProfile(userId, updates);
    }

    /**
     * Upload avatar image — uses MongoDB GridFS upload API
     */
    static async uploadAvatar(
        userId: string,
        file: File
    ): Promise<{ avatarUrl: string | null; error?: string }> {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('bucket', 'avatars');

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                return { avatarUrl: null, error: data.error || 'Upload failed' };
            }

            const { publicUrl } = await res.json();

            // Update the user's avatar_url
            await this.updateProfile(userId, { avatar_url: publicUrl });

            return { avatarUrl: publicUrl };
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            return { avatarUrl: null, error: error.message };
        }
    }

    /**
     * Change password via MongoDB API
     */
    static async changePassword(
        userId: string,
        data: ChangePasswordData
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: data.currentPassword,
                    newPassword: data.newPassword,
                }),
            });

            const result = await res.json();

            if (!res.ok) {
                return { success: false, error: result.error || 'Failed to change password' };
            }

            return { success: true };
        } catch (error: any) {
            console.error('Error changing password:', error);
            return { success: false, error: error.message || 'Failed to change password' };
        }
    }

    /**
     * Get student's enrolled universities (MongoDB)
     */
    static async getStudentUniversities(studentId: string): Promise<{ universities: any[]; error?: string }> {
        try {
            const res = await fetch(`/api/mongo/profile/universities?student_id=${studentId}`);
            if (!res.ok) return { universities: [] };
            const data = await res.json();
            return { universities: data.universities || [] };
        } catch (error: any) {
            return { universities: [], error: error.message };
        }
    }

    /**
     * Get admin's managed institutions
     */
    static async getAdminInstitutions(adminId: string): Promise<{ institutions: any[]; error?: string }> {
        try {
            const res = await fetch(`/api/mongo/profile/institutions?admin_id=${adminId}`);
            if (!res.ok) return { institutions: [] };
            const data = await res.json();
            return { institutions: data.institutions || [] };
        } catch (error: any) {
            return { institutions: [], error: error.message };
        }
    }

    /**
     * Get user's recent activity
     */
    static async getUserActivity(userId: string, limit: number = 10): Promise<{ activities: any[]; error?: string }> {
        try {
            const res = await fetch(`/api/mongo/profile/activity?user_id=${userId}&limit=${limit}`);
            if (!res.ok) return { activities: [] };
            const data = await res.json();
            return { activities: data.activities || [] };
        } catch (error: any) {
            return { activities: [], error: error.message };
        }
    }

    /**
     * Get student's learning statistics
     */
    static async getStudentLearningStats(studentId: string): Promise<{ stats: any; error?: string }> {
        try {
            const res = await fetch(`/api/mongo/profile/stats?student_id=${studentId}`);
            if (!res.ok) {
                return {
                    stats: { totalSessions: 0, totalHours: 0, averageScore: 0, currentStreak: 0 }
                };
            }
            const data = await res.json();
            return { stats: data.stats };
        } catch (error: any) {
            return {
                stats: { totalSessions: 0, totalHours: 0, averageScore: 0, currentStreak: 0 },
                error: error.message
            };
        }
    }
}
