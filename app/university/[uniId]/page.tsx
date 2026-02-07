'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import {
    BookOpen,
    CheckCircle,
    Clock,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    ChevronLeft,
    Play,
    Info,
    BarChart,
    GraduationCap,
    LogOut,
    FileText,
    ShieldAlert,
    Clock3,
    Trophy,
    ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';
import { useLoading } from '@/lib/context/LoadingContext';


import { useUI } from '@/lib/context/UIContext';

type ContentMap = {
    subject: { id: number; name: string };
    topics: {
        id: number;
        name: string;
        mcqCount?: number;
        content_markdown?: string;
        subtopics: { id: number; name: string; mcqCount?: number }[];
    }[];
};

export default function UniversityDetailPage() {
    const { isSidebarCollapsed } = useUI();
    const router = useRouter();
    const params = useParams();
    const uniId = Number(params.uniId);
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();

    const [user, setUser] = useState<any>(null);
    const [university, setUniversity] = useState<any>(null);
    const [enrollment, setEnrollment] = useState<any>(null);
    const [content, setContent] = useState<ContentMap[]>([]);
    const [expandedTopic, setExpandedTopic] = useState<number | null>(null);
    const [expandedSubject, setExpandedSubject] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'library' | 'insights' | 'exams' | 'pattern'>('library');
    const [stats, setStats] = useState<any>(null);
    const [exams, setExams] = useState<any[]>([]);
    const [progressMap, setProgressMap] = useState<Record<number, { isRead: boolean; isMastered: boolean }>>({});

    useEffect(() => {
        const init = async () => {
            const u = AuthService.getCurrentUser();
            if (u) {
                setUser(u);
                setGlobalLoading(true, 'Loading University Content...');
                await fetchData(u.id);
            } else {
                router.push('/login');
            }
            // Small timeout to ensure loader is visible enough
            setTimeout(() => setGlobalLoading(false), 800);
        };

        init();
    }, [uniId]);


    async function fetchData(userId: string) {
        // 1. Fetch University Details
        const { data: uni } = await supabase.from('universities').select('*').eq('id', uniId).single();
        setUniversity(uni);

        // 2. Check Enrollment
        const { data: enroll } = await supabase
            .from('student_university_enrollments')
            .select('*, university:universities(*)')
            .eq('student_id', userId)
            .eq('university_id', uniId)
            .single();

        if (!enroll || enroll.status !== 'approved') {
            toast.error("You are not enrolled in this university or access is pending.");
            router.push('/university');
            return;
        }
        setEnrollment(enroll);

        // 3. Load Content & Progress
        await Promise.all([
            loadContent(uniId, enroll.institution_id),
            loadStudentProgress(userId),
            loadUniversityStats(userId, uniId),
            loadExams(userId, uniId)
        ]);
    }

    async function loadContent(uniId: number, institutionId?: number | null) {
        let access: any[] | null = null;
        if (institutionId) {
            const { data } = await supabase.from('university_content_access').select(`
                subject:subjects(id, name),
                topic:topics(id, name, content_markdown),
                subtopic:subtopics(id, name, topic_id),
                session_limit
            `).eq('university_id', uniId).eq('institution_id', institutionId).eq('is_active', true);
            if (data && data.length > 0) access = data;
        }
        if (!access) {
            const { data } = await supabase.from('university_content_access').select(`
                subject:subjects(id, name),
                topic:topics(id, name, content_markdown),
                subtopic:subtopics(id, name, topic_id),
                session_limit
            `).eq('university_id', uniId).is('institution_id', null).eq('is_active', true);
            access = data;
        }

        // 3. Fetch MCQ counts with fallback
        const mcqSubtopicMap: Record<number, number> = {};
        const mcqTopicMap: Record<number, number> = {};

        const { data: mcqs } = await supabase.from('mcqs').select('subtopic_id, topic_id').eq('is_active', true);
        mcqs?.forEach((m: any) => {
            if (m.subtopic_id) {
                mcqSubtopicMap[m.subtopic_id] = (mcqSubtopicMap[m.subtopic_id] || 0) + 1;
            } else if (m.topic_id) {
                mcqTopicMap[m.topic_id] = (mcqTopicMap[m.topic_id] || 0) + 1;
            }
        });

        if (access) {
            const subjectMap = new Map<number, ContentMap>();
            (access as any[]).forEach((row) => {
                if (!row.subject) return;
                if (!subjectMap.has(row.subject.id)) {
                    subjectMap.set(row.subject.id, { subject: row.subject, topics: [] });
                }
                const currentSubject = subjectMap.get(row.subject.id)!;
                if (row.topic) {
                    let topic = currentSubject.topics.find(t => t.id === row.topic.id);
                    if (!topic) {
                        const newTopic = {
                            ...row.topic,
                            subtopics: [],
                            mcqCount: mcqTopicMap[row.topic.id] || 0
                        };
                        currentSubject.topics.push(newTopic);
                        topic = newTopic;
                    }
                    if (row.subtopic && row.subtopic.topic_id === row.topic.id && topic) {
                        if (topic.subtopics && !topic.subtopics.find(st => st.id === row.subtopic.id)) {
                            const subtopicWithCount = { ...row.subtopic, mcqCount: mcqSubtopicMap[row.subtopic.id] || 0 };
                            topic.subtopics.push(subtopicWithCount);
                            topic.mcqCount = (topic.mcqCount || 0) + subtopicWithCount.mcqCount;
                        }
                    }
                }
            });
            setContent(Array.from(subjectMap.values()));
        }
    }

    async function loadStudentProgress(userId: string) {
        const { data: readData } = await supabase.from('subtopic_progress').select('subtopic_id, is_completed').eq('student_id', userId);
        const { data: practiceData } = await supabase.from('practice_sessions').select('subtopic_id, score_percentage').eq('student_id', userId).gte('score_percentage', 60);
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
    }

    async function loadUniversityStats(userId: string, uniId: number) {
        const { data } = await supabase.from('practice_sessions').select('*').eq('student_id', userId).eq('university_id', uniId).eq('is_completed', true);
        if (data) {
            const totalSessions = data.length;
            const avgScore = totalSessions > 0 ? data.reduce((acc, s) => acc + (s.score_percentage || 0), 0) / totalSessions : 0;
            const totalTime = data.reduce((acc, s) => acc + s.time_spent_seconds, 0);
            setStats({ totalSessions, avgScore: Math.round(avgScore), totalTime: Math.round(totalTime / 60) });
        }
    }

    async function loadExams(studentId: string, uniId: number) {
        // Fetch student's institution link first if possible
        const { data: enroll } = await supabase
            .from('student_university_enrollments')
            .select('institution_id')
            .eq('student_id', studentId)
            .eq('university_id', uniId)
            .single();

        const instId = enroll?.institution_id;

        // Query for exams that are EITHER:
        // 1. Global (institution_id is null)
        // 2. Specific to the student's institution
        const query = supabase
            .from('university_exams')
            .select('*')
            .eq('university_id', uniId)
            .eq('is_active', true);

        if (instId) {
            // Filter: (institution_id IS NULL OR institution_id = instId)
            query.or(`institution_id.is.null,institution_id.eq.${instId}`);
        } else {
            // Filter: institution_id IS NULL
            query.is('institution_id', null);
        }

        const { data } = await query;
        setExams(data || []);
    }

    function calculateCompletion() {
        if (content.length === 0) return 0;
        let total = 0; let completed = 0;
        content.forEach(subject => {
            subject.topics.forEach(topic => {
                topic.subtopics.forEach(st => {
                    total++;
                    if (progressMap[st.id]?.isMastered) completed++;
                });
            });
        });
        return total > 0 ? Math.round((completed / total) * 100) : 0;
    }

    const handleUnenroll = async () => {
        if (!confirm('Are you sure you want to unenroll?')) return;
        const { error } = await supabase.from('student_university_enrollments').delete().eq('student_id', user.id).eq('university_id', uniId);
        if (!error) router.push('/university');
    };

    if (loading) return null;

    return (

        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="student" />
            <div className="flex-1 flex flex-col">
                <Header userName={user?.full_name} userEmail={user?.email} userAvatar={user?.avatar_url} />

                <main className={`${isSidebarCollapsed ? 'lg:ml-24' : 'lg:ml-72'} pt-28 lg:pt-24 p-4 lg:p-8 transition-all duration-300`}>
                    {!university ? null : (
                        <div className="max-w-7xl mx-auto space-y-8 bg-white/60 backdrop-blur-sm p-4 lg:p-8 rounded-[2rem] lg:rounded-[3rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">


                            <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
                                <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 pb-6 border-b border-slate-100/80">
                                    <div className="flex items-center gap-4 sm:gap-6 w-full">
                                        <Link
                                            href="/university"
                                            className="w-12 h-12 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-teal-600 hover:border-teal-600 transition-all shadow-sm bg-white shrink-0 group"
                                        >
                                            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                                        </Link>
                                        <div className="flex items-center gap-4 lg:gap-6 flex-1 min-w-0">
                                            <div className="w-16 h-16 lg:w-20 lg:h-20 bg-white rounded-[1.5rem] shadow-xl shadow-teal-100/50 border border-slate-100 p-3 shrink-0 flex items-center justify-center overflow-hidden">
                                                {university?.logo_url ? (
                                                    <img src={university.logo_url} alt="Logo" className="w-full h-full object-contain" />
                                                ) : (
                                                    <span className="text-2xl font-black text-teal-600 uppercase">
                                                        {university?.name?.substring(0, 1)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] mb-1">Campus Portal</span>
                                                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-teal-900 tracking-tight leading-tight truncate">
                                                        {university?.name}
                                                    </h1>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        {(!user?.institution_id) && (
                                            <button
                                                onClick={handleUnenroll}
                                                className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all border border-rose-100 shadow-sm"
                                            >
                                                <LogOut className="w-4 h-4 mr-2" />
                                                Unenroll
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                                    <div className="flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50 whitespace-nowrap">
                                        {[
                                            { id: 'library', label: 'Curriculum', icon: BookOpen },
                                            { id: 'exams', label: 'Examinations', icon: FileText },
                                            { id: 'pattern', label: 'Test Pattern', icon: ShieldAlert },
                                            { id: 'insights', label: 'Analytics', icon: BarChart }
                                        ].map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id as any)}
                                                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all duration-300 ${activeTab === tab.id
                                                    ? 'bg-teal-900 text-white shadow-xl shadow-teal-200 translate-y-[-1px]'
                                                    : 'text-slate-500 hover:text-teal-900 hover:bg-white/50'
                                                    }`}
                                            >
                                                <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-teal-400' : 'text-slate-400'}`} />
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {activeTab === 'exams' ? (
                                    <div className="space-y-8">
                                        {/* Institution Exams Section */}
                                        {exams.filter(e => e.institution_id !== null).length > 0 && (
                                            <div>
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center">
                                                        <GraduationCap className="w-5 h-5 text-amber-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-black text-slate-900">Institution Tests</h3>
                                                        <p className="text-xs text-slate-500 font-medium">Created by your institution</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {exams.filter(e => e.institution_id !== null).map(exam => (
                                                        <div
                                                            key={exam.id}
                                                            className="group relative bg-white rounded-[2.5rem] border border-amber-100 overflow-hidden shadow-xl shadow-amber-100/50 hover:shadow-2xl hover:shadow-amber-100/30 transition-all duration-500"
                                                        >
                                                            <div className="bg-gradient-to-br from-amber-600 via-amber-500 to-orange-600 p-8 pb-12 relative overflow-hidden">
                                                                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                                                                <div className="relative z-10 flex justify-between items-start mb-6">
                                                                    <div className="flex gap-2">
                                                                        <div className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-full border border-white/20 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                                                                            <GraduationCap className="w-3.5 h-3.5" /> Institution
                                                                        </div>
                                                                        <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                                                                            <Clock className="w-3.5 h-3.5" /> {exam.total_duration} MINS
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <h3 className="relative z-10 text-3xl font-black text-white tracking-tighter mb-2">{exam.name}</h3>
                                                            </div>
                                                            <div className="p-8 -mt-6 relative z-20">
                                                                <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-50 space-y-6">
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 flex flex-col gap-1">
                                                                            <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Attempt Policy</span>
                                                                            <span className="text-xs font-black text-slate-700 uppercase">{exam.allow_reattempt ? 'UNRESTRICTED' : 'SINGLE'}</span>
                                                                        </div>
                                                                        <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 flex flex-col gap-1">
                                                                            <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Result</span>
                                                                            <span className="text-xs font-black text-slate-700 uppercase">{exam.result_release_setting === 'instant' ? 'IMMEDIATE' : 'DEFERRED'}</span>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => router.push(`/university/${uniId}/exam/${exam.id}`)}
                                                                        className="w-full py-5 bg-amber-600 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.25em] hover:bg-amber-700 transition-all shadow-2xl shadow-amber-900/20 flex items-center justify-center gap-3"
                                                                    >
                                                                        Start Test <ArrowRight className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Global/University Exams Section */}
                                        <div>
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="w-10 h-10 bg-teal-100 rounded-2xl flex items-center justify-center">
                                                    <FileText className="w-5 h-5 text-teal-600" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-slate-900">University Official Exams</h3>
                                                    <p className="text-xs text-slate-500 font-medium">Standard university assessments</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {exams.filter(e => e.institution_id === null).length === 0 ? (
                                                    <div className="col-span-full py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200 text-center">
                                                        <FileText className="w-16 h-16 mx-auto mb-4 text-slate-100" />
                                                        <h3 className="text-xl font-bold text-slate-900">No Official Exams Scheduled</h3>
                                                        <p className="text-slate-500 font-medium">Check back later for university examinations.</p>
                                                    </div>
                                                ) : (
                                                    exams.filter(e => e.institution_id === null).map(exam => (
                                                        <div
                                                            key={exam.id}
                                                            className="group relative bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-xl shadow-slate-100/50 hover:shadow-2xl hover:shadow-teal-100/20 transition-all duration-500"
                                                        >
                                                            <div className="bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-950 p-8 pb-12 relative overflow-hidden">
                                                                <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                                                                <div className="relative z-10 flex justify-between items-start mb-6">
                                                                    <div className="px-5 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                                                                        <Clock className="w-3.5 h-3.5 text-teal-300" /> {exam.total_duration} MINS
                                                                    </div>
                                                                    <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                                                                        <FileText className="w-6 h-6 text-teal-400" />
                                                                    </div>
                                                                </div>
                                                                <h3 className="relative z-10 text-3xl font-black text-white tracking-tighter mb-2 group-hover:translate-x-1 transition-transform">{exam.name}</h3>
                                                                <span className="relative z-10 text-teal-300/80 text-[10px] font-black uppercase tracking-[0.2em]">Session ID: #AX-{exam.id.toString().padStart(4, '0')}</span>
                                                            </div>

                                                            <div className="p-8 -mt-6 relative z-20">
                                                                <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-50 space-y-6">
                                                                    <p className="text-slate-500 text-sm font-medium leading-relaxed">
                                                                        Formal evaluation aligned with your current academic session objectives.
                                                                    </p>

                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-1">
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Attempt Policy</span>
                                                                            <span className="text-xs font-black text-slate-700 uppercase">{exam.allow_reattempt ? 'UNRESTRICTED' : 'SINGLE ATTEMPT'}</span>
                                                                        </div>
                                                                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-1">
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Result Delivery</span>
                                                                            <span className="text-xs font-black text-slate-700 uppercase">{exam.result_release_setting === 'instant' ? 'IMMEDIATE' : 'DEFERRED'}</span>
                                                                        </div>
                                                                    </div>

                                                                    <button
                                                                        onClick={() => router.push(`/university/${uniId}/exam/${exam.id}`)}
                                                                        className="w-full py-5 bg-teal-800 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.25em] hover:bg-teal-700 transition-all shadow-2xl shadow-teal-900/20 active:scale-[0.98] flex items-center justify-center gap-3 group/btn"
                                                                    >
                                                                        Initialize Examination
                                                                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        {exams.length === 0 && (
                                            <div className="py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200 text-center">
                                                <FileText className="w-16 h-16 mx-auto mb-4 text-slate-100" />
                                                <h3 className="text-xl font-bold text-slate-900">No Exams Available</h3>
                                                <p className="text-slate-500 font-medium">Check back later for mock tests and examinations.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : activeTab === 'library' ? (
                                    <div className="grid grid-cols-1 gap-8">
                                        {content.length > 0 ? content.map((subjectItem) => (
                                            <div key={subjectItem.subject.id} className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-xl shadow-slate-100/50 hover:shadow-2xl hover:shadow-teal-100/20 transition-all duration-500">
                                                <div className="relative overflow-hidden bg-gradient-to-br from-teal-900 via-teal-800 to-emerald-950 rounded-t-[2.5rem] p-8 cursor-pointer group hover:from-teal-800 hover:via-teal-700 hover:to-emerald-900 transition-all duration-300"
                                                    onClick={() => setExpandedSubject(expandedSubject === subjectItem.subject.id ? null : subjectItem.subject.id)}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                    <div className="flex items-start justify-between">
                                                        <div className="relative z-10 flex-1">
                                                            <span className="text-teal-400 text-[10px] font-black uppercase tracking-[0.25em] mb-2 block">Foundational Curriculum</span>
                                                            <h3 className="text-2xl font-black text-white tracking-tight">{subjectItem.subject.name}</h3>
                                                        </div>
                                                        <div className="relative z-10 flex items-center gap-3">
                                                            <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
                                                                <BookOpen className="w-7 h-7 text-teal-300" />
                                                            </div>
                                                            {expandedSubject === subjectItem.subject.id ?
                                                                <ChevronUp className="w-6 h-6 text-white/60 group-hover:text-white transition-colors" /> :
                                                                <ChevronDown className="w-6 h-6 text-white/60 group-hover:text-white transition-colors" />
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                                {expandedSubject === subjectItem.subject.id && (
                                                    <>
                                                        <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                                                            <div className="flex items-center justify-between px-6 text-[10px] font-black text-teal-600 uppercase tracking-[0.15em]">
                                                                <span>Available Learning Modules</span>
                                                                <span className="bg-teal-600 text-white px-3 py-1 rounded-full text-xs">{subjectItem.topics.length} Topics</span>
                                                            </div>
                                                        </div>
                                                        <div className="p-8 space-y-4">
                                                            {subjectItem.topics.map(topic => (
                                                                <div key={topic.id} className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm transition-all hover:border-teal-100">
                                                                    <div
                                                                        className="w-full flex items-center justify-between p-5 text-left group transition-colors hover:bg-teal-50/30"
                                                                    >
                                                                        <div
                                                                            className="flex items-center gap-4 cursor-pointer flex-1"
                                                                            onClick={() => {
                                                                                if (topic.subtopics.length > 0) {
                                                                                    setExpandedTopic(expandedTopic === topic.id ? null : topic.id)
                                                                                }
                                                                            }}
                                                                        >
                                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all shadow-sm ${expandedTopic === topic.id ? 'bg-teal-600 text-white' : ((topic.mcqCount || 0) > 0 ? 'bg-teal-50 text-teal-700' : 'bg-slate-50 text-slate-400')}`}>
                                                                                {topic.mcqCount || 0}
                                                                            </div>
                                                                            <div>
                                                                                <h4 className="font-bold text-slate-800">{topic.name}</h4>
                                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                                                                    {topic.subtopics.length > 0
                                                                                        ? `${topic.subtopics.length} Learning Modules Available`
                                                                                        : 'Direct Knowledge Module'}
                                                                                </p>
                                                                            </div>
                                                                        </div>

                                                                        {topic.subtopics.length > 0 ? (
                                                                            <div onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)} className="cursor-pointer">
                                                                                {expandedTopic === topic.id ? <ChevronUp className="w-5 h-5 text-teal-600" /> : <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-teal-500" />}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex items-center gap-2">
                                                                                <button
                                                                                    onClick={() => router.push(`/university/${uniId}/lesson/topic/${topic.id}`)}
                                                                                    className="px-4 py-2 bg-white text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all border border-slate-200 shadow-sm"
                                                                                >
                                                                                    Read
                                                                                </button>
                                                                                {(topic.mcqCount || 0) > 0 && (
                                                                                    <button
                                                                                        onClick={() => router.push(`/university/${uniId}/practice/topic/${topic.id}`)}
                                                                                        className="px-4 py-2 bg-teal-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-teal-700 transition-all shadow-sm"
                                                                                    >
                                                                                        Practice
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {expandedTopic === topic.id && (
                                                                        <div className="px-5 pb-5 pt-0 space-y-2 animate-slide-down">
                                                                            {topic.subtopics.map(subtopic => {
                                                                                const status = progressMap[subtopic.id] || { isRead: false, isMastered: false };
                                                                                return (
                                                                                    <div key={subtopic.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-100/30 group hover:bg-white transition-all border border-transparent hover:border-indigo-100 shadow-sm">
                                                                                        <Link
                                                                                            href={`/university/${uniId}/lesson/${subtopic.id}`}
                                                                                            className="flex items-center gap-4 flex-1"
                                                                                        >
                                                                                            {status.isRead ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Clock className="w-5 h-5 text-slate-300" />}
                                                                                            <span className={`text-sm font-bold ${status.isRead ? 'text-slate-900' : 'text-slate-500'}`}>{subtopic.name}</span>
                                                                                        </Link>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <button
                                                                                                onClick={() => router.push(`/university/${uniId}/lesson/${subtopic.id}`)}
                                                                                                className="px-4 py-2 bg-white text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all border border-slate-200 shadow-sm"
                                                                                            >
                                                                                                Read
                                                                                            </button>
                                                                                            {(subtopic as any).mcqCount > 0 && (
                                                                                                <button
                                                                                                    onClick={() => router.push(`/university/${uniId}/practice/${subtopic.id}`)}
                                                                                                    className="px-4 py-2 bg-teal-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-teal-700 transition-all shadow-sm"
                                                                                                >
                                                                                                    Practice
                                                                                                </button>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )) : (
                                            <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                                                <BookOpen className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                                                <p className="text-slate-500 font-medium">Curriculum not available for this university.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : activeTab === 'pattern' ? (
                                    <div className="bg-white rounded-[2.5rem] p-12 border border-gray-100 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
                                        <div className="relative z-10 prose prose-slate max-w-none">
                                            <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-4">
                                                <ShieldAlert className="w-8 h-8 text-teal-600" />
                                                University Test Pattern
                                            </h2>
                                            {university?.test_pattern_markdown ? (
                                                <MarkdownRenderer content={university.test_pattern_markdown} />

                                            ) : (
                                                <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                                    <Info className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                                    <p className="text-slate-500 font-medium">No official test pattern documented for this university.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : activeTab === 'insights' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center">
                                            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mb-6">
                                                <Trophy className="w-8 h-8 text-teal-600" />
                                            </div>
                                            <h3 className="text-3xl font-black text-slate-900 mb-1">{stats?.avgScore || 0}%</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Average Mastery</p>
                                        </div>
                                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center">
                                            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mb-6">
                                                <Clock3 className="w-8 h-8 text-teal-600" />
                                            </div>
                                            <h3 className="text-3xl font-black text-slate-900 mb-1">{stats?.totalTime || 0}m</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time Invested</p>
                                        </div>
                                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center">
                                            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-6">
                                                <GraduationCap className="w-8 h-8 text-amber-600" />
                                            </div>
                                            <h3 className="text-3xl font-black text-slate-900 mb-1">{stats?.totalSessions || 0}</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Practice Missions</p>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}






