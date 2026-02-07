'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Shield, GraduationCap, Chrome, Apple, User, Building2, ArrowRight, ArrowLeft } from 'lucide-react';
import { AuthService } from '@/lib/services/authService';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [infoMessage, setInfoMessage] = useState('');
    const [rememberMe, setRememberMe] = useState(false);

    // UI States
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [role, setRole] = useState<'student' | 'admin'>('student');

    // Slideshow State
    const [currentSlide, setCurrentSlide] = useState(0);
    const slides = [
        {
            image: "/login_illustration.png",
            title: "Aptivo Learning",
            description: "Empowering students and institutions through structured excellence."
        },
        {
            image: "/login_illustration_2.png",
            title: "University Access",
            description: "Browse curricula and master your institutional path with ease."
        },
        {
            image: "/login_illustration_3.png",
            title: "Achieve Success",
            description: "Track your progress and unlock new academic milestones."
        }
    ];

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await AuthService.getSession();
            if (session) {
                // Fetch fresh profile to ensure status (suspended/blocked) is accurate
                const { data: profile } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (profile) {
                    // Update localStorage with fresh data
                    localStorage.setItem('aptivo_user', JSON.stringify(profile));

                    // LOOP FIX: Verify status against fresh database record
                    if (profile.status === 'suspended' || profile.status === 'blocked') {
                        console.log("Session exists but account restricted. Staying on login.");
                        return;
                    }

                    // Proceed if active
                    let target = '/dashboard';
                    if (profile.role === 'super_admin') target = '/admin/dashboard';
                    else if (profile.role === 'institution_admin') target = '/institution-admin';
                    window.location.href = target;
                }
            }
        };
        checkSession();

        // Load Remembered Email
        const rememberedEmail = localStorage.getItem('aptivo_remembered_email');
        if (rememberedEmail) {
            setEmail(rememberedEmail);
            setRememberMe(true);
        }

        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('verified') === 'true') {
            setInfoMessage('Email verified successfully! You can now log in.');
        }

        const errorType = searchParams.get('error');
        if (errorType === 'suspended' || errorType === 'blocked') {
            setError('ACCESS DENIED: Your account has been restricted by your institution. Please contact your administrator for assistance.');
        }

        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000);

        return () => clearInterval(timer);
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

                // Role Validation: Prevent cross-login
                if (role === 'student' && (user.role === 'super_admin' || user.role === 'institution_admin')) {
                    setError('This account is an administrator account. Please use the Institution login option.');
                    setLoading(false);
                    return;
                }
                if (role === 'admin' && user.role === 'student') {
                    setError('This account is a student account. Please use the Student login option.');
                    setLoading(false);
                    return;
                }

                // Handle Remember Me
                if (rememberMe) {
                    localStorage.setItem('aptivo_remembered_email', email);
                } else {
                    localStorage.removeItem('aptivo_remembered_email');
                }

                setInfoMessage('Login successful! Entering dashboard...');
                if (typeof window !== 'undefined') {
                    localStorage.setItem('aptivo_user', JSON.stringify(user));
                }
                let target = '/dashboard';
                if (user.role === 'super_admin') target = '/admin/dashboard';
                else if (user.role === 'institution_admin') target = '/institution-admin';

                setTimeout(() => {
                    window.location.href = target;
                }, 800);
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred during login');
        } finally {
            setTimeout(() => setLoading(false), 2000);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
            <div className="w-full max-w-4xl max-h-[95vh] flex flex-col lg:flex-row bg-white rounded-none sm:rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden animate-scale-in border border-slate-100/50">

                {/* Left Side: Branding Slideshow */}
                <div className="hidden lg:flex lg:w-[42%] bg-[#EAF5E9] p-8 flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="relative z-10 w-full space-y-6">
                        <div className="relative h-[320px] w-full flex flex-col items-center justify-center">
                            {slides.map((slide, index) => (
                                <div
                                    key={index}
                                    className={`absolute inset-0 flex flex-col items-center transition-all duration-1000 ease-in-out transform ${index === currentSlide
                                        ? 'opacity-100 translate-x-0'
                                        : index < currentSlide
                                            ? 'opacity-0 -translate-x-full'
                                            : 'opacity-0 translate-x-full'
                                        }`}
                                >
                                    <div className="w-full aspect-square max-w-[240px] mx-auto relative group">
                                        <div className="absolute inset-0 bg-white/20 rounded-[2rem] blur-2xl group-hover:blur-3xl transition-all duration-700"></div>
                                        <div className="relative bg-white rounded-[2rem] shadow-xl p-5 border border-white/50">
                                            <img
                                                src={slide.image}
                                                alt={slide.title}
                                                className="w-full h-full object-contain"
                                                onError={(e) => {
                                                    e.currentTarget.src = "https://illustrations.popsy.co/green/remote-work.svg";
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-8 space-y-3">
                                        <div className="w-12 h-12 bg-[#4CAF50] rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-green-200">
                                            <GraduationCap className="w-7 h-7 text-white" />
                                        </div>
                                        <h2 className="text-xl font-black text-[#1B3A3A] tracking-tight">
                                            {slide.title}
                                        </h2>
                                        <p className="text-[#4A7272] text-[11px] font-medium leading-relaxed max-w-[200px] mx-auto opacity-75">
                                            {slide.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                    <div className="absolute top-[-15%] right-[-15%] w-64 h-64 bg-white/50 rounded-full blur-[80px]"></div>
                    <div className="absolute bottom-[-15%] left-[-15%] w-64 h-64 bg-white/50 rounded-full blur-[80px]"></div>
                </div>

                {/* Right Side: Form Content */}
                <div className="flex-1 p-6 sm:p-10 lg:p-14 flex flex-col items-center justify-center bg-white overflow-y-auto custom-scrollbar relative">
                    <Link
                        href="/"
                        className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors text-[10px] font-black uppercase tracking-widest group"
                    >
                        <div className="w-8 h-8 rounded-xl border border-slate-100 flex items-center justify-center group-hover:bg-slate-50 transition-all shadow-sm">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                        </div>
                        <span className="hidden sm:inline">Back to Home</span>
                    </Link>

                    <div className="w-full max-w-sm space-y-6">

                        <div className="text-center">
                            <h1 className="text-2xl font-black text-[#1B3A3A] mt-1 tracking-tight">
                                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                            </h1>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-2">
                                {mode === 'login' ? 'Security Portal' : 'Select Your Path'}
                            </p>
                        </div>

                        {/* Mode Controller */}
                        <div className="flex p-1 bg-slate-50 rounded-2xl relative border border-slate-100">
                            <button
                                onClick={() => setMode('login')}
                                className={`flex-1 py-2 text-[11px] font-black rounded-xl transition-all relative z-10 ${mode === 'login' ? 'text-[#1B3A3A]' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                LOGIN
                            </button>
                            <button
                                onClick={() => setMode('register')}
                                className={`flex-1 py-2 text-[11px] font-black rounded-xl transition-all relative z-10 ${mode === 'register' ? 'text-[#1B3A3A]' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                REGISTER
                            </button>
                            <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-xl shadow-sm border border-slate-100 transition-all duration-300 ${mode === 'login' ? 'left-1' : 'left-[calc(50%+2px)]'}`}></div>
                        </div>

                        {(infoMessage || error) && (
                            <div className={`p-3 rounded-2xl flex items-start gap-3 animate-fade-in text-[11px] font-medium leading-relaxed ${infoMessage ? 'bg-green-50 border border-green-100 text-green-700' : 'bg-red-50 border border-red-100 text-red-700'}`}>
                                {infoMessage ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                                {infoMessage || error}
                            </div>
                        )}

                        {/* Conditional Rendering: Login vs Register Views */}
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {mode === 'login' ? (
                                <div className="space-y-6">
                                    {/* Role Toggle */}
                                    <div className="flex p-0.5 bg-slate-100/50 rounded-xl border border-slate-50">
                                        <button
                                            onClick={() => setRole('student')}
                                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${role === 'student' ? 'bg-[#244D4D] text-white shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}
                                        >
                                            Student
                                        </button>
                                        <button
                                            onClick={() => setRole('admin')}
                                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${role === 'admin' ? 'bg-[#244D4D] text-white shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}
                                        >
                                            Institution
                                        </button>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{role === 'student' ? 'Student ID / Email' : 'Admin Email'}</label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    required
                                                    className="w-full pl-11 pr-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-4 focus:ring-green-500/5 focus:border-[#4CAF50] transition-all font-medium placeholder:text-slate-300"
                                                    placeholder={role === 'student' ? "student@university.edu" : "admin@aptivo.com"}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Password</label>
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

                                        <div className="flex items-center justify-between px-1">
                                            <label className="flex items-center gap-2.5 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={rememberMe}
                                                    onChange={(e) => setRememberMe(e.target.checked)}
                                                    className="w-4 h-4 rounded-md border-slate-200 text-[#4CAF50] focus:ring-[#4CAF50] transition-all cursor-pointer shadow-sm"
                                                />
                                                <span className="text-[11px] text-slate-500 font-bold group-hover:text-slate-900 transition-colors">Remember me</span>
                                            </label>
                                            <Link href="/forgot-password" className="text-[11px] text-[#4CAF50] hover:underline font-black">
                                                Forgot Password?
                                            </Link>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full py-4 bg-[#244D4D] text-white text-[12px] font-black rounded-2xl hover:bg-[#1B3A3A] hover:scale-[1.01] active:scale-[0.98] transition-all shadow-xl shadow-[#244D4D]/10 flex items-center justify-center gap-3"
                                        >
                                            {loading ? (
                                                <div className="w-5 h-5 border-[3px] border-white/20 border-t-white rounded-full animate-spin"></div>
                                            ) : (
                                                <>
                                                    <Shield className="w-4 h-4" />
                                                    <span>SIGN IN TO PORTAL</span>
                                                </>
                                            )}
                                        </button>
                                    </form>

                                    <div className="space-y-4 pt-2">
                                        <div className="relative">
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-slate-100"></div>
                                            </div>
                                            <div className="relative flex justify-center">
                                                <span className="bg-white px-3 text-[9px] font-black text-slate-300 uppercase tracking-widest">Connect with</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-center gap-3">
                                            {/* Google Login */}
                                            <button
                                                type="button"
                                                onClick={() => AuthService.loginWithProvider('google')}
                                                className="w-full py-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98] shadow-sm group"
                                            >
                                                <Chrome className="w-5 h-5 text-slate-400 group-hover:text-[#EA4335] transition-colors" />
                                                <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900">Sign in with Google</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-5 py-4">
                                    <div className="text-center space-y-2 mb-6">
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                            Choose your account type below to get started with the Aptivo ecosystem.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <button
                                            onClick={() => window.location.href = '/register'}
                                            className="group w-full p-5 bg-white border border-slate-100 text-left rounded-[1.5rem] hover:border-[#4CAF50] hover:shadow-xl hover:shadow-green-500/5 transition-all active:scale-[0.98]"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center group-hover:bg-[#4CAF50] transition-colors">
                                                    <User className="w-6 h-6 text-[#4CAF50] group-hover:text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-black text-[#1B3A3A]">Student Account</h4>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Start Learning Today</p>
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#4CAF50] group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => window.location.href = '/register?role=institution_admin'}
                                            className="group w-full p-5 bg-white border border-slate-100 text-left rounded-[1.5rem] hover:border-[#4CAF50] hover:shadow-xl hover:shadow-green-500/5 transition-all active:scale-[0.98]"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center group-hover:bg-[#4CAF50] transition-colors">
                                                    <Building2 className="w-6 h-6 text-teal-500 group-hover:text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-black text-[#1B3A3A]">Institution Portal</h4>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Management & Scale</p>
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#4CAF50] group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </button>
                                    </div>

                                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 text-center">
                                        <p className="text-[10px] text-slate-500 font-medium">
                                            Need custom solutions? <Link href="#" className="text-[#4CAF50] font-black hover:underline underline-offset-2">Contact Sales</Link>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="text-center pt-2">
                            <p className="text-[11px] font-bold text-slate-500">
                                {mode === 'login' ? "Don't have an account?" : "Already joined the community?"} {' '}
                                <button
                                    onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                                    className="text-[#4CAF50] hover:underline font-black"
                                >
                                    {mode === 'login' ? 'Join Now' : 'Sign In'}
                                </button>
                            </p>
                        </div>

                        {/* Footer Links */}
                        <div className="text-center pt-4 border-t border-slate-100">
                            <p className="text-[10px] text-slate-400 font-medium">
                                By continuing, you agree to our{' '}
                                <Link href="/terms" className="text-[#4CAF50] hover:underline font-bold">
                                    Terms
                                </Link>
                                {' '}and{' '}
                                <Link href="/privacy" className="text-[#4CAF50] hover:underline font-bold">
                                    Privacy Policy
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Blocked Overlay */}
                {(new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('error') === 'suspended') && (
                    <div className="absolute inset-0 z-[100] bg-white/95 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-500">
                        <div className="max-w-md w-full text-center space-y-8">
                            <div className="relative inline-block">
                                <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-3xl animate-pulse" />
                                <div className="relative w-24 h-24 bg-rose-50 rounded-[2.5rem] border-4 border-rose-100 flex items-center justify-center mx-auto text-rose-500 shadow-xl">
                                    <Shield className="w-12 h-12" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">Identity Restricted</h2>
                                <p className="text-slate-500 font-medium leading-relaxed">
                                    It appears your access has been <span className="text-rose-600 font-bold uppercase tracking-widest text-[10px]">Suspended</span> by your institution.
                                    This usually happens due to administrative updates or missing credentials.
                                </p>
                            </div>

                            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 text-left space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Protocol Guidance</p>
                                <ul className="space-y-3">
                                    <li className="flex gap-3 text-xs font-bold text-slate-600">
                                        <div className="w-5 h-5 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">1</div>
                                        <span>Contact your Institutional IT or Admin center.</span>
                                    </li>
                                    <li className="flex gap-3 text-xs font-bold text-slate-600">
                                        <div className="w-5 h-5 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">2</div>
                                        <span>Provide your registered email: {email || 'associated with your account'}</span>
                                    </li>
                                </ul>
                            </div>

                            <button
                                onClick={async () => {
                                    await AuthService.logout();
                                    window.location.href = '/login';
                                }}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl"
                            >
                                Return & Sign Out
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
