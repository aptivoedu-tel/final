'use client';

// Force this page to use SSR (required for useSearchParams)
export const runtime = 'edge';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import {
    BookOpen,
    MapPin,
    CheckCircle,
    Clock,
    ChevronLeft,
    ChevronRight,
    Plus,
    ShieldAlert,
    LogOut
} from 'lucide-react';
import { toast } from 'sonner';
import { useUI } from '@/lib/context/UIContext';

type University = {
    id: number;
    name: string;
    logo_url?: string;
};

function UniversityPortalContent() {
    const { isSidebarCollapsed } = useUI();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loadingEnrollments, setLoadingEnrollments] = useState(false);
    const [allUnis, setAllUnis] = useState<University[]>([]);
    const [search, setSearch] = useState('');
    const [showRegistration, setShowRegistration] = useState(false);

    // URL Sync - Redirect if ID is present (backward compatibility)
    const searchParams = useSearchParams();

    useEffect(() => {
        const idParam = searchParams.get('id');
        if (idParam) {
            router.replace(`/university/${idParam}`);
        }
    }, [searchParams]);

    useEffect(() => {
        const init = async () => {
            const u = AuthService.getCurrentUser();
            if (u) {
                setUser(u);
                await checkEnrollment(u.id);
            } else {
                router.push('/login');
            }
            setLoading(false);
        };
        init();
    }, []);

    const checkEnrollment = async (userId: string) => {
        setLoadingEnrollments(true);
        try {
            const { data: profile } = await supabase
                .from('users')
                .select('institution_id')
                .eq('id', userId)
                .single();

            const { data: allUniversities } = await supabase.from('universities').select('*').eq('is_active', true).eq('is_public', true);
            setAllUnis(allUniversities || []);

            const { data: initialEnrolls } = await supabase
                .from('student_university_enrollments')
                .select(`
                    *,
                    university:universities(*)
                `)
                .eq('student_id', userId);

            let finalEnrollments = [...(initialEnrolls || [])];

            if (profile?.institution_id) {
                const { data: accessRules } = await supabase
                    .from('institution_university_access')
                    .select('university_id, is_locked')
                    .eq('institution_id', profile.institution_id);

                const rules = accessRules || [];
                const lockedUniIds = rules.filter(r => r.is_locked).map(r => r.university_id);
                const unlockedUniIds = rules.filter(r => !r.is_locked).map(r => r.university_id);

                const toRemove = finalEnrollments.filter(e => lockedUniIds.includes(e.university_id));
                if (toRemove.length > 0) {
                    const idsToRemove = toRemove.map(e => e.university_id);
                    await supabase
                        .from('student_university_enrollments')
                        .delete()
                        .eq('student_id', userId)
                        .in('university_id', idsToRemove);

                    finalEnrollments = finalEnrollments.filter(e => !idsToRemove.includes(e.university_id));
                }

                for (const assignedUniId of unlockedUniIds) {
                    const alreadyEnrolled = finalEnrollments.some(e => e.university_id === assignedUniId);
                    if (!alreadyEnrolled) {
                        const { data: newEnroll } = await supabase
                            .from('student_university_enrollments')
                            .insert({
                                student_id: userId,
                                university_id: assignedUniId,
                                institution_id: profile.institution_id,
                                status: 'approved',
                                enrollment_date: new Date().toISOString()
                            })
                            .select(`*, university:universities(*)`)
                            .single();

                        if (newEnroll) finalEnrollments.push(newEnroll);
                    }
                }
                setAllUnis(prev => prev.filter(u => !lockedUniIds.includes(u.id)));
            }

            setEnrollments(finalEnrollments);
            if (!profile?.institution_id && finalEnrollments.length === 0) {
                setShowRegistration(true);
            }
        } catch (e) {
            console.error('Error checking enrollment:', e);
        } finally {
            setLoadingEnrollments(false);
        }
    };

    const handleUnenroll = async (uniId: number) => {
        if (!confirm('Are you sure you want to unenroll from this university?')) return;
        try {
            const { error } = await supabase
                .from('student_university_enrollments')
                .delete()
                .eq('student_id', user.id)
                .eq('university_id', uniId);
            if (error) throw error;
            setEnrollments(prev => prev.filter(e => e.university_id !== uniId));
            toast.success("Successfully unenrolled");
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleRegister = async (uniId: number) => {
        if (!user) return;
        try {
            const { error } = await supabase.from('student_university_enrollments').insert({
                student_id: user.id,
                university_id: uniId,
                status: 'approved',
                is_active: true
            });
            if (error) throw error;
            toast.success("Successfully joined institution");
            await checkEnrollment(user.id);
            setShowRegistration(false);
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="student" />
            <div className="flex-1 flex flex-col">
                <Header userName={user?.full_name} userEmail={user?.email} userAvatar={user?.avatar_url} />

                <main className={`${isSidebarCollapsed ? 'lg:ml-24' : 'lg:ml-72'} pt-28 lg:pt-24 p-4 lg:p-8 transition-all duration-300`}>
                    <div className="max-w-7xl mx-auto space-y-8 bg-white/60 backdrop-blur-sm p-4 lg:p-8 rounded-[2rem] lg:rounded-[3rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">

                        {enrollments.length > 0 && showRegistration && (
                            <button
                                onClick={() => setShowRegistration(false)}
                                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold text-sm"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Back to Campus List
                            </button>
                        )}

                        {showRegistration ? (
                            <div className="max-w-2xl mx-auto py-12">
                                <h1 className="text-3xl lg:text-4xl font-black text-slate-900 mb-6 tracking-tight">Expand Your Academic Horizon</h1>
                                <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100">
                                    <p className="text-slate-500 mb-8 font-medium">Search for your institution to gain access to curriculum-aligned learning paths.</p>
                                    <div className="relative mb-8">
                                        <input
                                            type="text"
                                            placeholder="Search university..."
                                            className="w-full p-5 pl-12 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 transition-all border border-gray-100 font-medium"
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    </div>
                                    <div className="space-y-4">
                                        {allUnis
                                            .filter(u => u.name.toLowerCase().includes(search.toLowerCase()))
                                            .filter(u => !enrollments.some(e => e.university_id === u.id))
                                            .map(u => (
                                                <div key={u.id} className="flex items-center justify-between p-5 border border-gray-100 rounded-2xl hover:bg-slate-50 transition-all group hover:border-teal-100">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-100 group-hover:border-teal-200 transition-all shadow-sm overflow-hidden p-2 shrink-0">
                                                            {u.logo_url ? (
                                                                <img src={u.logo_url} alt={u.name} className="w-full h-full object-contain" />
                                                            ) : (
                                                                <span className="text-teal-600 font-black">{u.name.substring(0, 1)}</span>
                                                            )}
                                                        </div>
                                                        <span className="font-bold text-slate-700">{u.name}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRegister(u.id)}
                                                        className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95"
                                                    >
                                                        Join
                                                    </button>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-6xl mx-auto space-y-12">
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                    <div>
                                        <h1 className="text-3xl lg:text-5xl font-black text-slate-900 mb-2 tracking-tight">University Portal</h1>
                                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Institutional Command Center</p>
                                    </div>
                                    {(!user?.institution_id) && (
                                        <button
                                            onClick={() => setShowRegistration(true)}
                                            className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-600 transition-all shadow-xl shadow-slate-200 flex items-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Join Institution
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {enrollments.length > 0 ? (
                                        enrollments.map((en) => (
                                            <div
                                                key={en.id}
                                                onClick={() => router.push(`/university/${en.university_id}`)}
                                                className="group relative bg-white p-8 rounded-[3rem] border-2 border-gray-100 hover:border-teal-600 transition-all cursor-pointer hover:shadow-2xl hover:shadow-teal-100/50"
                                            >
                                                <div className="flex justify-between items-start mb-10">
                                                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-3xl font-black shadow-xl shadow-slate-100 border-2 border-slate-50 p-3 overflow-hidden">
                                                        {en.university.logo_url ? (
                                                            <img src={en.university.logo_url} alt={en.university.name} className="w-full h-full object-contain" />
                                                        ) : (
                                                            <span className="text-teal-600">{en.university.name.substring(0, 1)}</span>
                                                        )}
                                                    </div>
                                                    <div className="bg-teal-50 text-teal-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-teal-100 flex items-center gap-1.5">
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                        Verified
                                                    </div>
                                                </div>

                                                <h3 className="text-2xl font-black text-slate-900 mb-2 truncate">{en.university.name}</h3>
                                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em] mb-12">Academic Excellence Path</p>

                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-black text-teal-600 uppercase tracking-widest group-hover:translate-x-2 transition-transform inline-flex items-center gap-2">
                                                        Enter Campus
                                                        <ChevronRight className="w-4 h-4" />
                                                    </span>

                                                    {(!user?.institution_id) && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleUnenroll(en.university_id);
                                                            }}
                                                            className="p-3 bg-slate-50 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                                                            title="Unenroll"
                                                        >
                                                            <LogOut className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-full py-24 bg-white rounded-[3rem] border-4 border-dashed border-slate-100 text-center">
                                            <div className="w-24 h-24 bg-teal-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                                                <ShieldAlert className="w-12 h-12 text-teal-300" />
                                            </div>
                                            <h3 className="text-3xl font-black text-slate-900 mb-4">No Institutions Connected</h3>
                                            <p className="text-slate-500 max-w-sm mx-auto font-medium mb-10">You need to join a university or institution to access the portal and its academic resources.</p>
                                            <button
                                                onClick={() => setShowRegistration(true)}
                                                className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-teal-600 transition-all shadow-2xl shadow-slate-200"
                                            >
                                                Register Now
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default function UniversityPortalPage() {
    return (
        <React.Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <UniversityPortalContent />
        </React.Suspense>
    );
}
