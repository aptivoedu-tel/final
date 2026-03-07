"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/shared/Footer';
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
    ArrowRight,
    Search,
    FlaskConical,
    Atom,
    Calculator,
    Languages
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useLoading } from '@/lib/context/LoadingContext';
import { useUI } from '@/lib/context/UIContext';

const MarkdownRenderer = dynamic(() => import('@/components/shared/MarkdownRenderer'), { ssr: false });

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

type LearningModule = {
    id: number;
    name: string;
    type: string;
    parentTopicName: string;
    isSubtopic: boolean;
    topicId: number;
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
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
    const [moduleSearch, setModuleSearch] = useState('');
    const [contentLoading, setContentLoading] = useState(true);

    useEffect(() => {
        if (isNaN(uniId)) {
            toast.error("Invalid university ID");
            router.push('/university');
            return;
        }

        const init = async () => {
            setGlobalLoading(true, 'Loading University Content...');
            try {
                const u = AuthService.getCurrentUser() || await AuthService.syncSession();
                if (u) {
                    setUser(u);
                    await fetchData(u.id);
                } else {
                    router.push('/login');
                }
            } catch (error) {
                console.error("Initialization error:", error);
                toast.error("Failed to load university data.");
            } finally {
                setTimeout(() => setGlobalLoading(false), 800);
            }
        };

        init();
    }, [uniId]);


    async function fetchData(userId: string) {
        // 1. Fetch University Details from MongoDB
        const uniRes = await fetch(`/api/mongo/universities?id=${uniId}`);
        const uniData = await uniRes.json();
        const uni = uniData.universities?.find((u: any) => u.id === uniId);

        if (!uni) {
            toast.error("University not found.");
            router.push('/university');
            return;
        }
        setUniversity(uni);

        // 2. Check Enrollment from MongoDB
        const enrollRes = await fetch(`/api/mongo/profile/universities?student_id=${userId}`);
        const enrollData = await enrollRes.json();
        const enroll = (enrollData.universities || []).find(
            (e: any) => e.university_id === uniId || e.universities?.id === uniId
        );

        if (!enroll) {
            toast.error("You are not enrolled in this university or access is pending.");
            router.push('/university');
            return;
        }
        setEnrollment(enroll);

        // Get institutionId from the current user session (not from stale state)
        const currentUser = AuthService.getCurrentUser();
        const institutionId = currentUser?.institution_id || null;

        // 3. Load Content & Progress
        await Promise.all([
            loadContent(uniId, institutionId),
            loadStudentProgress(userId),
            loadUniversityStats(userId, uniId),
            loadExams(userId, uniId, institutionId)
        ]);
    }

    async function loadContent(uniId: number, institutionId?: number | null) {
        setContentLoading(true);
        try {
            // Use our new content-access API which joins data
            const res = await fetch(`/api/mongo/universities/content-access?university_id=${uniId}&institution_id=${institutionId || 'null'}`);
            const data = await res.json();
            const access = data.mappings || [];

            // 2. Fetch MCQ counts (efficiently using counts_only=true)
            const mcqRes = await fetch(`/api/mongo/mcqs?counts_only=true`);
            const mcqData = await mcqRes.json();

            const mcqSubtopicMap: Record<number, number> = {};
            const mcqTopicMap: Record<number, number> = {};

            if (mcqData.allMcqs) {
                mcqData.allMcqs.forEach((m: any) => {
                    if (m.subtopic_id) {
                        mcqSubtopicMap[m.subtopic_id] = (mcqSubtopicMap[m.subtopic_id] || 0) + 1;
                    }
                    if (m.topic_id) {
                        mcqTopicMap[m.topic_id] = (mcqTopicMap[m.topic_id] || 0) + 1;
                    }
                });
            }

            const subjectMap = new Map<number, ContentMap>();
            access.forEach((row: any) => {
                if (!row.subject) return;
                if (!subjectMap.has(row.subject.id)) {
                    subjectMap.set(row.subject.id, { subject: row.subject, topics: [] });
                }
                const currentSubject = subjectMap.get(row.subject.id)!;

                if (row.topic) {
                    let topic = (currentSubject.topics as any[]).find((t: any) => t.id === row.topic.id);
                    if (!topic) {
                        const newTopic = {
                            ...row.topic,
                            subtopics: [],
                            mcqCount: mcqTopicMap[row.topic.id] || 0
                        };
                        currentSubject.topics.push(newTopic);
                        topic = newTopic;
                    }

                    if (row.subtopic && topic) {
                        if (!(topic.subtopics as any[]).find((st: any) => st.id === row.subtopic.id)) {
                            const subtopicWithCount = {
                                ...row.subtopic,
                                mcqCount: mcqSubtopicMap[row.subtopic.id] || 0
                            };
                            topic.subtopics.push(subtopicWithCount);
                        }
                    }
                }
            });
            setContent(Array.from(subjectMap.values()));
        } finally {
            setContentLoading(false);
        }
    }

    async function loadStudentProgress(userId: string) {
        // Fetch progress from MongoDB
        const res = await fetch(`/api/mongo/progress?student_id=${userId}`);
        const data = await res.json();

        // Fetch mastery (high scores) from practice sessions
        const sessionRes = await fetch(`/api/mongo/practice?student_id=${userId}`);
        const sessionData = await sessionRes.json();
        const masterySessions = (sessionData.sessions || []).filter((s: any) => s.score_percentage >= 60);

        const map: Record<number, { isRead: boolean; isMastered: boolean }> = {};

        // Handle Subtopic Reading
        data.subtopic_progress?.forEach((r: any) => {
            if (!map[r.subtopic_id]) map[r.subtopic_id] = { isRead: false, isMastered: false };
            map[r.subtopic_id].isRead = r.is_completed;
        });

        // Handle Topic Reading
        data.topic_progress?.forEach((r: any) => {
            if (!map[r.topic_id]) map[r.topic_id] = { isRead: false, isMastered: false };
            map[r.topic_id].isRead = r.is_completed;
        });

        // Handle Practice Mastery
        masterySessions.forEach((p: any) => {
            const id = p.subtopic_id || p.topic_id;
            if (id) {
                if (!map[id]) map[id] = { isRead: false, isMastered: false };
                map[id].isMastered = true;
            }
        });

        setProgressMap(map);
    }


    async function loadUniversityStats(userId: string, uniId: number) {
        const res = await fetch(`/api/mongo/analytics?student_id=${userId}`);
        const data = await res.json();

        // The analytics API returns summary, but we need uni-specific stats
        // For now, using the summary directly or filtering if possible
        setStats({
            totalSessions: data.analytics?.total_sessions || 0,
            avgScore: data.analytics?.avg_score || 0,
            totalTime: data.analytics?.total_study_minutes || 0
        });
    }

    async function loadExams(userId: string, uniId: number, institutionId?: number | null) {
        // Only show: 
        //   - Public exams (institution_id = null) for all students
        //   - Institution-specific exams if the student belongs to that institution
        const params = new URLSearchParams({ university_id: String(uniId), active: 'true' });
        if (institutionId) {
            // Student has an institution: show public + their institution's exams
            params.set('institution_id', String(institutionId));
        } else {
            // No institution: only public exams
            params.set('institution_id', 'null');
        }
        const res = await fetch(`/api/mongo/exams?${params.toString()}`);
        const data = await res.json();
        setExams(data.exams || []);
    }

    function calculateCompletion() {
        if (content.length === 0) return 0;
        let total = 0; let completed = 0;
        content.forEach((subject: any) => {
            subject.topics.forEach((topic: any) => {
                if (topic.subtopics && topic.subtopics.length > 0) {
                    topic.subtopics.forEach((st: any) => {
                        total++;
                        if (progressMap[st.id]?.isMastered) completed++;
                    });
                } else {
                    total++;
                    if (progressMap[topic.id]?.isMastered) completed++;
                }
            });
        });
        return total > 0 ? Math.round((completed / total) * 100) : 0;
    }

    const calculateSubjectProgress = (subjectId: number) => {
        const subject = content.find((s: any) => s.subject.id === subjectId);
        if (!subject) return 0;
        let total = 0;
        let completed = 0;
        subject.topics.forEach((topic: any) => {
            if (topic.subtopics && topic.subtopics.length > 0) {
                topic.subtopics.forEach((st: any) => {
                    total++;
                    if (progressMap[st.id]?.isMastered) completed++;
                });
            } else {
                total++;
                if (progressMap[topic.id]?.isMastered) completed++;
            }
        });
        return total > 0 ? Math.round((completed / total) * 100) : 0;
    };

    const getSubjectIcon = (name: string) => {
        const lowercase = name.toLowerCase();
        if (lowercase.includes('chem')) return FlaskConical;
        if (lowercase.includes('phys')) return Atom;
        if (lowercase.includes('math')) return Calculator;
        if (lowercase.includes('eng')) return Languages;
        return BookOpen;
    };

    useEffect(() => {
        if (content.length > 0 && !selectedSubjectId) {
            setSelectedSubjectId(content[0].subject.id);
        }
    }, [content]);

    const activeSubject = content.find((s: any) => s.subject.id === selectedSubjectId);
    const flatModules: LearningModule[] = [];
    activeSubject?.topics.forEach((topic: any) => {
        if (topic.subtopics && topic.subtopics.length > 0) {
            topic.subtopics.forEach((st: any) => {
                flatModules.push({
                    id: st.id,
                    name: st.name,
                    type: 'Learning Module',
                    parentTopicName: topic.name,
                    isSubtopic: true,
                    topicId: topic.id
                });
            });
        } else {
            flatModules.push({
                id: topic.id,
                name: topic.name,
                type: 'Direct Knowledge',
                isSubtopic: false,
                parentTopicName: '',
                topicId: topic.id
            });
        }
    });

    const filteredModules = flatModules.filter((m: LearningModule) =>
        m.name.toLowerCase().includes(moduleSearch.toLowerCase()) ||
        (m.parentTopicName && m.parentTopicName.toLowerCase().includes(moduleSearch.toLowerCase()))
    );

    const handleUnenroll = async () => {
        if (!confirm('Are you sure you want to unenroll?')) return;
        try {
            const res = await fetch(`/api/mongo/profile/universities?student_id=${user.id}&university_id=${uniId}`, {
                method: 'DELETE'
            });
            if (res.ok) router.push('/university');
            else toast.error("Failed to unenroll.");
        } catch (e) {
            console.error(e);
            toast.error("An error occurred.");
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-black text-teal-600 uppercase tracking-[0.2em] animate-pulse">Loading University Content...</p>
            </div>
        </div>
    );

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
                                    <div className="max-w-[900px] mx-auto w-full animate-fade-in space-y-8">
                                        <div className="bg-white p-8 lg:p-12 rounded-[2.5rem] border border-slate-100 shadow-sm">
                                            <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-50">
                                                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                                                    <FileText className="w-6 h-6 text-teal-600" />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-black text-slate-800 tracking-tight">University Official Exams</h2>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Standard academic assessments</p>
                                                </div>
                                            </div>

                                            {exams.length > 0 ? (
                                                <div className="flex flex-col border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100">
                                                    {exams.map((exam) => (
                                                        <div key={exam.id} className="group p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6 text-left">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-3">
                                                                    <h3 className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors tracking-tight">{exam.exam_name || exam.name}</h3>
                                                                    <span className="text-[10px] font-medium py-0.5 px-2 bg-slate-100 text-slate-500 rounded uppercase tracking-tighter tabular-nums">
                                                                        ID: {exam.session_id || `#AX-${exam.id.toString().padStart(4, '0')}`}
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-[11px] font-bold text-slate-400">
                                                                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {exam.duration_minutes || exam.total_duration} Minutes</span>
                                                                    <span className="text-slate-200">•</span>
                                                                    <span className="flex items-center gap-1.5 capitalize">{(exam.attempt_policy || (exam.allow_reattempt ? 'unrestricted' : 'single')).replace('_', ' ')} Policy</span>
                                                                    <span className="text-slate-200">•</span>
                                                                    <span className="flex items-center gap-1.5 capitalize">{(exam.result_delivery || (exam.result_release_setting === 'instant' ? 'immediate' : 'deferred')).replace('_', ' ')} Delivery</span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => router.push(`/university/${uniId}/exam/${exam.id}`)}
                                                                className="shrink-0 px-6 py-2 bg-teal-600 text-white rounded text-[10px] font-black uppercase tracking-[0.2em] hover:bg-teal-700 active:scale-95 transition-all"
                                                            >
                                                                Start Exam
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-20 text-center space-y-4">
                                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                                                        <FileText className="w-8 h-8 text-slate-200" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">No active examinations</p>
                                                        <p className="text-xs text-slate-400">Please check back later for scheduled assessments.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : activeTab === 'library' ? (
                                    <div className="flex flex-col gap-8 min-h-[600px] animate-fade-in">
                                        {/* Horizontal Subjects Selection */}
                                        <div className="w-full overflow-x-auto no-scrollbar pb-2">
                                            <div className="flex items-center gap-4 p-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm min-w-max">
                                                <div className="px-6 py-3 border-r border-slate-100 hidden md:block">
                                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Core Subjects</h3>
                                                </div>
                                                <div className="flex items-center gap-2 px-2">
                                                    {content.map((s) => {
                                                        const Icon = getSubjectIcon(s.subject.name);
                                                        const isSelected = selectedSubjectId === s.subject.id;
                                                        const progress = calculateSubjectProgress(s.subject.id);
                                                        return (
                                                            <button
                                                                key={s.subject.id}
                                                                onClick={() => setSelectedSubjectId(s.subject.id)}
                                                                className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-300 group whitespace-nowrap ${isSelected
                                                                    ? 'bg-teal-600 text-white shadow-xl shadow-teal-900/10 scale-[1.02]'
                                                                    : 'hover:bg-slate-50 text-slate-600'
                                                                    }`}
                                                            >
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isSelected ? 'bg-white/20' : 'bg-slate-100'}`}>
                                                                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-teal-600'}`} />
                                                                </div>
                                                                <span className="font-bold text-sm tracking-tight">{s.subject.name}</span>
                                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-600'}`}>
                                                                    {progress}%
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Main Content Area */}
                                        <div className="w-full bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden flex flex-col shadow-sm">
                                            {/* Top Header */}
                                            <div className="p-8 lg:p-10 border-b border-slate-50 space-y-8">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                    <div className="space-y-2">
                                                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                                            {activeSubject?.subject.name}
                                                        </h2>
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex-1 h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-teal-500 transition-all duration-1000"
                                                                    style={{ width: `${calculateSubjectProgress(selectedSubjectId || 0)}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs font-black text-teal-600 uppercase tracking-widest tabular-nums">
                                                                {calculateSubjectProgress(selectedSubjectId || 0)}% Complete
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="relative group max-w-xs w-full">
                                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
                                                        <input
                                                            value={moduleSearch}
                                                            onChange={(e) => setModuleSearch(e.target.value)}
                                                            placeholder="Search modules..."
                                                            className="w-full pl-12 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-[1.5rem] text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-teal-500/5 focus:bg-white transition-all placeholder:text-slate-300"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Modules List */}
                                            <div className="flex-1 overflow-auto">
                                                {activeSubject ? (
                                                    <div className="min-w-full">
                                                        <div className="hidden md:grid grid-cols-12 gap-4 px-10 py-5 border-b border-slate-50 bg-slate-50/30 sticky top-0 z-10 backdrop-blur-sm">
                                                            <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</div>
                                                            <div className="col-span-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Module Details</div>
                                                            <div className="col-span-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Control</div>
                                                        </div>
                                                        <div className="divide-y divide-slate-100">
                                                            {activeSubject?.topics.map((topic, tIdx) => {
                                                                const hasSubtopics = topic.subtopics && topic.subtopics.length > 0;
                                                                const isExpanded = expandedTopic === topic.id;

                                                                const topicMatches = topic.name.toLowerCase().includes(moduleSearch.toLowerCase());
                                                                const subtopicMatches = topic.subtopics?.some(st => st.name.toLowerCase().includes(moduleSearch.toLowerCase()));
                                                                if (moduleSearch && !topicMatches && !subtopicMatches) return null;

                                                                return (
                                                                    <div key={topic.id} className="flex flex-col">
                                                                        <div
                                                                            onClick={() => hasSubtopics && setExpandedTopic(isExpanded ? null : topic.id)}
                                                                            className={`grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-8 lg:px-10 py-6 hover:bg-slate-50/50 transition-all group ${hasSubtopics ? 'cursor-pointer' : ''}`}
                                                                        >
                                                                            <div className="col-span-3 flex items-center gap-2">
                                                                                {!hasSubtopics ? (
                                                                                    (() => {
                                                                                        const status = progressMap[topic.id] || { isRead: false, isMastered: false };
                                                                                        return status.isMastered ? (
                                                                                            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100/50">
                                                                                                <CheckCircle className="w-3.5 h-3.5" />
                                                                                                <span className="text-[10px] font-black uppercase tracking-widest">Mastered</span>
                                                                                            </div>
                                                                                        ) : status.isRead ? (
                                                                                            <div className="flex items-center gap-2 text-amber-500 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100/50">
                                                                                                <Clock className="w-3.5 h-3.5" />
                                                                                                <span className="text-[10px] font-black uppercase tracking-widest">Reading</span>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="flex items-center gap-2 text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                                                                                <Clock className="w-3.5 h-3.5" />
                                                                                                <span className="text-[10px] font-black uppercase tracking-widest">Pending</span>
                                                                                            </div>
                                                                                        );
                                                                                    })()
                                                                                ) : (
                                                                                    <div className="flex items-center gap-2 text-teal-600 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100/50">
                                                                                        <BookOpen className="w-3.5 h-3.5" />
                                                                                        <span className="text-[10px] font-black uppercase tracking-widest">Module</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className="col-span-5 flex items-center gap-6">
                                                                                <span className="hidden md:block text-xs font-black text-slate-200 w-6 tabular-nums">{tIdx + 1}</span>
                                                                                <div className="flex items-center gap-3">
                                                                                    <div>
                                                                                        <p className={`font-bold text-slate-900 transition-colors leading-tight ${hasSubtopics ? 'group-hover:text-teal-700' : 'group-hover:text-teal-600'}`}>{topic.name}</p>
                                                                                        {hasSubtopics && (
                                                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{topic.subtopics.length} Sections inside</p>
                                                                                        )}
                                                                                    </div>
                                                                                    {hasSubtopics && (
                                                                                        <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                                                                            <ChevronDown className="w-4 h-4 text-slate-400" />
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div className="col-span-4 flex items-center justify-end gap-3">
                                                                                {!hasSubtopics ? (
                                                                                    <>
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); router.push(`/university/${uniId}/lesson/topic/${topic.id}`); }}
                                                                                            className="flex items-center gap-2.5 px-5 py-2.5 bg-white text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all border border-slate-100 hover:border-teal-100 group/read"
                                                                                        >
                                                                                            <BookOpen className="w-4 h-4 text-slate-400 group-hover/read:text-teal-600 transition-colors" />
                                                                                            <span className="text-[10px] font-black uppercase tracking-widest">Read</span>
                                                                                        </button>
                                                                                        {(topic.mcqCount || 0) > 0 && (
                                                                                            <button
                                                                                                onClick={(e) => { e.stopPropagation(); router.push(`/university/${uniId}/practice/topic/${topic.id}`); }}
                                                                                                className="px-6 py-2.5 bg-teal-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-teal-700 active:scale-95 transition-all shadow-lg shadow-teal-900/10 flex items-center gap-2.5"
                                                                                            >
                                                                                                Practice <ArrowRight className="w-3.5 h-3.5" />
                                                                                            </button>
                                                                                        )}
                                                                                    </>
                                                                                ) : (
                                                                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-4">{isExpanded ? 'Collapse' : 'Expand'}</span>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {hasSubtopics && isExpanded && (
                                                                            <div className="bg-slate-50/30 border-y border-slate-50 animate-slide-down">
                                                                                {topic.subtopics.map((st, sIdx) => {
                                                                                    const status = progressMap[st.id] || { isRead: false, isMastered: false };
                                                                                    if (moduleSearch && !st.name.toLowerCase().includes(moduleSearch.toLowerCase()) && !topicMatches) return null;

                                                                                    return (
                                                                                        <div key={st.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center px-12 lg:px-14 py-5 hover:bg-white transition-all group/sub">
                                                                                            <div className="col-span-3 flex items-center gap-2">
                                                                                                {status.isMastered ? (
                                                                                                    <div className="flex items-center gap-2 text-emerald-600 bg-white px-3 py-1.5 rounded-xl border border-emerald-100/50 shadow-sm">
                                                                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                                                                        <span className="text-[10px] font-black uppercase tracking-widest">Mastered</span>
                                                                                                    </div>
                                                                                                ) : status.isRead ? (
                                                                                                    <div className="flex items-center gap-2 text-amber-500 bg-white px-3 py-1.5 rounded-xl border border-amber-100/50 shadow-sm">
                                                                                                        <Clock className="w-3.5 h-3.5" />
                                                                                                        <span className="text-[10px] font-black uppercase tracking-widest">Reading</span>
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    <div className="flex items-center gap-2 text-slate-400 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                                                                                                        <Clock className="w-3.5 h-3.5" />
                                                                                                        <span className="text-[10px] font-black uppercase tracking-widest">Pending</span>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                            <div className="col-span-5 flex items-center gap-4">
                                                                                                <div className="w-1 h-8 bg-slate-100 rounded-full" />
                                                                                                <div>
                                                                                                    <p className="font-bold text-slate-700 group-hover/sub:text-teal-600 transition-colors leading-tight">{st.name}</p>
                                                                                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mt-1">Section {tIdx + 1}.{sIdx + 1}</p>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="col-span-4 flex items-center justify-end gap-3">
                                                                                                <button
                                                                                                    onClick={() => router.push(`/university/${uniId}/lesson/${st.id}`)}
                                                                                                    className="flex items-center gap-2.5 px-4 py-2 bg-white text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all border border-slate-100 hover:border-teal-100 group/read"
                                                                                                >
                                                                                                    <BookOpen className="w-3.5 h-3.5 text-slate-400 group-hover/read:text-teal-600 transition-colors" />
                                                                                                    <span className="text-[10px] font-black uppercase tracking-widest">Read</span>
                                                                                                </button>
                                                                                                {(st.mcqCount || 0) > 0 && (
                                                                                                    <button
                                                                                                        onClick={() => router.push(`/university/${uniId}/practice/${st.id}`)}
                                                                                                        className="px-5 py-2 bg-teal-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-teal-700 active:scale-95 transition-all shadow-md flex items-center gap-2"
                                                                                                    >
                                                                                                        Practice <ArrowRight className="w-3 h-3" />
                                                                                                    </button>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ) : contentLoading ? (
                                                    <div className="py-10 px-10 space-y-4 animate-pulse">
                                                        {[...Array(5)].map((_, i) => (
                                                            <div key={i} className="grid grid-cols-12 gap-4 items-center px-4 py-5 border-b border-slate-50">
                                                                <div className="col-span-3">
                                                                    <div className="h-7 w-24 bg-slate-100 rounded-xl" />
                                                                </div>
                                                                <div className="col-span-5">
                                                                    <div className="h-4 w-40 bg-slate-100 rounded-lg mb-2" />
                                                                    <div className="h-3 w-24 bg-slate-50 rounded-lg" />
                                                                </div>
                                                                <div className="col-span-4 flex justify-end gap-3">
                                                                    <div className="h-9 w-16 bg-slate-100 rounded-xl" />
                                                                    <div className="h-9 w-24 bg-teal-100 rounded-xl" />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="py-20 text-center">
                                                        <BookOpen className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                                                        <p className="font-bold text-slate-900">No content available</p>
                                                        <p className="text-xs text-slate-400">This subject doesn't have any modules yet.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : activeTab === 'pattern' ? (
                                    <div className="bg-white rounded-[2.5rem] p-12 border border-slate-100 shadow-sm relative overflow-hidden animate-fade-in text-left">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
                                        <div className="relative z-10 prose prose-slate max-w-none">
                                            <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-50">
                                                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                                                    <ShieldAlert className="w-6 h-6 text-teal-600" />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-black text-slate-800 tracking-tight">University Test Pattern</h2>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Official examination structure</p>
                                                </div>
                                            </div>

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
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
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
                    <Footer />
                </main>
            </div>
        </div>
    );
}
