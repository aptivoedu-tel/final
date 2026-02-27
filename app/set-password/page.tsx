'use client';

import React, { useState, Suspense } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function SetPasswordForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirm) { setError('Passwords do not match.'); return; }
        if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/set-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });
            const data = await res.json();
            if (res.ok) setSuccess(true);
            else setError(data.error || 'Failed to set password.');
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="text-center space-y-4">
                <div className="p-4 bg-amber-50 rounded-2xl text-amber-700 text-sm font-bold">Link is missing or invalid. Please check your email for the correct link.</div>
                <Link href="/login" className="block text-[#4CAF50] font-black text-sm hover:underline">Back to Login</Link>
            </div>
        );
    }

    return success ? (
        <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="font-black text-[#1B3A3A] text-lg">Password Set!</h2>
            <p className="text-slate-500 text-sm">You can now log in with your email and the new password, or continue using Google.</p>
            <Link href="/login" className="block mt-4 py-3 bg-[#1B3A3A] text-white font-black rounded-xl text-sm hover:bg-black transition-all">Go to Login</Link>
        </div>
    ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-xs font-bold">
                You signed up with Google. Setting a password lets you also log in with email.
            </div>
            {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-xs font-bold">
                    <AlertCircle className="w-4 h-4" /> {error}
                </div>
            )}
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Password</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="Min. 8 characters" className="w-full pl-11 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:border-[#4CAF50] focus:outline-none transition-all" />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#4CAF50]">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirm Password</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input type={showPw ? 'text' : 'password'} required value={confirm} onChange={e => setConfirm(e.target.value)}
                        placeholder="Repeat password" className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:border-[#4CAF50] focus:outline-none transition-all" />
                </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-4 bg-[#1B3A3A] text-white font-black rounded-2xl text-sm hover:bg-black transition-all flex items-center justify-center gap-2">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Set Password'}
            </button>
        </form>
    );
}

export default function SetPasswordPage() {
    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-[#1B3A3A] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <GraduationCap className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-[#1B3A3A]">Final Step</h1>
                    <p className="text-slate-400 text-xs font-medium mt-2">To complete your registration, please set a password.</p>
                </div>
                <Suspense fallback={<div className="text-center text-slate-400 text-sm">Loading...</div>}>
                    <SetPasswordForm />
                </Suspense>
            </div>
        </div>
    );
}
