'use client';

import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { AuthService } from '@/lib/services/authService';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error } = await AuthService.resetPassword(email);
            if (error) {
                setError(error);
            } else {
                setSuccess(true);
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] p-8 sm:p-12 border border-slate-100/50 animate-scale-in">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-[#EAF5E9] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <Shield className="w-8 h-8 text-[#4CAF50]" />
                    </div>
                    <h1 className="text-2xl font-black text-[#1B3A3A] tracking-tight">Forgot Password?</h1>
                    <p className="text-slate-500 font-medium text-sm mt-2">
                        Enter your email address to receive a password reset link.
                    </p>
                </div>

                {success ? (
                    <div className="text-center space-y-6">
                        <div className="bg-green-50 rounded-2xl p-6 border border-emerald-100">
                            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                            <h3 className="font-bold text-emerald-800 text-lg">Check your email</h3>
                            <p className="text-emerald-700 text-sm mt-1">
                                We've sent a password reset link to <span className="font-bold">{email}</span>
                            </p>
                        </div>
                        <Link
                            href="/login"
                            className="block w-full py-4 bg-[#244D4D] text-white text-[12px] font-black rounded-2xl hover:bg-[#1B3A3A] transition-all shadow-xl shadow-[#244D4D]/10"
                        >
                            RETURN TO LOGIN
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
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full pl-11 pr-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#4CAF50] transition-all font-medium placeholder:text-slate-300"
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-[#244D4D] text-white text-[12px] font-black rounded-2xl hover:bg-[#1B3A3A] hover:scale-[1.01] active:scale-[0.98] transition-all shadow-xl shadow-[#244D4D]/10 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-[3px] border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                'SEND RESET LINK'
                            )}
                        </button>

                        <div className="text-center">
                            <Link href="/login" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold text-xs transition-colors">
                                <ArrowLeft className="w-3 h-3" />
                                Back to Login
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
