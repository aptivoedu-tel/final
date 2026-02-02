import { supabase } from '../supabase/client';
import { Database } from '../supabase/client';

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

                // For Institution Admins: Check Approval Status
                if (user.role === 'institution_admin') {
                    const { data: adminLink } = await supabase
                        .from('institution_admins')
                        .select('institution_id, institutions(name, status)')
                        .eq('user_id', user.id)
                        .single();

                    const instStatus = (adminLink as any)?.institutions?.status;

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
                    emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login?verified=true` : undefined
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
                await supabase
                    .from('institution_admins')
                    .upsert({
                        user_id: newUser.id,
                        institution_id: finalInstitutionId,
                    });
            }

            return { user: newUser as User, error: null };
        } catch (error) {
            console.error('Registration error:', error);
            return { user: null, error: 'An unexpected error occurred' };
        }
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
}
