'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, User, Building2 } from 'lucide-react';
import { AuthService } from '@/lib/services/authService';
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [infoMessage, setInfoMessage] = useState('');
    const [role, setRole] = useState<'student' | 'admin'>('student');

    useEffect(() => {
        const checkSession = async () => {
            // Check actual Supabase session, not just localStorage
            const { data: { session } } = await AuthService.getSession();

            if (session) {
                const user = AuthService.getCurrentUser();
                if (user) {
                    let target = '/dashboard';
                    if (user.role === 'super_admin') {
                        target = '/admin/dashboard';
                    } else if (user.role === 'institution_admin') {
                        target = '/institution-admin';
                    }
                    window.location.href = target;
                }
            } else {
                // If no session but we have local user, it's stale
                if (localStorage.getItem('aptivo_user')) {
                    localStorage.removeItem('aptivo_user');
                    localStorage.removeItem('aptivo_session');
                }
            }
        };

        checkSession();

        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('verified') === 'true') {
            setInfoMessage('Email verified successfully! You can now log in.');
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setInfoMessage('');
        setLoading(true);

        try {
            const result = await AuthService.login({ email, password });

            if (result.error) {
                setError(result.error);
                setLoading(false);
                return;
            }

            if (result.user) {
                const user = result.user;
                console.log("Login Success. Role:", user.role);
                setInfoMessage('Login successful! Entering dashboard...');

                // FORCE SYNC
                if (typeof window !== 'undefined') {
                    localStorage.setItem('aptivo_user', JSON.stringify(user));
                }

                // DETERMINE DESTINATION
                let target = '/dashboard';
                if (user.role === 'super_admin') {
                    target = '/admin/dashboard';
                } else if (user.role === 'institution_admin') {
                    target = '/institution-admin';
                }

                console.log("Navigating to:", target);

                // Wait for success message to be seen and cookies to settle
                setTimeout(() => {
                    window.location.href = target;
                }, 800);
            }
        } catch (err: any) {
            console.error("Critical login error:", err);
            setError(err.message || 'An unexpected error occurred during login');
        } finally {
            // Only stop loading if we haven't navigated away
            setTimeout(() => setLoading(false), 2000);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-mesh-gradient opacity-30"></div>

            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 md:p-10 animate-scale-in relative border border-gray-100">

                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">Welcome Back</h1>
                    <p className="text-slate-500 font-medium">Sign in to access your Aptivo portal</p>
                </div>

                {/* Role Toggle */}
                <div className="flex p-1 bg-slate-100 rounded-2xl mb-8">
                    <button
                        type="button"
                        onClick={() => setRole('student')}
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${role === 'student'
                            ? 'bg-white text-slate-900 shadow-md'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Student
                    </button>
                    <button
                        type="button"
                        onClick={() => setRole('admin')}
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${role === 'admin'
                            ? 'bg-white text-slate-900 shadow-md'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Institution
                    </button>
                </div>

                {infoMessage && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-2xl flex items-start gap-3 animate-fade-in text-green-700 text-sm font-medium">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        {infoMessage}
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-fade-in text-red-700 text-sm font-medium">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Email Address
                        </label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-4 pl-12 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium"
                                placeholder={role === 'student' ? "student@university.edu" : "admin@aptivo.com"}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Password
                        </label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-4 pl-12 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium pr-12"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" className="w-5 h-5 text-slate-900 border-slate-300 rounded-lg focus:ring-slate-900 transition-all" />
                            <span className="text-sm text-slate-500 font-bold group-hover:text-slate-700 transition-colors">Stay signed in</span>
                        </label>
                        <a href="#" className="text-sm text-slate-900 hover:underline font-black">
                            Forgot password?
                        </a>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 bg-slate-900 text-white text-base font-black rounded-2xl hover:bg-black hover:scale-[1.01] active:scale-95 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
                    >
                        {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Sign In to Portal'}
                    </button>
                </form>

                <div className="mt-12 pt-8 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center mb-8">New to Aptivo?</p>
                    <div className="grid grid-cols-1 gap-4">
                        <button
                            onClick={() => window.location.href = '/register'}
                            className="w-full py-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-3 shadow-sm active:scale-[0.98]"
                        >
                            <User className="w-5 h-5 text-slate-400" />
                            Create Student Account
                        </button>
                        <button
                            onClick={() => window.location.href = '/register?role=institution_admin'}
                            className="w-full py-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-3 shadow-sm active:scale-[0.98]"
                        >
                            <Building2 className="w-5 h-5 text-slate-400" />
                            Register Your Institution
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
