'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { AuthService } from '@/lib/services/authService';
import { toast } from 'sonner';
import { useLoading } from '@/lib/context/LoadingContext';

function SetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const [user, setUser] = useState<any>(null);
    const next = searchParams.get('next') || '/dashboard';

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }
            setUser(user);

            // If user already has a password set (we can check metadata or a flag)
            if (user.user_metadata?.password_set) {
                router.push(next);
            }
        };
        checkUser();
    }, [router, next]);

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters long');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setGlobalLoading(true, 'Hardening Your Security...');

        try {
            // 1. Update password in Supabase Auth
            const { error: authError } = await supabase.auth.updateUser({
                password: password,
                data: { password_set: true } // Mark as set in metadata
            });

            if (authError) throw authError;

            // 2. Update users table (optional but good for syncing)
            const { error: dbError } = await supabase
                .from('users')
                .update({
                    password_hash: 'set-by-user', // Placeholder indicating it's no longer just synced
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (dbError) console.error('Error updating users table:', dbError);

            toast.success('Password set successfully!');

            // Sync session to local storage before redirecting
            await AuthService.syncSession();

            router.push(next);
        } catch (error: any) {
            toast.error(error.message || 'Failed to set password');
        } finally {
            setGlobalLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-3xl animate-pulse" />

            <div className="w-full max-w-md animate-scale-in">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-xl mb-6 relative group overflow-hidden">
                        <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-10 transition-opacity" />
                        <Lock className="w-10 h-10 text-primary animate-bounce-slow" />
                        <div className="absolute -bottom-1 -right-1">
                            <CheckCircle2 className="w-6 h-6 text-green-500 fill-white" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Secure Your Account</h1>
                    <p className="text-slate-500">
                        Please set a password for your account. You'll use this for future logins even with Google.
                    </p>
                </div>

                <div className="glass-surface p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary" />

                    <form onSubmit={handleSetPassword} className="space-y-6">
                        <div className="space-y-4">
                            {/* New Password */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-primary" />
                                    New Password
                                </label>
                                <div className="relative group">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input pr-12 pl-12 focus:ring-primary/20 transition-all border-slate-200"
                                        placeholder="Min. 6 characters"
                                        required
                                    />
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Confirm Password</label>
                                <div className="relative group">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="input pr-12 pl-12 focus:ring-primary/20 transition-all border-slate-200"
                                        placeholder="Repeat your password"
                                        required
                                    />
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                </div>
                            </div>
                        </div>

                        {/* Password Checklist */}
                        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                            <div className="flex items-center gap-2 text-xs">
                                <div className={`w-1.5 h-1.5 rounded-full ${password.length >= 6 ? 'bg-green-500' : 'bg-slate-300'}`} />
                                <span className={password.length >= 6 ? 'text-green-600' : 'text-slate-500'}>At least 6 characters</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <div className={`w-1.5 h-1.5 rounded-full ${password && password === confirmPassword ? 'bg-green-500' : 'bg-slate-300'}`} />
                                <span className={password && password === confirmPassword ? 'text-green-600' : 'text-slate-500'}>Passwords match</span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !password || password !== confirmPassword}
                            className={`btn btn-primary w-full h-12 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-[0.98] ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <span>Save Password...</span>
                            ) : (
                                <>
                                    <span>Save Password</span>
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="mt-8 text-center text-sm text-slate-500">
                    Aptivo uses end-to-end encryption to keep your credentials safe.
                </p>
            </div>
        </div>
    );
}

export default function SetPasswordPage() {
    return (
        <React.Suspense fallback={null}>
            <SetPasswordContent />
        </React.Suspense>
    );
}
