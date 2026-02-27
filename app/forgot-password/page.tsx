'use client';

import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, GraduationCap } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (res.ok) setSuccess(true);
            else setError(data.error || 'Something went wrong.');
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-[#1B3A3A] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <GraduationCap className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-[#1B3A3A]">Forgot Password?</h1>
                    <p className="text-slate-400 text-xs font-medium mt-2">Enter your email and we'll send you a reset link.</p>
                </div>

                {success ? (
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto">
                            <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                        <h2 className="font-black text-[#1B3A3A] text-lg">Check Your Inbox!</h2>
                        <p className="text-slate-500 text-sm">If that email exists in our system, a reset link has been sent. Check your spam folder too.</p>
                        <Link href="/login" className="block mt-6 py-3 bg-[#1B3A3A] text-white font-black rounded-xl text-sm hover:bg-black transition-all">Back to Login</Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-xs font-bold">
                                <AlertCircle className="w-4 h-4" /> {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:border-[#4CAF50] focus:outline-none transition-all"
                                />
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="w-full py-4 bg-[#1B3A3A] text-white font-black rounded-2xl text-sm hover:bg-black transition-all flex items-center justify-center gap-2">
                            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Send Reset Link'}
                        </button>
                        <Link href="/login" className="flex items-center justify-center gap-2 text-slate-400 text-xs font-bold hover:text-[#1B3A3A] transition-colors mt-2">
                            <ArrowLeft className="w-3 h-3" /> Back to Login
                        </Link>
                    </form>
                )}
            </div>
        </div>
    );
}
