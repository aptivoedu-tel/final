'use client';

import React from 'react';
import { Brain, Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle, Users, Building2, Clock, Globe, ArrowLeft } from 'lucide-react';
import { AuthService } from '@/lib/services/authService';
import { supabase } from '@/lib/supabase/client';

export default function RegisterPage() {
    const [formData, setFormData] = React.useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'student' as 'student' | 'institution_admin',
        institutionId: '',
        institutionName: '',
        institutionType: 'college',
        isNewInstitution: false
    });

    const [institutions, setInstitutions] = React.useState<any[]>([]);
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState(false);
    const [passwordStrength, setPasswordStrength] = React.useState(0);

    React.useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const roleParam = searchParams.get('role');
        if (roleParam === 'institution_admin' || roleParam === 'student') {
            setFormData(prev => ({ ...prev, role: roleParam as any }));
        }

        const fetchInstitutions = async () => {
            const { data } = await supabase.from('institutions').select('id, name').eq('status', 'approved').eq('is_active', true);
            if (data) setInstitutions(data);
        };
        fetchInstitutions();
    }, []);

    React.useEffect(() => {
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

        setFormData({
            ...formData,
            [name]: val
        });
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!formData.fullName || !formData.email || !formData.password) {
            setError('Please fill in all fields');
            setLoading(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (formData.role === 'institution_admin') {
            if (formData.isNewInstitution && !formData.institutionName) {
                setError('Please provide your institution name');
                setLoading(false);
                return;
            }
            if (!formData.isNewInstitution && !formData.institutionId) {
                setError('Please select an institution or register a new one');
                setLoading(false);
                return;
            }
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters');
            setLoading(false);
            return;
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
                setLoading(false);
                return;
            }

            if (user) {
                setSuccess(true);
            }
        } catch (err) {
            setError('An unexpected error occurred');
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-mesh-gradient opacity-30"></div>
                <div className="relative bg-white rounded-3xl shadow-2xl p-12 text-center max-w-md animate-scale-in border border-slate-100">
                    {formData.role === 'student' ? (
                        <>
                            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-white shadow-xl">
                                <Mail className="w-12 h-12 text-green-500 animate-bounce-slow" />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Check Your Email! 📧</h2>
                            <p className="text-slate-600 mb-8 font-medium italic">We've sent a link to <span className="font-black text-slate-800 underline decoration-green-400 decoration-2">{formData.email}</span>.</p>
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-sm text-slate-500 leading-relaxed font-semibold">
                                Please click the link in your email to activate and start your journey with Aptivo.
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-white shadow-xl">
                                <Clock className="w-12 h-12 text-amber-500 animate-pulse" />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Pending Approval! 🏛️</h2>
                            <p className="text-slate-600 mb-8 font-medium">Your request for <span className="font-black text-slate-800">{formData.institutionName || 'your institution'}</span> is being reviewed.</p>
                            <div className="text-left space-y-4 bg-amber-50/50 p-6 rounded-2xl border border-amber-100">
                                <p className="text-sm text-amber-900 font-black uppercase tracking-wider">Next steps:</p>
                                <ul className="text-sm text-amber-800 space-y-3 font-semibold list-none">
                                    <li className="flex items-start gap-2">
                                        <div className="w-5 h-5 rounded-full bg-amber-200 flex-shrink-0 flex items-center justify-center text-[10px] text-amber-900 font-bold">1</div>
                                        Application review (up to 7 days)
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <div className="w-5 h-5 rounded-full bg-amber-200 flex-shrink-0 flex items-center justify-center text-[10px] text-amber-900 font-bold">2</div>
                                        Domain verification audit
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <div className="w-5 h-5 rounded-full bg-amber-200 flex-shrink-0 flex items-center justify-center text-[10px] text-amber-900 font-bold">3</div>
                                        Final activation email
                                    </li>
                                </ul>
                            </div>
                        </>
                    )}

                    <button
                        onClick={() => window.location.href = '/login'}
                        className="mt-10 w-full py-5 bg-slate-900 text-white font-black rounded-2xl hover:bg-black transition-all shadow-2xl active:scale-95"
                    >
                        Return to Sign In
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-mesh-gradient opacity-30"></div>

            <div className="relative w-full max-w-md">
                <div className="bg-white rounded-3xl shadow-2xl p-8 animate-scale-in border border-slate-100">
                    <button
                        onClick={() => window.location.href = '/login'}
                        className="mb-6 flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors text-xs font-bold uppercase tracking-widest"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Login
                    </button>

                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl rotate-3">
                            <Brain className="w-8 h-8 text-white -rotate-3" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Join Aptivo</h1>
                        <p className="text-slate-500 font-medium">Create your secure learning account</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-fade-in text-red-700 text-sm font-semibold">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Role Selection */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, role: 'student' })}
                                className={`py-4 px-4 rounded-2xl text-sm font-black border-2 transition-all flex flex-col items-center gap-2 ${formData.role === 'student' ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                                <Users className="w-5 h-5" />
                                Student
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, role: 'institution_admin' })}
                                className={`py-4 px-4 rounded-2xl text-sm font-black border-2 transition-all flex flex-col items-center gap-2 ${formData.role === 'institution_admin' ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                                <Building2 className="w-5 h-5" />
                                Institution
                            </button>
                        </div>

                        {formData.role === 'institution_admin' && (
                            <div className="space-y-4 py-4 px-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-2 mb-2 bg-white p-1.5 rounded-xl border border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isNewInstitution: false })}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${!formData.isNewInstitution ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}
                                    >
                                        Join Existing
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isNewInstitution: true })}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${formData.isNewInstitution ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400'}`}
                                    >
                                        New Registration
                                    </button>
                                </div>

                                {!formData.isNewInstitution ? (
                                    <div className="relative">
                                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <select
                                            id="institutionId"
                                            name="institutionId"
                                            value={formData.institutionId}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl appearance-none text-slate-800 font-black focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900"
                                        >
                                            <option value="">Select Institution...</option>
                                            {institutions.map(inst => (
                                                <option key={inst.id} value={inst.id}>{inst.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <input
                                                id="institutionName"
                                                name="institutionName"
                                                type="text"
                                                value={formData.institutionName}
                                                onChange={handleChange}
                                                required
                                                placeholder="Institution Name"
                                                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 font-bold"
                                            />
                                        </div>
                                        <div className="relative">
                                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <select
                                                id="institutionType"
                                                name="institutionType"
                                                value={formData.institutionType}
                                                onChange={handleChange}
                                                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 font-bold appearance-none"
                                            >
                                                <option value="college">University / College</option>
                                                <option value="school">High School</option>
                                                <option value="coaching">Coaching Center</option>
                                                <option value="corporate">Corporate Training</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-2">
                                Full Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    id="fullName"
                                    name="fullName"
                                    type="text"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    required
                                    placeholder="John Doe"
                                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 pl-12 font-bold"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    placeholder="your.email@university.edu"
                                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 pl-12 font-bold"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    placeholder="Create strong password"
                                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 font-bold"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            {formData.password && (
                                <div className="mt-3 px-1">
                                    <div className="flex gap-1.5 mb-1.5">
                                        {[1, 2, 3, 4].map((level) => (
                                            <div
                                                key={level}
                                                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${passwordStrength >= level
                                                    ? passwordStrength === 1 ? 'bg-red-400' : passwordStrength === 2 ? 'bg-amber-400' : passwordStrength === 3 ? 'bg-blue-400' : 'bg-green-400'
                                                    : 'bg-slate-100'}`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        {passwordStrength === 0 && 'Insecure'}
                                        {passwordStrength === 1 && 'Weak'}
                                        {passwordStrength === 2 && 'Average'}
                                        {passwordStrength === 3 && 'Good Quality'}
                                        {passwordStrength === 4 && 'High Security'}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    placeholder="Repeat your password"
                                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 font-bold"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 pt-2">
                            <input type="checkbox" id="terms" required className="w-5 h-5 text-slate-900 border-slate-300 rounded focus:ring-slate-900 mt-0.5" />
                            <label htmlFor="terms" className="text-[11px] text-slate-500 font-bold leading-snug">
                                I agree to the <a href="#" className="text-slate-900 underline">Terms of Platform</a> and authorize Aptivo to process my data for educational purposes.
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl hover:bg-black transition-all shadow-2xl active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
                        >
                            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (formData.role === 'student' ? 'Create Account' : 'Register Institution')}
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <p className="text-sm text-slate-500 font-bold">
                            Member already? <a href="/login" className="text-slate-900 font-black hover:underline underline-offset-4 ml-1">Sign in here</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
