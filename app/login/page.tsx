'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Shield, GraduationCap, Chrome, Apple, User, Building2, ArrowRight, ArrowLeft } from 'lucide-react';
import { AuthService } from '@/lib/services/authService';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useLoading } from '@/lib/context/LoadingContext';


export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { setLoading: setGlobalLoading, isLoading } = useLoading();

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
                const { data: profile } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (profile) {
                    localStorage.setItem('aptivo_user', JSON.stringify(profile));
                    if (profile.status === 'suspended' || profile.status === 'blocked') return;

                    let target = '/dashboard';
                    if (profile.role === 'super_admin') target = '/admin/dashboard';
                    else if (profile.role === 'institution_admin') target = '/institution-admin';
                    window.location.href = target;
                }
            }
        };
        checkSession();

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
            setError('ACCESS DENIED: Your account has been restricted by your institution.');
        }

        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000);

        return () => clearInterval(timer);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setGlobalLoading(true, 'Verifying Credentials...');

        try {
            const result = await AuthService.login({ email, password });
            if (result.error) {
                setError(result.error);
                setGlobalLoading(false);
                return;
            }

            if (result.user) {
                const user = result.user;
                if (role === 'student' && (user.role === 'super_admin' || user.role === 'institution_admin')) {
                    setError('This is an administrator account. Please use Institution login.');
                    setGlobalLoading(false);
                    return;
                }
                if (role === 'admin' && user.role === 'student') {
                    setError('This is a student account. Please use Student login.');
                    setGlobalLoading(false);
                    return;
                }

                if (rememberMe) localStorage.setItem('aptivo_remembered_email', email);
                else localStorage.removeItem('aptivo_remembered_email');

                setInfoMessage('Login successful! Entering dashboard...');
                localStorage.setItem('aptivo_user', JSON.stringify(user));

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
            setTimeout(() => setGlobalLoading(false), 2000);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
            <div className="w-full max-w-5xl max-h-[95vh] flex flex-col lg:flex-row bg-white rounded-none sm:rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden animate-scale-in border border-slate-100/50">

                {/* Left Side: Branding */}
                <div className="hidden lg:flex lg:w-[40%] bg-[#EAF5E9] p-8 flex-col items-center justify-center text-center relative overflow-hidden">
                    <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-[#1B3A3A] transition-all text-[10px] font-black uppercase tracking-widest z-50">
                        <ArrowLeft className="w-4 h-4" />
                        <span>Home</span>
                    </Link>

                    <div className="relative z-10 w-full space-y-6">
                        <div className="relative h-[320px] w-full flex items-center justify-center">
                            {slides.map((slide, index) => (
                                <div key={index} className={`absolute inset-0 flex flex-col items-center transition-all duration-1000 transform ${index === currentSlide ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12 pointer-events-none'}`}>
                                    <div className="w-full aspect-square max-w-[200px] mb-8 bg-white rounded-[2rem] shadow-xl p-5 border border-white/50">
                                        <img src={slide.image} alt={slide.title} className="w-full h-full object-contain" />
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-xl font-black text-[#1B3A3A] tracking-tight">{slide.title}</h2>
                                        <p className="text-[#4A7272] text-[11px] font-medium leading-relaxed max-w-[200px] mx-auto opacity-75">{slide.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="flex-1 p-6 sm:p-10 lg:p-14 flex flex-col items-center justify-center bg-white overflow-y-auto custom-scrollbar relative">
                    <div className="w-full max-w-[520px] space-y-8">
                        <div className="text-center space-y-5 mb-2">
                            <div className="relative inline-block pb-4">
                                <div className="absolute inset-0 bg-[#4CAF50]/10 rounded-full blur-2xl animate-pulse"></div>
                                <div className="relative w-20 h-20 bg-[#1B3A3A] rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-slate-200 border-4 border-white transform hover:scale-105 transition-transform duration-500">
                                    <GraduationCap className="w-10 h-10 text-white" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h1 className="text-4xl font-black text-[#1B3A3A] tracking-tighter uppercase italic">
                                    Aptivo<span className="text-[#4CAF50]">.</span>
                                </h1>
                                <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em] opacity-80">
                                    Institutional Portal Gateway
                                </p>
                            </div>
                        </div>

                        {/* Mode Switcher */}
                        <div className="flex p-1 bg-slate-50 rounded-[2rem] border border-slate-100 relative">
                            <button onClick={() => setMode('login')} className={`flex-1 py-3 text-[11px] font-black rounded-[1.8rem] transition-all relative z-10 ${mode === 'login' ? 'text-white' : 'text-slate-400'}`}>LOGIN</button>
                            <button onClick={() => setMode('register')} className={`flex-1 py-3 text-[11px] font-black rounded-[1.8rem] transition-all relative z-10 ${mode === 'register' ? 'text-white' : 'text-slate-400'}`}>REGISTER</button>
                            <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#244D4D] rounded-[1.8rem] shadow-lg transition-all duration-300 ${mode === 'login' ? 'left-1' : 'left-[calc(50%+2px)]'}`}></div>
                        </div>

                        {(infoMessage || error) && (
                            <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold leading-relaxed animate-in fade-in slide-in-from-top-2 ${infoMessage ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                {infoMessage ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
                                {infoMessage || error}
                            </div>
                        )}

                        {mode === 'login' ? (
                            <div className="space-y-8">
                                {/* Role Toggle */}
                                <div className="flex p-1 bg-slate-100/50 rounded-[2rem] border border-slate-100">
                                    <button onClick={() => setRole('student')} className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-[1.8rem] transition-all ${role === 'student' ? 'bg-white text-[#1B3A3A] shadow-md' : 'text-slate-400'}`}>Student</button>
                                    <button onClick={() => setRole('admin')} className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-[1.8rem] transition-all ${role === 'admin' ? 'bg-white text-[#1B3A3A] shadow-md' : 'text-slate-400'}`}>Institution</button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{role === 'student' ? 'Student ID / Email' : 'Admin Email'}</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#4CAF50] transition-colors" />
                                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full pl-11 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] font-medium focus:bg-white focus:border-[#4CAF50] focus:ring-4 focus:ring-green-500/5 transition-all outline-none" placeholder={role === 'student' ? "student@university.edu" : "admin@aptivo.com"} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Password</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#4CAF50] transition-colors" />
                                            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full pl-11 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] font-medium focus:bg-white focus:border-[#4CAF50] focus:ring-4 focus:ring-green-500/5 transition-all outline-none" placeholder="••••••••" />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#4CAF50] transition-colors p-1">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between px-1">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded border-slate-200 text-[#4CAF50] focus:ring-[#4CAF50] cursor-pointer" />
                                            <span className="text-[11px] text-slate-500 font-bold group-hover:text-[#1B3A3A]">Remember me</span>
                                        </label>
                                        <Link href="/forgot-password" className="text-[11px] text-[#4CAF50] hover:underline font-black">Forgot Password?</Link>
                                    </div>

                                    <button type="submit" disabled={isLoading} className="w-full py-4 bg-[#1B3A3A] text-white text-[12px] font-black rounded-2xl hover:bg-black hover:scale-[1.01] active:scale-[0.98] transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 mt-4">
                                        {isLoading ? <div className="w-5 h-5 border-[3px] border-white/20 border-t-white rounded-full animate-spin"></div> : <span>SIGN IN TO PORTAL</span>}
                                    </button>
                                </form>

                                <div className="space-y-4">
                                    <div className="relative flex items-center justify-center">
                                        <div className="w-full border-t border-slate-100"></div>
                                        <span className="absolute bg-white px-4 text-[9px] font-black text-slate-300 uppercase tracking-widest">Connect With</span>
                                    </div>
                                    <button onClick={() => AuthService.loginWithProvider('google')} className="w-full py-4 border-2 border-slate-100 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 transition-all font-bold text-xs text-slate-600">
                                        <Chrome className="w-5 h-5" />
                                        Continue with Google
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 py-4 animate-in fade-in slide-in-from-bottom-4">
                                <button onClick={() => window.location.href = '/register'} className="group p-6 bg-slate-50 border border-slate-100 rounded-[2rem] hover:border-[#4CAF50] hover:bg-white hover:shadow-2xl transition-all text-left flex items-center gap-5">
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-green-50">
                                        <User className="w-6 h-6 text-[#4CAF50]" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-black text-[#1B3A3A]">Student Account</h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Start learning journey</p>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-[#4CAF50] group-hover:translate-x-1 transition-all" />
                                </button>
                                <button onClick={() => window.location.href = '/register?role=institution_admin'} className="group p-6 bg-slate-50 border border-slate-100 rounded-[2rem] hover:border-[#4CAF50] hover:bg-white hover:shadow-2xl transition-all text-left flex items-center gap-5">
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-green-50">
                                        <Building2 className="w-6 h-6 text-teal-500" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-black text-[#1B3A3A]">Institution Admin</h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Scale your university</p>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-[#4CAF50] group-hover:translate-x-1 transition-all" />
                                </button>
                            </div>
                        )}

                        <div className="text-center pt-2">
                            <p className="text-[11px] font-bold text-slate-500">
                                {mode === 'login' ? "New to the platform?" : "Already joined us?"} {' '}
                                <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-[#4CAF50] font-black hover:underline ml-1">
                                    {mode === 'login' ? 'Join Now' : 'Sign In'}
                                </button>
                            </p>
                        </div>

                        <div className="text-center pt-6 border-t border-slate-50">
                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                By continuing, you agree to the <Link href="/terms" className="font-bold hover:text-slate-900">Terms</Link> and <Link href="/privacy" className="font-bold hover:text-slate-900">Privacy Policy</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
