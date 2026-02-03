'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { BookOpen, MapPin, CheckCircle, Clock, ChevronDown, ChevronRight, ChevronUp, ChevronLeft, Play, Info, BarChart, GraduationCap, LogOut, Plus, FileText, X, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useUI } from '@/lib/context/UIContext';

type University = {
    id: number;
    name: string;
    logo_url?: string;
    test_pattern_markdown?: string;
};

type ContentMap = {
    subject: { id: number; name: string };
    topics: {
        id: number;
        name: string;
        mcqCount?: number;
        subtopics: { id: number; name: string; mcqCount?: number }[];
    }[];
};

export default function UniversityPortalPage() {
    const { isSidebarCollapsed } = useUI();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [activeUniversityId, setActiveUniversityId] = useState<number | null>(null);
    const [content, setContent] = useState<ContentMap[]>([]);
    const [expandedTopic, setExpandedTopic] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'library' | 'insights' | 'exams' | 'pattern'>('library');
    const [stats, setStats] = useState<any>(null);
    const [exams, setExams] = useState<any[]>([]);
    const [progressMap, setProgressMap] = useState<Record<number, { isRead: boolean; isMastered: boolean }>>({});
    const [isPatternDrawerOpen, setIsPatternDrawerOpen] = useState(false);

    // For registration flow
    const [allUnis, setAllUnis] = useState<University[]>([]);
    const [search, setSearch] = useState('');
    const [showRegistration, setShowRegistration] = useState(false);

    useEffect(() => {
        const init = async () => {
            const u = AuthService.getCurrentUser();
            if (u) {
                setUser(u);
                await checkEnrollment(u.id);
            }
            setLoading(false);
        };
        init();
    }, []);

    const checkEnrollment = async (userId: string) => {
        // 1. Get user profile for institution_id
        const { data: profile } = await supabase
            .from('users')
            .select('institution_id')
            .eq('id', userId)
            .single();

        // 2. Fetch all universities
        const { data: allUniversities } = await supabase.from('universities').select('*').eq('is_active', true).eq('is_public', true);
        setAllUnis(allUniversities || []);

        // 3. Fetch current student enrollments
        const { data: initialEnrolls } = await supabase
            .from('student_university_enrollments')
            .select(`
                *,
                university:universities(*)
            `)
            .eq('student_id', userId);

        let finalEnrollments = [...(initialEnrolls || [])];

        // 4. INSTITUTION LOGIC: Auto-enroll or Force-Remove based on admin locks
        if (profile?.institution_id) {
            const { data: accessRules } = await supabase
                .from('institution_university_access')
                .select('university_id, is_locked')
                .eq('institution_id', profile.institution_id);

            const rules = accessRules || [];
            const lockedUniIds = rules.filter(r => r.is_locked).map(r => r.university_id);
            const unlockedUniIds = rules.filter(r => !r.is_locked).map(r => r.university_id);

            // A. Remove any enrollments that are now LOCKED
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

            // B. Auto-enroll in UNLOCKED universities
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

                    if (newEnroll) {
                        finalEnrollments.push(newEnroll);
                    }
                }
            }

            // C. Filter ALL UNIS to hide locked ones from registration
            setAllUnis(prev => prev.filter(u => !lockedUniIds.includes(u.id)));
        }

        setEnrollments(finalEnrollments);

        // Logic for showing registration:
        // Solo students (no institution_id) see registration if they have no enrollments
        // Institutional students NEVER see manual registration - they only see what is auto-enrolled
        if (!profile?.institution_id && finalEnrollments.length === 0) {
            setShowRegistration(true);
        } else {
            setShowRegistration(false);
        }

        if (finalEnrollments.length > 0) {
            await loadStudentProgress(userId);
        }
    };

    const handleUnenroll = async (uniId: number) => {
        if (!confirm('Are you sure you want to unenroll from this university? This will remove your access to its curriculum.')) return;

        try {
            const { error } = await supabase
                .from('student_university_enrollments')
                .delete()
                .eq('student_id', user.id)
                .eq('university_id', uniId);

            if (error) throw error;

            setEnrollments(prev => prev.filter(e => e.university_id !== uniId));
            if (activeUniversityId === uniId) {
                setActiveUniversityId(null);
            }
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        }
    };

    async function loadStudentProgress(userId: string) {
        // Fetch read status
        const { data: readData } = await supabase
            .from('subtopic_progress')
            .select('subtopic_id, is_completed')
            .eq('student_id', userId);

        // Fetch master status (passed practice)
        const { data: practiceData } = await supabase
            .from('practice_sessions')
            .select('subtopic_id, score_percentage')
            .eq('student_id', userId)
            .gte('score_percentage', 60);

        const map: Record<number, { isRead: boolean; isMastered: boolean }> = {};

        readData?.forEach(r => {
            if (!map[r.subtopic_id]) map[r.subtopic_id] = { isRead: false, isMastered: false };
            map[r.subtopic_id].isRead = r.is_completed;
        });

        practiceData?.forEach(p => {
            if (!map[p.subtopic_id!]) map[p.subtopic_id!] = { isRead: false, isMastered: false };
            map[p.subtopic_id!].isMastered = true;
        });

        setProgressMap(map);
    };

    async function loadUniversityStats(userId: string, uniId: number) {
        const { data } = await supabase
            .from('practice_sessions')
            .select('*')
            .eq('student_id', userId)
            .eq('university_id', uniId)
            .eq('is_completed', true);

        if (data) {
            const totalSessions = data.length;
            const avgScore = totalSessions > 0
                ? data.reduce((acc, s) => acc + (s.score_percentage || 0), 0) / totalSessions
                : 0;
            const totalTime = data.reduce((acc, s) => acc + s.time_spent_seconds, 0);

            setStats({
                totalSessions,
                avgScore: Math.round(avgScore),
                totalTime: Math.round(totalTime / 60)
            });
        }
    };

    async function loadExams(uniId: number) {
        const { data } = await supabase
            .from('university_exams')
            .select('*')
            .eq('university_id', uniId)
            .eq('is_active', true);
        setExams(data || []);
    };

    function calculateCompletion(uniId: number) {
        if (content.length === 0) return 0;
        let total = 0;
        let completed = 0;

        content.forEach(subject => {
            subject.topics.forEach(topic => {
                topic.subtopics.forEach(st => {
                    total++;
                    if (progressMap[st.id]?.isMastered) completed++;
                });
            });
        });

        return total > 0 ? Math.round((completed / total) * 100) : 0;
    };

    async function loadContent(uniId: number, institutionId?: number | null) {
        let access: any[] | null = null;

        // 1. Try fetching institution-specific mappings
        if (institutionId) {
            const { data } = await supabase
                .from('university_content_access')
                .select(`
                    subject:subjects(id, name),
                    topic:topics(id, name),
                    subtopic:subtopics(id, name, topic_id),
                    session_limit
                `)
                .eq('university_id', uniId)
                .eq('institution_id', institutionId)
                .eq('is_active', true);

            if (data && data.length > 0) {
                access = data;
            }
        }

        // 2. Fallback to global mappings if no institution ones exist
        if (!access) {
            const { data } = await supabase
                .from('university_content_access')
                .select(`
                    subject:subjects(id, name),
                    topic:topics(id, name),
                    subtopic:subtopics(id, name, topic_id),
                    session_limit
                `)
                .eq('university_id', uniId)
                .is('institution_id', null)
                .eq('is_active', true);

            access = data;
        }

        // 3. Fetch MCQ counts
        const { data: mcqStats } = await supabase.rpc('get_mcq_stats_per_subtopic');
        const mcqMap: Record<number, number> = {};
        mcqStats?.forEach((s: any) => {
            mcqMap[s.subtopic_id] = Number(s.count);
        });

        if (access) {
            const subjectMap = new Map<number, ContentMap>();

            (access as any[]).forEach((row) => {
                if (!row.subject) return;

                if (!subjectMap.has(row.subject.id)) {
                    subjectMap.set(row.subject.id, {
                        subject: row.subject,
                        topics: []
                    });
                }

                const currentSubject = subjectMap.get(row.subject.id)!;

                if (row.topic) {
                    let topic = currentSubject.topics.find(t => t.id === row.topic.id);
                    if (!topic) {
                        const newTopic = { ...row.topic, subtopics: [] };
                        currentSubject.topics.push(newTopic);
                        topic = newTopic;
                    }

                    if (row.subtopic && row.subtopic.topic_id === row.topic.id && topic) {
                        if (topic.subtopics && !topic.subtopics.find(st => st.id === row.subtopic.id)) {
                            const subtopicWithCount = {
                                ...row.subtopic,
                                mcqCount: mcqMap[row.subtopic.id] || 0
                            };
                            topic.subtopics.push(subtopicWithCount);
                            // Add to topic count
                            topic.mcqCount = (topic.mcqCount || 0) + subtopicWithCount.mcqCount;
                        }
                    }
                }
            });

            setContent(Array.from(subjectMap.values()));
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
            await checkEnrollment(user.id);
        } catch (e: any) {
            alert(e.message);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="student" />
            <div className="flex-1 flex flex-col">
                <Header userName={user?.full_name} userEmail={user?.email} />

                <main className={`${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'} mt-20 p-4 lg:p-8 transition-all duration-300`}>
                    <div className="max-w-7xl mx-auto space-y-8 bg-white/60 backdrop-blur-sm p-8 rounded-[3rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
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
                            // Registration View
                            <div className="max-w-2xl mx-auto">
                                <h1 className="text-3xl font-bold text-slate-900 mb-6 font-black tracking-tight">Expand Your Academic Horizon</h1>
                                <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100">
                                    <p className="text-slate-500 mb-6 text-sm font-medium">Search for your institution to gain access to curriculum-aligned learning paths.</p>
                                    <div className="relative mb-6">
                                        <input
                                            type="text"
                                            placeholder="Search university..."
                                            className="w-full p-5 pl-12 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all border border-gray-100 font-medium"
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    </div>
                                    <div className="space-y-3">
                                        {allUnis
                                            .filter(u => u.name.toLowerCase().includes(search.toLowerCase()))
                                            .filter(u => !enrollments.some(e => e.university_id === u.id))
                                            .map(u => (
                                                <div key={u.id} className="flex items-center justify-between p-5 border border-gray-100 rounded-2xl hover:bg-slate-50 transition-all group hover:border-indigo-100">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm overflow-hidden">
                                                            {u.logo_url ? (
                                                                <img src={u.logo_url} alt={u.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                u.name.substring(0, 1)
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
                        ) : !activeUniversityId ? (
                            // Command Center (Multi-Uni Cards)
                            <div className="max-w-6xl mx-auto space-y-12">
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                    <div>
                                        <h1 className="text-4xl font-black text-slate-900 mb-2">My Universities</h1>
                                        <p className="text-slate-500 font-medium tracking-tight uppercase text-xs">Command Center / Institutional Dashboard</p>
                                    </div>
                                    {(!user?.institution_id) && (
                                        <button
                                            onClick={() => setShowRegistration(true)}
                                            className="px-6 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Join Another Institution
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {enrollments.length > 0 ? (
                                        enrollments.map((en) => (
                                            <div
                                                key={en.id}
                                                onClick={() => {
                                                    if (en.status === 'approved') {
                                                        setActiveUniversityId(en.university_id);
                                                        loadContent(en.university_id);
                                                        loadUniversityStats(user.id, en.university_id);
                                                        loadExams(en.university_id);
                                                    }
                                                }}
                                                className={`group relative bg-white p-8 rounded-[2.5rem] border-2 transition-all cursor-pointer ${en.status === 'approved' ? 'hover:border-indigo-600 border-gray-100 shadow-xl hover:shadow-indigo-100/50' : 'opacity-80 border-gray-50 grayscale select-none'}`}
                                            >
                                                <div className="flex justify-between items-start mb-8">
                                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg overflow-hidden border-2 ${en.status === 'approved' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-200 text-slate-400 border-slate-100'}`}>
                                                        {en.university.logo_url ? (
                                                            <img src={en.university.logo_url} alt={en.university.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            en.university.name.substring(0, 1)
                                                        )}
                                                    </div>
                                                    {en.status === 'approved' ? (
                                                        <div className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100 flex items-center gap-1">
                                                            <CheckCircle className="w-3 h-3" />
                                                            Verified
                                                        </div>
                                                    ) : (
                                                        <div className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-100 flex items-center gap-1">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            Pending
                                                        </div>
                                                    )}
                                                </div>

                                                <h3 className="text-xl font-black text-slate-900 mb-2 line-clamp-1">{en.university.name}</h3>
                                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">Bachelor of Science Path</p>

                                                <div className="flex items-center gap-6">
                                                    <div className="relative w-16 h-16">
                                                        <svg className="w-full h-full transform -rotate-90">
                                                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-100" />
                                                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={176} strokeDashoffset={176 - (176 * (en.status === 'approved' ? calculateCompletion(en.university_id) : 0)) / 100} className="text-indigo-600 transition-all duration-1000" />
                                                        </svg>
                                                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-700">
                                                            {en.status === 'approved' ? `${calculateCompletion(en.university_id)}%` : '--'}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-900 font-bold text-sm">Curriculum Progress</p>
                                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-tighter">
                                                            {en.status === 'approved' ? 'Syncing Progress...' : 'Awaiting Approval'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-8 flex items-center justify-between">
                                                    <span className="text-xs font-black text-indigo-600 uppercase tracking-widest group-hover:translate-x-1 transition-transform inline-flex items-center gap-2">
                                                        Enter Campus
                                                        <ChevronRight className="w-4 h-4" />
                                                    </span>

                                                    {(!user?.institution_id) && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleUnenroll(en.university_id);
                                                            }}
                                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                                            title="Unenroll"
                                                        >
                                                            <LogOut className="w-5 h-5 flex-shrink-0" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-full py-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 text-center shadow-sm">
                                            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <ShieldAlert className="w-10 h-10 text-indigo-300" />
                                            </div>
                                            <h3 className="text-2xl font-black text-slate-900 mb-2">Curriculum Locked</h3>
                                            <p className="text-slate-500 max-w-sm mx-auto font-medium">Your institution has not yet unlocked any university curricula for your group. Please contact your coordinator for access.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            // Detailed University View
                            <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-100">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setActiveUniversityId(null)}
                                            className="w-10 h-10 border border-gray-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all shadow-sm bg-white"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{enrollments.find(e => e.university_id === activeUniversityId)?.university.name}</h1>
                                                {(!user?.institution_id) && (
                                                    <button
                                                        onClick={() => handleUnenroll(activeUniversityId!)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100"
                                                    >
                                                        <LogOut className="w-3.5 h-3.5" />
                                                        Unenroll
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-400 mt-1">
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Active Academic Session</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="flex bg-white p-1 rounded-2xl border border-gray-200 shadow-sm">
                                            <button
                                                onClick={() => setActiveTab('library')}
                                                className={`px-8 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${activeTab === 'library' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Library
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('exams')}
                                                className={`px-8 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${activeTab === 'exams' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Exams
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('pattern')}
                                                className={`px-8 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${activeTab === 'pattern' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Test Pattern
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('insights')}
                                                className={`px-8 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${activeTab === 'insights' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Insights
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Sub-view Rendering */}
                                {activeTab === 'exams' ? (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {exams.length === 0 ? (
                                                <div className="col-span-full py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200 text-center">
                                                    <FileText className="w-16 h-16 mx-auto mb-4 text-slate-100" />
                                                    <h3 className="text-xl font-bold text-slate-900">No Exams Scheduled</h3>
                                                    <p className="text-slate-500 font-medium">Check back later for mock tests and final examinations.</p>
                                                </div>
                                            ) : (
                                                exams.map(exam => (
                                                    <div key={exam.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-50/30 transition-all group overflow-hidden relative">
                                                        <div className="flex justify-between items-start mb-6">
                                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${exam.exam_type === 'final' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                                                                exam.exam_type === 'module' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                                                                    'bg-indigo-50 border-indigo-100 text-indigo-600'
                                                                }`}>
                                                                {exam.exam_type} Test
                                                            </span>
                                                            <div className="flex items-center gap-2 text-slate-400 group-hover:text-indigo-600 transition-colors">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                <span className="text-[10px] font-black uppercase tracking-widest">{exam.total_duration} MINS</span>
                                                            </div>
                                                        </div>
                                                        <h3 className="text-2xl font-black text-slate-900 mb-2 truncate">{exam.name}</h3>
                                                        <p className="text-slate-500 text-sm font-medium mb-8">Formal evaluation aligned with your current academic session objectives.</p>

                                                        <div className="grid grid-cols-2 gap-4 mb-8">
                                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Attempt Mode</p>
                                                                <p className="text-xs font-black text-slate-700 uppercase">
                                                                    {exam.allow_reattempt ? 'Continuable' : 'Single Shot'}
                                                                </p>
                                                            </div>
                                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Results</p>
                                                                <p className="text-xs font-black text-slate-700 uppercase">
                                                                    {exam.result_release_setting === 'instant' ? 'Immediate' : 'Post-Session'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                console.log('Navigating to exam:', { uni: activeUniversityId, exam: exam.id });
                                                                if (activeUniversityId) {
                                                                    toast.info('Initializing Exam Session...');
                                                                    router.push(`/university/${activeUniversityId}/exam/${exam.id}`);
                                                                } else {
                                                                    toast.error('University Context Missing');
                                                                }
                                                            }}
                                                            className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95 block text-center"
                                                        >
                                                            Initialize Examination
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                ) : activeTab === 'library' ? (
                                    // Active Content (The Library)
                                    <div className="grid grid-cols-1 gap-8">
                                        {content.length > 0 ? content.map((subjectItem) => (
                                            <div key={subjectItem.subject.id} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                                <div className="bg-slate-900 px-8 py-6 flex items-center justify-between">
                                                    <div>
                                                        <span className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-1 block">Curriculum</span>
                                                        <h3 className="text-xl font-bold text-white">{subjectItem.subject.name}</h3>
                                                    </div>
                                                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                                        <BookOpen className="w-5 h-5 text-indigo-400" />
                                                    </div>
                                                </div>
                                                <div className="p-4 bg-gray-50/50 border-b border-gray-100">
                                                    <div className="flex items-center justify-between px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                        <span>Library Modules</span>
                                                        <span>{subjectItem.topics.length} Topics</span>
                                                    </div>
                                                </div>
                                                <div className="p-8 space-y-4">
                                                    {subjectItem.topics.length > 0 ? subjectItem.topics.map(topic => (
                                                        <div key={topic.id} className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm transition-all hover:border-indigo-100">
                                                            <button
                                                                onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
                                                                className="w-full flex items-center justify-between p-5 text-left group transition-colors hover:bg-indigo-50/30"
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all shadow-sm ${expandedTopic === topic.id ? 'bg-indigo-600 text-white' : ((topic.mcqCount || 0) > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-50 text-rose-400')}`}>
                                                                        {topic.mcqCount || 0}
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="font-bold text-slate-800">{topic.name}</h4>
                                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{topic.subtopics.length} Learning Modules Available</p>
                                                                    </div>
                                                                </div>
                                                                {expandedTopic === topic.id ? <ChevronUp className="w-5 h-5 text-indigo-600" /> : <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" />}
                                                            </button>

                                                            {expandedTopic === topic.id && (
                                                                <div className="px-5 pb-5 pt-0 space-y-2 animate-slide-down">
                                                                    {topic.subtopics.length > 0 ? topic.subtopics.map(subtopic => {
                                                                        const status = progressMap[subtopic.id] || { isRead: false, isMastered: false };
                                                                        return (
                                                                            <Link
                                                                                key={subtopic.id}
                                                                                href={`/university/${activeUniversityId}/lesson/${subtopic.id}`}
                                                                                className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-transparent hover:bg-white hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-50/50 group transition-all"
                                                                            >
                                                                                <div className="flex items-center gap-4">
                                                                                    {status.isMastered ? (
                                                                                        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center border border-green-100">
                                                                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                                                                        </div>
                                                                                    ) : status.isRead ? (
                                                                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
                                                                                            <BookOpen className="w-4 h-4 text-blue-500" />
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200">
                                                                                            <Play className="w-3 h-3 text-slate-400" />
                                                                                        </div>
                                                                                    )}
                                                                                    <span className={`text-[13px] font-black tracking-tight ${status.isRead ? 'text-slate-900' : 'text-slate-500'}`}>
                                                                                        {subtopic.name}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex items-center gap-3">
                                                                                    {status.isMastered && (
                                                                                        <span className="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1">
                                                                                            <GraduationCap className="w-3 h-3" />
                                                                                            Mastered
                                                                                        </span>
                                                                                    )}
                                                                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                                                                                </div>
                                                                            </Link>
                                                                        );
                                                                    }) : (
                                                                        <div className="p-4 text-center text-slate-400 text-sm italic">No lessons available in this module.</div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )) : (
                                                        <div className="py-8 text-center text-slate-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                                            <Info className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                                            <p className="text-sm font-medium">No topics have been assigned to this subject yet.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-gray-200 shadow-sm">
                                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                                    <BookOpen className="w-10 h-10 text-gray-200" />
                                                </div>
                                                <h3 className="text-xl font-bold text-slate-800 mb-2">Institutional Library</h3>
                                                <p className="text-slate-500 max-w-xs mx-auto">No curricula or learning paths have been assigned to your university profile yet.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : activeTab === 'pattern' ? (
                                    // Test Pattern View
                                    <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />

                                        <div className="relative z-10">
                                            <div className="mb-10">
                                                <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Official Entry Standards</span>
                                                <h2 className="text-4xl font-black text-slate-900 mt-4 tracking-tight">University Test Pattern</h2>
                                            </div>

                                            {enrollments.find(e => e.university_id === activeUniversityId)?.university.test_pattern_markdown ? (
                                                <div className="prose prose-indigo max-w-none">
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            table: ({ node, ...props }) => (
                                                                <div className="overflow-x-auto my-8 rounded-2xl border border-gray-100 shadow-sm">
                                                                    <table className="w-full border-collapse text-sm" {...props} />
                                                                </div>
                                                            ),
                                                            th: ({ node, ...props }) => <th className="bg-slate-900 border-b border-white/10 px-6 py-4 text-left font-black text-white uppercase tracking-widest text-[10px]" {...props} />,
                                                            td: ({ node, ...props }) => <td className="border-b border-gray-50 px-6 py-5 text-slate-600 font-medium" {...props} />,
                                                            h1: ({ node, ...props }) => <h1 className="text-3xl font-black text-slate-900 mb-8 pb-4 border-b-2 border-indigo-600" {...props} />,
                                                            h2: ({ node, ...props }) => <h2 className="text-xl font-black text-slate-800 mb-6 mt-12 flex items-center gap-3 before:w-2 before:h-8 before:bg-indigo-600 before:rounded-full" {...props} />,
                                                            p: ({ node, ...props }) => <p className="text-slate-600 leading-relaxed mb-6 font-medium text-base" {...props} />,
                                                            strong: ({ node, ...props }) => <strong className="font-black text-indigo-700" {...props} />
                                                        }}
                                                    >
                                                        {enrollments.find(e => e.university_id === activeUniversityId)?.university.test_pattern_markdown}
                                                    </ReactMarkdown>
                                                </div>
                                            ) : (
                                                <div className="py-24 text-center">
                                                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                                        <FileText className="w-10 h-10 text-gray-200" />
                                                    </div>
                                                    <h3 className="text-2xl font-black text-slate-800 mb-2">Pattern Awaiting Release</h3>
                                                    <p className="text-slate-500 max-w-sm mx-auto font-medium">The official entrance test pattern for this institution has not been uploaded to the portal yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    // Insights Board
                                    <div className="space-y-8 animate-slide-up">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -translate-y-1/2 translate-x-1/2 -z-0 transition-transform group-hover:scale-110" />
                                                <div className="relative z-10">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Total Engagement</span>
                                                    <h3 className="text-4xl font-black text-slate-900">{stats?.totalSessions || 0}</h3>
                                                    <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-tighter">Learning sessions accessed</p>
                                                </div>
                                            </div>
                                            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-full -translate-y-1/2 translate-x-1/2 -z-0 transition-transform group-hover:scale-110" />
                                                <div className="relative z-10">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Average Accuracy</span>
                                                    <h3 className="text-4xl font-black text-slate-900">{stats?.avgScore || 0}%</h3>
                                                    <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-tighter">Overall performance</p>
                                                </div>
                                            </div>
                                            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-full -translate-y-1/2 translate-x-1/2 -z-0 transition-transform group-hover:scale-110" />
                                                <div className="relative z-10">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Study Time</span>
                                                    <h3 className="text-4xl font-black text-slate-900">{stats?.totalTime || 0}m</h3>
                                                    <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-tighter">Total minutes engaged</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-900 p-10 rounded-[3rem] shadow-xl relative overflow-hidden">
                                            <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full translate-y-1/3 translate-x-1/3 blur-3xl" />
                                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                                                <div className="max-w-md text-center md:text-left">
                                                    <h2 className="text-3xl font-black text-white mb-4 leading-tight">Master Your Institutional Path</h2>
                                                    <p className="text-indigo-200/70 text-sm leading-relaxed mb-6 font-medium">Continue your journey through the curriculum. Every module builds your knowledge and unlocks new institutional milestones.</p>
                                                    <button
                                                        onClick={() => setActiveTab('library')}
                                                        className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black tracking-widest uppercase hover:bg-gray-100 transition-all shadow-lg"
                                                    >
                                                        Continue Learning
                                                    </button>
                                                </div>
                                                <div className="w-full max-w-xs aspect-square border-4 border-white/5 rounded-[2.5rem] flex items-center justify-center bg-white/5 backdrop-blur-sm">
                                                    <BarChart className="w-24 h-24 text-white/10" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Test Pattern Drawer (Slider) */}
            {
                isPatternDrawerOpen && (
                    <div className="fixed inset-0 z-[100] flex justify-end">
                        <div
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                            onClick={() => setIsPatternDrawerOpen(false)}
                        />
                        <div className="relative w-full max-w-xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
                            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-slate-900 text-white">
                                <div>
                                    <h3 className="text-2xl font-black tracking-tight">University Test Pattern</h3>
                                    <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Institutional Entry Standards</p>
                                </div>
                                <button
                                    onClick={() => setIsPatternDrawerOpen(false)}
                                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                                {enrollments.find(e => e.university_id === activeUniversityId)?.university.test_pattern_markdown ? (
                                    <div className="prose prose-indigo max-w-none prose-sm">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                table: ({ node, ...props }) => (
                                                    <div className="overflow-x-auto my-6 rounded-2xl border border-gray-100 shadow-sm">
                                                        <table className="w-full border-collapse text-sm" {...props} />
                                                    </div>
                                                ),
                                                th: ({ node, ...props }) => <th className="bg-slate-50 border-b border-gray-100 px-4 py-3 text-left font-black text-slate-700 uppercase tracking-widest text-[10px]" {...props} />,
                                                td: ({ node, ...props }) => <td className="border-b border-gray-50 px-4 py-4 text-slate-600 font-medium" {...props} />,
                                                h1: ({ node, ...props }) => <h1 className="text-2xl font-black text-slate-900 mb-6 border-b-4 border-indigo-600 pb-2 inline-block" {...props} />,
                                                h2: ({ node, ...props }) => <h2 className="text-lg font-black text-slate-800 mb-4 mt-8 flex items-center gap-2 before:w-1.5 before:h-6 before:bg-indigo-600 before:rounded-full" {...props} />,
                                                strong: ({ node, ...props }) => <strong className="font-black text-indigo-600" {...props} />,
                                                p: ({ node, ...props }) => <p className="text-slate-600 leading-relaxed mb-4 font-medium" {...props} />
                                            }}
                                        >
                                            {enrollments.find(e => e.university_id === activeUniversityId)?.university.test_pattern_markdown}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center px-10">
                                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                            <FileText className="w-10 h-10 text-gray-200" />
                                        </div>
                                        <h4 className="text-xl font-black text-slate-900 mb-2">Pattern Awaiting Release</h4>
                                        <p className="text-slate-400 text-sm font-medium">The official entrance test pattern for this institution has not been uploaded to the portal yet. Check back soon for updates.</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-8 border-t border-gray-100 bg-gray-50/50">
                                <button
                                    onClick={() => setIsPatternDrawerOpen(false)}
                                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black tracking-widest uppercase hover:bg-slate-800 transition-all shadow-lg"
                                >
                                    Got it, thanks!
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
