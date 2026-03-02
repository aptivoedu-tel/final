import { signIn, signOut, getSession } from 'next-auth/react';

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

export class MongoAuthService {
    /**
     * Login using NextAuth credentials provider
     */
    static async login(credentials: LoginCredentials): Promise<{ user: any; error: string | null }> {
        try {
            console.log('[MongoAuthService] Attempting signIn for:', credentials.email);
            const result = await signIn('credentials', {
                redirect: false,
                email: credentials.email,
                password: credentials.password,
            });

            if (result?.error) {
                console.error('[MongoAuthService] signIn error type:', result.error);
                let userFriendlyError = 'Authentication failed';

                if (result.error === 'CredentialsSignin') userFriendlyError = 'Invalid email or password';
                else if (result.error === 'Configuration') userFriendlyError = 'Server Configuration Error (Secret missing in Vercel)';
                else userFriendlyError = `Login Error: ${result.error}`;

                return { user: null, error: userFriendlyError };
            }

            // Wait for session to be established (retry up to 3 times)
            let session = null;
            for (let i = 0; i < 3; i++) {
                session = await getSession();
                if (session?.user) break;
                await new Promise(r => setTimeout(r, 500 * (i + 1))); // Increased delay
            }

            if (session?.user) {
                try {
                    const response = await fetch('/api/auth/me');
                    if (response.ok) {
                        const data = await response.json();
                        if (typeof window !== 'undefined' && data.user) {
                            localStorage.setItem('aptivo_user', JSON.stringify(data.user));
                            return { user: data.user, error: null };
                        }
                    }
                } catch (apiErr) {
                    console.error('Failed to fetch /api/auth/me after login:', apiErr);
                }
                return { user: session.user, error: null };
            }

            return { user: null, error: 'Session could not be established. Please try again.' };
        } catch (error) {
            console.error('Mongo Login error:', error);
            return { user: null, error: 'An unexpected error occurred during login' };
        }
    }

    /**
     * Register using our MongoDB API
     */
    static async register(data: RegisterData): Promise<{ user: any; error: string | null }> {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: data.email,
                    password: data.password,
                    full_name: data.fullName,
                    role: data.role,
                    institution_id: data.institutionId,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                return { user: null, error: result.error || 'Registration failed' };
            }

            return { user: result.user, error: null };
        } catch (error) {
            console.error('Mongo Registration error:', error);
            return { user: null, error: 'An unexpected error occurred' };
        }
    }

    static async logout(): Promise<void> {
        await signOut({ redirect: false });
        if (typeof window !== 'undefined') {
            localStorage.removeItem('aptivo_user');
        }
    }

    static async loginWithProvider(provider: 'google'): Promise<{ error: string | null }> {
        try {
            await signIn(provider);
            return { error: null };
        } catch (error: any) {
            return { error: error.message };
        }
    }

    static async getSession() {
        return await getSession();
    }

    /**
     * Sync session from NextAuth to local state
     */
    static async syncSession(): Promise<any | null> {
        try {
            const session = await getSession();
            if (!session) {
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('aptivo_user');
                }
                return null;
            }

            // Session exists, try to get fresh profile info
            try {
                const response = await fetch('/api/auth/me');
                if (response.ok) {
                    const data = await response.json();
                    if (data.user && typeof window !== 'undefined') {
                        localStorage.setItem('aptivo_user', JSON.stringify(data.user));
                        return data.user;
                    }
                } else if (response.status === 403) {
                    // Forbidden = Unverified
                    console.log("[MongoAuthService] Sync blocked: User unverified. Logging out.");
                    await this.logout();
                    return null;
                }
            } catch (err) {
                console.warn('[MongoAuthService] Sync fetch failed, using local fallback', err);
            }

            // Fallback to what we have in localStorage or the basic session user
            if (typeof window !== 'undefined') {
                const local = localStorage.getItem('aptivo_user');
                if (local) return JSON.parse(local);
            }
            return session.user;

        } catch (error) {
            console.error('Mongo syncSession failed:', error);
            return null;
        }
    }
}
