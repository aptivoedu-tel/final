'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Shield, ArrowLeft } from 'lucide-react';
import { AuthService } from '@/lib/services/authService';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLoading } from '@/lib/context/LoadingContext';

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Check if user is authenticated (which happens after clicking the email link)
        const checkSession = async () => {
            const { data: { session } } = await AuthService.getSession();
            if (!session) {
                // If no session, they might have lost the partial session or clicked a link that didn't log them in properly.
                // However, we give Supabase a moment to process the hash fragment.
                setTimeout(async () => {
                    const { data: { session: retrySession } } = await AuthService.getSession();
                    if (!retrySession) {
                        setError('Invalid or expired recovery link. Please request a new one.');
                    }
                }, 1000);
            }
        };
        checkSession();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setGlobalLoading(true, 'Updating Secure Credentials...');

        try {
            const { error } = await AuthService.updatePassword(password);
            if (error) {
                setError(error);
            } else {
                setSuccess(true);
                setTimeout(() => {
                    router.push('/login');
                }, 3000);
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setGlobalLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] p-8 sm:p-12 border border-slate-100/50 animate-scale-in">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-[#EAF5E9] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <Lock className="w-8 h-8 text-[#4CAF50]" />
                    </div>
                    <h1 className="text-2xl font-black text-[#1B3A3A] tracking-tight">Set New Password</h1>
                    <p className="text-slate-500 font-medium text-sm mt-2">
                        Create a strong password for your account.
                    </p>
                </div>

                {success ? (
                    <div className="text-center space-y-6">
                        <div className="bg-green-50 rounded-2xl p-6 border border-green-100">
                            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                            <h3 className="font-bold text-green-800 text-lg">Password Updated!</h3>
                            <p className="text-green-700 text-sm mt-1">
                                Your password has been changed successfully. Redirecting to login...
                            </p>
                        </div>
                        <Link
                            href="/login"
                            className="block w-full py-4 bg-[#244D4D] text-white text-[12px] font-black rounded-2xl hover:bg-[#1B3A3A] transition-all shadow-xl shadow-[#244D4D]/10"
                        >
                            LOGIN NOW
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-start gap-3 text-sm font-medium">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-4 focus:ring-green-500/5 focus:border-[#4CAF50] transition-all font-medium placeholder:text-slate-300"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#4CAF50] transition-colors p-1"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="w-full pl-11 pr-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-4 focus:ring-green-500/5 focus:border-[#4CAF50] transition-all font-medium placeholder:text-slate-300"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-[#244D4D] text-white text-[12px] font-black rounded-2xl hover:bg-[#1B3A3A] hover:scale-[1.01] active:scale-[0.98] transition-all shadow-xl shadow-[#244D4D]/10 flex items-center justify-center gap-2"
                        >
                            {loading ? 'PROCESSING...' : 'UPDATE PASSWORD'}
                        </button>

                        <div className="text-center">
                            <Link href="/login" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold text-xs transition-colors">
                                <ArrowLeft className="w-3 h-3" />
                                Cancel
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
