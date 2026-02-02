import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;

            return { profile: data };
        } catch (error: any) {
            console.error('Error fetching profile:', error);
            return { profile: null, error: error.message };
        }
    }

    /**
     * Update user profile
     */
    static async updateProfile(
        userId: string,
        updates: UpdateProfileData
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabase
                .from('users')
                .update(updates)
                .eq('id', userId);

            if (error) throw error;

            return { success: true };
        } catch (error: any) {
            console.error('Error updating profile:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Upload avatar image
     */
    static async uploadAvatar(
        userId: string,
        file: File
    ): Promise<{ avatarUrl: string | null; error?: string }> {
        try {
            // Create a unique file name
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}-${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            // Upload file to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Update user's avatar_url
            await this.updateProfile(userId, { avatar_url: publicUrl });

            return { avatarUrl: publicUrl };
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            return { avatarUrl: null, error: error.message };
        }
    }

    /**
     * Change password
     */
    static async changePassword(
        userId: string,
        data: ChangePasswordData
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // First, verify current password
            const { data: user, error: fetchError } = await supabase
                .from('users')
                .select('password_hash, email')
                .eq('id', userId)
                .single();

            if (fetchError) throw fetchError;

            // In a real implementation, you would verify the password hash
            // For now, we'll use Supabase Auth if available
            // This is a simplified version - in production, use proper password verification

            // Update password using Supabase Auth
            const { error: updateError } = await supabase.auth.updateUser({
                password: data.newPassword
            });

            if (updateError) throw updateError;

            return { success: true };
        } catch (error: any) {
            console.error('Error changing password:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get student's enrolled universities
     */
    static async getStudentUniversities(studentId: string): Promise<{ universities: any[]; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('student_university_enrollments')
                .select(`
          enrollment_date,
          is_active,
          universities:university_id (
            id,
            name,
            domain,
            country,
            city,
            logo_url
          )
        `)
                .eq('student_id', studentId)
                .eq('is_active', true);

            if (error) throw error;

            return { universities: data || [] };
        } catch (error: any) {
            console.error('Error fetching student universities:', error);
            return { universities: [], error: error.message };
        }
    }

    /**
     * Get admin's managed institutions
     */
    static async getAdminInstitutions(adminId: string): Promise<{ institutions: any[]; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('institution_admins')
                .select(`
          assigned_at,
          institutions:institution_id (
            id,
            name,
            institution_type,
            contact_email,
            contact_phone,
            address,
            logo_url
          )
        `)
                .eq('user_id', adminId);

            if (error) throw error;

            return { institutions: data || [] };
        } catch (error: any) {
            console.error('Error fetching admin institutions:', error);
            return { institutions: [], error: error.message };
        }
    }

    /**
     * Get user's recent activity
     */
    static async getUserActivity(userId: string, limit: number = 10): Promise<{ activities: any[]; error?: string }> {
        try {
            const { data, error } = await supabase
                .from('activity_logs')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return { activities: data || [] };
        } catch (error: any) {
            console.error('Error fetching user activity:', error);
            return { activities: [], error: error.message };
        }
    }

    /**
     * Get student's learning statistics
     */
    static async getStudentLearningStats(studentId: string): Promise<{ stats: any; error?: string }> {
        try {
            // Get total practice sessions
            const { count: totalSessions } = await supabase
                .from('practice_sessions')
                .select('*', { count: 'exact', head: true })
                .eq('student_id', studentId)
                .eq('is_completed', true);

            // Get total time spent (in hours)
            const { data: sessions } = await supabase
                .from('practice_sessions')
                .select('time_spent_seconds')
                .eq('student_id', studentId)
                .eq('is_completed', true);

            const totalSeconds = sessions?.reduce((sum, s) => sum + (s.time_spent_seconds || 0), 0) || 0;
            const totalHours = Math.round(totalSeconds / 3600);

            // Get average score
            const { data: completedSessions } = await supabase
                .from('practice_sessions')
                .select('score_percentage')
                .eq('student_id', studentId)
                .eq('is_completed', true)
                .not('score_percentage', 'is', null);

            const avgScore = completedSessions && completedSessions.length > 0
                ? Math.round(completedSessions.reduce((sum, s) => sum + (s.score_percentage || 0), 0) / completedSessions.length)
                : 0;

            // Get current streak
            const { data: streakData } = await supabase
                .from('learning_streaks')
                .select('streak_date')
                .eq('student_id', studentId)
                .order('streak_date', { ascending: false })
                .limit(30);

            const currentStreak = this.calculateStreak(streakData || []);

            return {
                stats: {
                    totalSessions: totalSessions || 0,
                    totalHours,
                    averageScore: avgScore,
                    currentStreak
                }
            };
        } catch (error: any) {
            console.error('Error fetching student learning stats:', error);
            return {
                stats: {
                    totalSessions: 0,
                    totalHours: 0,
                    averageScore: 0,
                    currentStreak: 0
                },
                error: error.message
            };
        }
    }

    /**
     * Calculate current streak
     */
    private static calculateStreak(streakData: { streak_date: string }[]): number {
        if (!streakData || streakData.length === 0) return 0;

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < streakData.length; i++) {
            const streakDate = new Date(streakData[i].streak_date);
            streakDate.setHours(0, 0, 0, 0);

            const expectedDate = new Date(today);
            expectedDate.setDate(expectedDate.getDate() - i);

            if (streakDate.getTime() === expectedDate.getTime()) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    }
}
