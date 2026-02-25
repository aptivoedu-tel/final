import { ProfileData, UpdateProfileData } from './profileService';

export class MongoProfileService {
    /**
     * Get user profile from MongoDB via our me API
     */
    static async getProfile(userId: string): Promise<{ profile: ProfileData | null; error?: string }> {
        try {
            const response = await fetch('/api/auth/me');
            if (!response.ok) throw new Error('Failed to fetch profile');

            const data = await response.json();
            return { profile: data.user };
        } catch (error: any) {
            console.error('Mongo getProfile error:', error);
            return { profile: null, error: error.message };
        }
    }

    /**
     * Update user profile in MongoDB
     */
    static async updateProfile(
        userId: string,
        updates: UpdateProfileData
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const response = await fetch('/api/auth/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
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
}
