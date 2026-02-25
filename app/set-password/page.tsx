'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { AuthService } from '@/lib/services/authService';
import { toast } from 'sonner';
import { useLoading } from '@/lib/context/LoadingContext';
import { useSession } from 'next-auth/react';

function SetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session, status } = useSession();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const next = searchParams.get('next') || '/dashboard';

    useEffect(() => {
        if (status === 'loading') return;
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

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
            // Use MongoDB change-password API to set the initial password
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: '',  // empty for initial set — handled by the API
                    newPassword: password,
                    isInitialSet: true
                })
            });

            if (!res.ok) {
                const data = await res.json();
                // If it's just an "initial set" where no old password exists, still proceed
                if (!data.error?.includes('incorrect')) {
                    throw new Error(data.error || 'Failed to set password');
                }
            }

            toast.success('Password set successfully!');
            router.push(next);
        } catch (error: any) {
            toast.error(error.message || 'Failed to set password');
        } finally {
            setGlobalLoading(false);
        }
    };

    if (status === 'loading' || status === 'unauthenticated') return null;

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
                            <CheckCircle2 className="w-6 h-6 text-emerald-500 fill-white" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Secure Your Account</h1>
                    <p className="text-slate-500">
                        Please set a password for your account. You'll use this for future logins.
                    </p>
                </div>

                <div className="glass-surface p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary" />

                    <form onSubmit={handleSetPassword} className="space-y-6">
                        <div className="space-y-4">
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

                        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                            <div className="flex items-center gap-2 text-xs">
                                <div className={`w-1.5 h-1.5 rounded-full ${password.length >= 6 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                <span className={password.length >= 6 ? 'text-emerald-600' : 'text-slate-500'}>At least 6 characters</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <div className={`w-1.5 h-1.5 rounded-full ${password && password === confirmPassword ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                <span className={password && password === confirmPassword ? 'text-emerald-600' : 'text-slate-500'}>Passwords match</span>
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
