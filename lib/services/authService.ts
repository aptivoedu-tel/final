// MongoDB-only AuthService — All Supabase dependencies removed.
// All logic is routed through MongoAuthService (NextAuth.js + MongoDB).

import { MongoAuthService } from './mongoAuthService';

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    fullName: string;
    role: 'student' | 'institution_admin';
    institutionId?: number;
    institutionName?: string;
    institutionType?: string;
    isSolo?: boolean;
}

export class AuthService {
    /**
     * Login with email/password via NextAuth + MongoDB
     */
    static async login(credentials: LoginCredentials): Promise<{ user: any | null; error: string | null }> {
        return MongoAuthService.login(credentials);
    }

    /**
     * Register a new user via MongoDB API
     */
    static async register(data: RegisterData): Promise<{ user: any | null; error: string | null }> {
        return MongoAuthService.register(data);
    }

    /**
     * Get institution ID for a user from MongoDB
     */
    static async getInstitutionId(userId: string): Promise<number | null> {
        try {
            const stored = this.getCurrentUser();
            if (stored?.id === userId && stored.institution_id) return stored.institution_id;

            const res = await fetch(`/api/mongo/profile?user_id=${userId}`);
            if (res.ok) {
                const { data } = await res.json();
                return data?.institution_id || null;
            }
        } catch (e) {
            console.error('Failed to fetch institution_id from MongoDB:', e);
        }
        return null;
    }

    /**
     * Get current NextAuth session
     */
    static async getSession() {
        const session = await MongoAuthService.getSession();
        return { data: { session } };
    }

    /**
     * Get the current user from localStorage (set after login)
     */
    static getCurrentUser(): any | null {
        if (typeof window === 'undefined') return null;
        const userStr = localStorage.getItem('aptivo_user');
        if (!userStr) return null;
        try {
            return JSON.parse(userStr);
        } catch {
            return null;
        }
    }

    /**
     * Sign out the current user
     */
    static async logout(): Promise<void> {
        return MongoAuthService.logout();
    }

    /**
     * Login with OAuth provider (Google) via NextAuth
     */
    static async loginWithProvider(provider: 'google' | 'azure' | 'apple'): Promise<{ error: string | null }> {
        if (provider === 'google') return MongoAuthService.loginWithProvider('google');
        return { error: 'Only Google OAuth is supported in this configuration.' };
    }

    /**
     * Sync session from NextAuth to local state
     */
    static async syncSession(): Promise<any | null> {
        return MongoAuthService.syncSession();
    }

    /**
     * Password reset - not supported without Supabase.
     * Placeholder that returns an informative error.
     */
    static async resetPassword(_email: string): Promise<{ error: string | null }> {
        return { error: 'Password reset is handled by your email provider. Please contact support.' };
    }

    /**
     * Update password - not supported without Supabase.
     * Placeholder that returns an informative error.
     */
    static async updatePassword(_password: string): Promise<{ error: string | null }> {
        return { error: 'Password update via this method is not supported. Please contact support.' };
    }
}
