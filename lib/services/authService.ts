import { supabase } from '../supabase/client';
import { Database } from '../supabase/client';

// Determine the base URL for redirects (Verification, Password Reset, OAuth)
// Prioritizes NEXT_PUBLIC_SITE_URL or NEXT_PUBLIC_APP_URL (Production) over window.location.origin (Localhost)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');

type User = Database['public']['Tables']['users']['Row'];

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
     * User login - handles authentication
     */
    static async login(credentials: LoginCredentials): Promise<{ user: User | null; error: string | null }> {
        try {
            // 1. Perform Auth Check
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: credentials.email,
                password: credentials.password,
            });

            if (authError) {
                return { user: null, error: 'Invalid email or password' };
            }

            // 2. Fetch User Profile
            let userResult = await supabase
                .from('users')
                .select('*')
                .eq('id', authData.user.id)
                .single();

            // 3. Resilient Profile Sync: If not found, sync it
            if (!userResult.data) {
                console.log("Profile not found for authenticated user, attempting sync...");

                // Map metadata role to DB enum safely
                const rawRole = authData.user.user_metadata?.role || 'student';
                let validRole: 'student' | 'institution_admin' | 'super_admin' = 'student';

                if (rawRole === 'super_admin' || rawRole === 'admin') validRole = 'super_admin';
                else if (rawRole === 'institution_admin' || rawRole === 'institution') validRole = 'institution_admin';
                else validRole = 'student';

                // Ensure no conflicting email exists
                await supabase.from('users').delete().eq('email', authData.user.email);

                const { data: newUser, error: syncError } = await supabase
                    .from('users')
                    .insert({
                        id: authData.user.id,
                        email: authData.user.email,
                        full_name: authData.user.user_metadata?.full_name || 'Aptivo User',
                        role: validRole,
                        status: 'active',
                        email_verified: true,
                        password_hash: 'synced-from-auth'
                    })
                    .select()
                    .single();

                if (syncError) {
                    console.error("Critical Sync Error:", syncError);
                    return { user: null, error: `Profile sync failed: ${syncError.message} (${syncError.code})` };
                }
                userResult.data = newUser;
            }

            const user = userResult.data;
            console.log("AuthService resolved user role:", user.role);

            // 3. Strict Verification & Approval Checks

            // SUPER ADMIN BYPASS: Always allow login for super admins
            if (user.role === 'super_admin') {
                console.log("Super Admin detected - bypassing checks");
                user.status = 'active'; // Force active status in memory
            } else {
                // For Students: Check Email Verification
                if (user.role === 'student' && !authData.user.email_confirmed_at) {
                    await supabase.auth.signOut();
                    return { user: null, error: 'Please verify your email before logging in. Check your inbox for the link.' };
                }

                // For Institution Admins: Check Approval Status & Sync ID
                if (user.role === 'institution_admin') {
                    const { data: adminLink } = await supabase
                        .from('institution_admins')
                        .select('institution_id, institutions(name, status)')
                        .eq('user_id', user.id)
                        .maybeSingle();

                    if (adminLink) {
                        const instId = adminLink.institution_id;
                        const instStatus = (adminLink as any)?.institutions?.status;

                        // Auto-sync missing institution_id in users table
                        if (!user.institution_id && instId) {
                            console.log("Syncing missing institution_id to users table...");
                            await supabase.from('users').update({ institution_id: instId }).eq('id', user.id);
                            user.institution_id = instId;
                        }

                        if (instStatus === 'pending') {
                            await supabase.auth.signOut();
                            return { user: null, error: 'Your institution registration is pending approval. This usually takes up to 7 days.' };
                        }

                        if (instStatus === 'rejected') {
                            await supabase.auth.signOut();
                            return { user: null, error: 'Your institution registration request was rejected. Please contact support.' };
                        }

                        if (instStatus === 'blocked') {
                            await supabase.auth.signOut();
                            return { user: null, error: 'This institution account has been blocked. Access is denied.' };
                        }
                    } else if (!user.institution_id) {
                        // User is institution_admin but has no link?
                        console.warn("Institution Admin has no linked institution record.");
                    }
                }

                // If account is globally suspended
                if (user.status === 'suspended') {
                    await supabase.auth.signOut();
                    return { user: null, error: 'Your account has been suspended. Please contact support.' };
                }
            }

            // Store user session
            if (typeof window !== 'undefined') {
                localStorage.setItem('aptivo_user', JSON.stringify(user));
                localStorage.setItem('aptivo_session', JSON.stringify(authData.session));
            }

            return { user, error: null };
        } catch (error) {
            console.error('Login error:', error);
            return { user: null, error: 'An error occurred during login' };
        }
    }

    /**
     * User registration
     */
    static async register(data: RegisterData): Promise<{ user: User | null; error: string | null }> {
        try {
            // Create auth user in Supabase Auth
            const { data: authUser, error: authError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        full_name: data.fullName,
                        role: data.role,
                    },
                    emailRedirectTo: `${SITE_URL}/login?verified=true`
                }
            });

            if (authError) {
                return { user: null, error: authError.message };
            }

            if (!authUser.user) {
                return { user: null, error: 'Registration failed - no user returned' };
            }

            // Handling New Institution Creation
            let finalInstitutionId = data.institutionId;

            if (data.role === 'institution_admin' && !data.institutionId && data.institutionName) {
                const { data: newInst, error: instError } = await supabase
                    .from('institutions')
                    .insert([{
                        name: data.institutionName,
                        institution_type: data.institutionType || 'college',
                        status: 'pending',
                        contact_email: data.email,
                        admin_name: data.fullName,
                        admin_email: data.email
                    }])
                    .select()
                    .single();

                if (instError) {
                    return { user: null, error: 'User created but failed to register institution. Please contact support.' };
                }
                finalInstitutionId = newInst.id;
            }

            // We perform an UPSERT into the users table 
            // This works whether the trigger created it first or we create it here
            const { data: newUser, error: insertError } = await supabase
                .from('users')
                .upsert({
                    id: authUser.user.id,
                    email: data.email,
                    full_name: data.fullName,
                    role: data.role,
                    is_solo: data.isSolo || false,
                    status: 'active',
                    email_verified: false,
                    password_hash: 'synced-from-auth'
                })
                .select()
                .single();

            if (insertError) {
                console.error('Profile upsert error:', insertError);
                // We don't delete the user because they exist in Auth now
                return { user: null, error: 'Registration successful but profile sync failed. Please try logging in.' };
            }

            // Link admin to institution
            if (data.role === 'institution_admin' && finalInstitutionId) {
                console.log('Attempting to link admin to institution:', { userId: authUser.user.id, instId: finalInstitutionId });
                const { error: linkError } = await supabase
                    .from('institution_admins')
                    .upsert({
                        user_id: authUser.user.id,
                        institution_id: finalInstitutionId,
                    });

                if (linkError) {
                    console.error('FAILED TO CREATE INSTITUTION ADMIN LINK:', linkError);
                    // We return success but with a warning in logs
                } else {
                    console.log('Successfully created institution admin link');
                }

                // ALSO update the users table directly right now
                await supabase
                    .from('users')
                    .update({ institution_id: finalInstitutionId })
                    .eq('id', authUser.user.id);
            }

            return { user: newUser as User, error: null };
        } catch (error) {
            console.error('Registration error:', error);
            return { user: null, error: 'An unexpected error occurred' };
        }
    }

    static async getInstitutionId(userId: string): Promise<number | null> {
        // 1. Try primary profile
        const { data: profile } = await supabase
            .from('users')
            .select('institution_id')
            .eq('id', userId)
            .single();

        if (profile?.institution_id) return profile.institution_id;

        // 2. Fallback to institution_admins table
        const { data: adminLink } = await supabase
            .from('institution_admins')
            .select('institution_id')
            .eq('user_id', userId)
            .maybeSingle();

        if (adminLink?.institution_id) {
            const instId = adminLink.institution_id;
            // Proactive sync (might fail if RLS is tight, but that's okay)
            await supabase.from('users').update({ institution_id: instId }).eq('id', userId);
            return instId;
        }

        return null;
    }

    static async getSession() {
        return await supabase.auth.getSession();
    }

    static getCurrentUser(): User | null {
        if (typeof window === 'undefined') return null;
        const userStr = localStorage.getItem('aptivo_user');
        if (!userStr) return null;
        try {
            return JSON.parse(userStr);
        } catch {
            return null;
        }
    }

    static async logout(): Promise<void> {
        await supabase.auth.signOut();
        if (typeof window !== 'undefined') {
            localStorage.removeItem('aptivo_user');
            localStorage.removeItem('aptivo_session');
        }
    }

    /**
     * Send password reset email
     */
    static async resetPassword(email: string): Promise<{ error: string | null }> {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${SITE_URL}/update-password`,
        });
        return { error: error ? error.message : null };
    }

    /**
     * Update user password (used after reset link login)
     */
    static async updatePassword(password: string): Promise<{ error: string | null }> {
        const { error } = await supabase.auth.updateUser({ password });
        return { error: error ? error.message : null };
    }

    /**
     * Login with OAuth Provider
     */
    static async loginWithProvider(provider: 'google' | 'azure' | 'apple'): Promise<{ error: string | null }> {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: `${SITE_URL}/auth/callback`,
            }
        });
        return { error: error ? error.message : null };
    }

    /**
     * Sync session from Supabase to LocalStorage (for OAuth flows)
     */
    static async syncSession(): Promise<User | null> {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error || !session) {
                if (typeof window !== 'undefined' && (error?.message?.includes('Refresh Token') || error?.message?.includes('not found'))) {
                    console.warn("Auth session invalid, clearing local state.");
                    localStorage.removeItem('aptivo_user');
                    localStorage.removeItem('aptivo_session');
                }
                return null;
            }

            const stored = this.getCurrentUser();
            if (stored && stored.id === session.user.id) return stored;

            let { data: user } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (!user) {
                const { data: newUser } = await supabase.from('users').insert({
                    id: session.user.id,
                    email: session.user.email!,
                    full_name: session.user.user_metadata.full_name || 'User',
                    role: 'student',
                    status: 'active',
                    email_verified: true,
                    is_solo: true
                }).select().single();
                user = newUser;
            }

            if (user && typeof window !== 'undefined') {
                localStorage.setItem('aptivo_user', JSON.stringify(user));
                localStorage.setItem('aptivo_session', JSON.stringify(session));
            }

            return user;
        } catch (error) {
            console.error('Session sync failed:', error);
            if (typeof window !== 'undefined') {
                localStorage.removeItem('aptivo_user');
                localStorage.removeItem('aptivo_session');
            }
            return null;
        }
    }
}
