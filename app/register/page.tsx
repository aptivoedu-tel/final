'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, GraduationCap, Building2, Eye, EyeOff, AlertCircle, CheckCircle, Globe, ArrowLeft, Shield, Check, Info } from 'lucide-react';
import { AuthService } from '@/lib/services/authService';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useLoading } from '@/lib/context/LoadingContext';

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'student' as 'student' | 'institution_admin',
        institutionId: '',
        institutionName: '',
        institutionType: 'college',
        isNewInstitution: true
    });

    const [institutions, setInstitutions] = useState<any[]>([]);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);

    // Slideshow State (Theme consistency)
    const [currentSlide, setCurrentSlide] = useState(0);
    const slides = [
        {
            image: "/login_illustration.png",
            title: "Join the Future",
            description: "Empowering students and institutions with modern educational tools."
        },
        {
            image: "/login_illustration_2.png",
            title: "Strategic Excellence",
            description: "Built for scale, designed for simplicity, and focused on your success."
        }
    ];

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search || '');
        const roleParam = searchParams.get('role');
        if (roleParam === 'institution_admin' || roleParam === 'student') {
            setFormData(prev => ({ ...prev, role: roleParam as any }));
        }

        const fetchInstitutions = async () => {
            const { data } = await supabase.from('institutions').select('id, name').eq('status', 'approved').eq('is_active', true);
            if (data) setInstitutions(data);
        };
        fetchInstitutions();

        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 6000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const password = formData.password;
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;
        setPasswordStrength(strength);
    }, [formData.password]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => ({ ...prev, [name]: val }));
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setGlobalLoading(true, 'Architecting Your Credentials...');

        if (!formData.fullName || !formData.email || !formData.password) {
            setError('Please fill in all required fields');
            setGlobalLoading(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setGlobalLoading(false);
            return;
        }

        if (formData.role === 'institution_admin') {
            if (formData.isNewInstitution && !formData.institutionName) {
                setError('Please provide your institution name');
                setGlobalLoading(false);
                return;
            }
            if (!formData.isNewInstitution && !formData.institutionId) {
                setError('Please select an existing institution');
                setGlobalLoading(false);
                return;
            }
        }

        try {
            const { user, error: registerError } = await AuthService.register({
                email: formData.email,
                password: formData.password,
                fullName: formData.fullName,
                role: formData.role,
                institutionId: !formData.isNewInstitution && formData.institutionId ? parseInt(formData.institutionId) : undefined,
                institutionName: formData.isNewInstitution ? formData.institutionName : undefined,
                institutionType: formData.isNewInstitution ? formData.institutionType : undefined
            });

            if (registerError) {
                setError(registerError);
                setGlobalLoading(false);
                return;
            }

            if (user) setSuccess(true);
        } catch (err) {
            setError('An unexpected error occurred during registration');
            setGlobalLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
                <div className="bg-white rounded-[3rem] shadow-2xl p-12 text-center max-w-sm animate-scale-in border border-slate-100 relative">
                    <div className="w-24 h-24 bg-green-50 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-bounce-slow">
                        <Mail className="w-12 h-12 text-[#4CAF50]" />
                    </div>
                    <h2 className="text-3xl font-black text-[#1B3A3A] mb-3">Verification Sent!</h2>
                    <p className="text-[#4A7272] text-[13px] font-medium leading-relaxed mb-4">
                        {formData.role === 'student'
                            ? "A verification link has been sent to:"
                            : "Your institution registration is received and currently under audit."}
                    </p>
                    {formData.role === 'student' && (
                        <p className="text-[#1B3A3A] text-sm font-bold mb-6 bg-slate-50 px-4 py-2 rounded-xl">
                            {formData.email}
                        </p>
                    )}
                    <p className="text-[#4A7272] text-xs font-medium leading-relaxed mb-10">
                        {formData.role === 'student'
                            ? "Please check your inbox and verify your email to access your dashboard."
                            : ""}
                    </p>
                    <button
                        onClick={() => window.location.href = '/login'}
                        className="w-full py-5 bg-[#244D4D] text-white font-black rounded-2xl hover:bg-[#1B3A3A] transition-all shadow-xl active:scale-95"
                    >
                        RETURN TO LOGIN
                    </button>
                    <div className="absolute top-10 right-10 w-24 h-24 bg-green-500/5 rounded-full blur-3xl -z-10"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-0 sm:p-4 lg:p-6 overflow-hidden">
            <div className="w-full max-w-6xl max-h-[98vh] flex flex-col lg:flex-row bg-white rounded-none sm:rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden animate-scale-in border border-slate-100/50">

                {/* Horizontal Branding Frame (Left) */}
                <div className="hidden lg:flex lg:w-[40%] bg-[#EAF5E9] p-10 flex-col items-center justify-between text-center relative overflow-hidden">
                    <div className="w-full">
                        <Link href="/login" className="inline-flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-[#4CAF50] transition-colors uppercase tracking-[0.2em]">
                            <ArrowLeft className="w-4 h-4" />
                            Return
                        </Link>
                    </div>

                    <div className="relative z-10 w-full space-y-8">
                        <div className="relative h-[300px] w-full flex flex-col items-center justify-center">
                            {slides.map((slide, index) => (
                                <div
                                    key={index}
                                    className={`absolute inset-0 flex flex-col items-center transition-all duration-1000 transform ${index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
                                        }`}
                                >
                                    <div className="w-full aspect-square max-w-[240px] mx-auto bg-white rounded-[2.5rem] shadow-xl p-6 border border-white/50 relative group">
                                        <div className="absolute inset-0 bg-green-400/10 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <img src={slide.image} alt={slide.title} className="w-full h-full object-contain relative" />
                                    </div>
                                    <div className="mt-10 space-y-3">
                                        <h2 className="text-2xl font-black text-[#1B3A3A] tracking-tight">{slide.title}</h2>
                                        <p className="text-[#4A7272] text-xs font-medium max-w-[240px] mx-auto leading-relaxed opacity-70">{slide.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>

                    <div className="w-full flex justify-center gap-8 border-t border-slate-900/5 pt-8 mt-4">
                        <div className="flex flex-col items-center">
                            <span className="text-[18px] font-black text-[#1B3A3A]">12k+</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Users</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[18px] font-black text-[#1B3A3A]">500+</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Colleges</span>
                        </div>
                    </div>

                    {/* Decorative blobs */}
                    <div className="absolute top-[-10%] right-[-10%] w-72 h-72 bg-white/40 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-72 h-72 bg-white/40 rounded-full blur-[100px]"></div>
                </div>

                {/* Registration Content (Right) */}
                <div className="flex-1 p-6 sm:p-10 lg:p-14 flex flex-col items-center bg-white overflow-y-auto custom-scrollbar">
                    <div className="w-full max-w-[520px] space-y-8">

                        {/* Header Section */}
                        <div className="text-center space-y-3">
                            <div className="w-14 h-14 bg-[#1B3A3A] rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-slate-200">
                                <GraduationCap className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-[#1B3A3A] tracking-tight">Join Aptivo</h1>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Create your secure learning account</p>
                            </div>
                        </div>

                        {/* Interactive Role Switcher - Large */}
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, role: 'student' })}
                                className={`group p-4 rounded-[1.5rem] border-2 transition-all flex items-center gap-4 ${formData.role === 'student' ? 'border-[#244D4D] bg-[#244D4D] text-white shadow-xl translate-y-[-2px]' : 'border-slate-50 bg-slate-50/50 text-slate-400 hover:border-slate-200'}`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${formData.role === 'student' ? 'bg-white/10' : 'bg-white shadow-sm'}`}>
                                    <User className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <span className="block text-[11px] font-black uppercase tracking-wider">Student</span>
                                    <span className="block text-[9px] font-medium opacity-60">Personal Access</span>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, role: 'institution_admin' })}
                                className={`group p-4 rounded-[1.5rem] border-2 transition-all flex items-center gap-4 ${formData.role === 'institution_admin' ? 'border-[#244D4D] bg-[#244D4D] text-white shadow-xl translate-y-[-2px]' : 'border-slate-50 bg-slate-50/50 text-slate-400 hover:border-slate-200'}`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${formData.role === 'institution_admin' ? 'bg-white/10' : 'bg-white shadow-sm'}`}>
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <span className="block text-[11px] font-black uppercase tracking-wider">Institution</span>
                                    <span className="block text-[9px] font-medium opacity-60">Admin Portal</span>
                                </div>
                            </button>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700 text-xs font-bold animate-in fade-in slide-in-from-top-1">
                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Institution Specific Logic */}
                            {formData.role === 'institution_admin' && (
                                <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4 animate-in slide-in-from-top-4 duration-500">
                                    <div className="flex items-center gap-2 mb-2 px-1">
                                        <Building2 className="w-4 h-4 text-[#244D4D]" />
                                        <span className="text-[10px] font-black text-[#244D4D] uppercase tracking-wider">Institution Registration</span>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="relative">
                                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                            <input type="text" name="institutionName" value={formData.institutionName} onChange={handleChange} placeholder="Full Institution Name" className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:border-[#4CAF50] focus:ring-4 focus:ring-green-500/5 outline-none" />
                                        </div>
                                        <div className="relative">
                                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                            <select name="institutionType" value={formData.institutionType} onChange={handleChange} className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:border-[#4CAF50] outline-none appearance-none">
                                                <option value="college">University / College</option>
                                                <option value="school">High School</option>
                                                <option value="coaching">Academy / Coaching</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Base Fields Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required placeholder="John Doe" className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl text-[13px] font-medium focus:bg-white focus:border-[#4CAF50] focus:ring-4 focus:ring-green-500/5 outline-none transition-all" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="john@example.com" className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl text-[13px] font-medium focus:bg-white focus:border-[#4CAF50] focus:ring-4 focus:ring-green-500/5 outline-none transition-all" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" className="w-full pl-11 pr-12 py-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl text-[13px] font-medium focus:bg-white focus:border-[#4CAF50] focus:ring-4 focus:ring-green-500/5 outline-none transition-all" />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#4CAF50] transition-colors p-1">
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <div className="flex gap-1 px-1">
                                        {[1, 2, 3, 4].map((v) => (
                                            <div key={v} className={`h-1 flex-1 rounded-full ${passwordStrength >= v ? 'bg-[#4CAF50]' : 'bg-slate-100'}`} />
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Identity</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required placeholder="••••••••" className="w-full pl-11 pr-12 py-3.5 bg-slate-50/50 border border-slate-100 rounded-2xl text-[13px] font-medium focus:bg-white focus:border-[#4CAF50] focus:ring-4 focus:ring-green-500/5 outline-none transition-all" />
                                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#4CAF50] transition-colors p-1">
                                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 px-1 pt-2">
                                <div className="relative flex h-5 items-center">
                                    <input type="checkbox" required className="h-4 w-4 rounded border-slate-200 text-[#4CAF50] focus:ring-[#4CAF50] cursor-pointer" />
                                </div>
                                <div className="text-[11px] leading-snug">
                                    <label className="font-bold text-slate-500">I agree to the <Link href="/terms" className="text-[#1B3A3A] hover:underline underline-offset-2">Terms of Service</Link> and <Link href="/privacy" className="text-[#1B3A3A] hover:underline underline-offset-2">Privacy Policy</Link></label>
                                    <p className="text-[10px] text-slate-400 mt-1 font-medium italic">Your data is stored securely in our encrypted vault.</p>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 bg-[#1B3A3A] text-white text-[13px] font-black rounded-[1.25rem] hover:bg-black hover:scale-[1.01] active:scale-[0.98] transition-all shadow-2xl shadow-slate-200 flex items-center justify-center gap-3 mt-4"
                            >
                                {loading ? (
                                    <span>Architecting Account...</span>
                                ) : (
                                    <>
                                        <Check className="w-5 h-5" />
                                        <span>{formData.role === 'student' ? 'CREATE STUDENT ACCOUNT' : 'REGISTER INSTITUTION'}</span>
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Google Sign-up for Students */}
                        {formData.role === 'student' && (
                            <>
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-100"></div>
                                    </div>
                                    <div className="relative flex justify-center">
                                        <span className="bg-white px-3 text-[9px] font-black text-slate-300 uppercase tracking-widest">Or Continue With</span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => AuthService.loginWithProvider('google')}
                                    className="w-full py-3.5 bg-white border-2 border-slate-200 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 hover:border-[#4CAF50] transition-all active:scale-[0.98] shadow-sm group"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900">Sign up with Google</span>
                                </button>
                            </>
                        )}

                        {/* Footer Section */}
                        <div className="text-center pt-4 border-t border-slate-50">
                            <p className="text-[12px] font-bold text-slate-500">
                                Already part of the community? {' '}
                                <Link href="/login" className="text-[#4CAF50] hover:underline font-black ml-1">Sign In</Link>
                            </p>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}
