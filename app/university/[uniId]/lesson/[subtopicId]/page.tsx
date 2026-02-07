'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { BookOpen, ChevronLeft, Play, GraduationCap, Clock, CheckCircle, BarChart, MoveRight } from 'lucide-react';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';

import Link from 'next/link';
import { useUI } from '@/lib/context/UIContext';

export default function LessonReaderPage() {
    const { isSidebarCollapsed } = useUI();
    const params = useParams();
    const router = useRouter();
    const uniId = params.uniId as string;
    const subtopicId = params.subtopicId as string;

    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState<string>('student');
    const [subtopic, setSubtopic] = useState<any>(null);
    const [topic, setTopic] = useState<any>(null);
    const [subject, setSubject] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [mcqCount, setMcqCount] = useState(0);

    useEffect(() => {
        const currentUser = AuthService.getCurrentUser();
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('aptivo_user') : null;
        const userData = currentUser || (storedUser ? JSON.parse(storedUser) : null);

        if (userData) {
            setUser(userData);
            setUserRole(userData.role || 'student');
        }

        if (subtopicId) {
            loadLessonData();
        }
    }, [subtopicId]);

    const loadLessonData = async () => {
        try {
            // 1. Fetch subtopic
            const { data: st, error: stError } = await supabase
                .from('subtopics')
                .select('*, topic:topics(*)')
                .eq('id', subtopicId)
                .single();

            if (stError) throw stError;
            setSubtopic(st);
            setTopic(st.topic);

            // 2. Fetch subject
            if (st.topic) {
                const { data: sub, error: subError } = await supabase
                    .from('subjects')
                    .select('*')
                    .eq('id', st.topic.subject_id)
                    .single();
                if (subError) throw subError;
                setSubject(sub);
            }

            // 3. Fetch MCQ count
            const { count } = await supabase
                .from('mcqs')
                .select('*', { count: 'exact', head: true })
                .eq('subtopic_id', subtopicId)
                .eq('is_active', true);
            setMcqCount(count || 0);
        } catch (e: any) {
            console.error('Error loading lesson:', e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (userId: string, stId: number) => {
        try {
            await supabase
                .from('subtopic_progress')
                .upsert({
                    student_id: userId,
                    subtopic_id: stId,
                    is_completed: true,
                    reading_percentage: 100,
                    last_accessed_at: new Date().toISOString(),
                    completed_at: new Date().toISOString()
                }, { onConflict: 'student_id,subtopic_id' });

            // Update streak
            const { PracticeService } = await import('@/lib/services/practiceService');
            await PracticeService.updateStreak(userId);
        } catch (e) {
            console.error('Error marking progress:', e);
        }
    };

    useEffect(() => {
        if (user && subtopicId) {
            markAsRead(user.id, parseInt(subtopicId));
        }
    }, [user, subtopicId]);


    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 font-medium tracking-wide">Retrieving curriculum content...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
            <div className="bg-white p-12 rounded-[2rem] shadow-xl border border-red-100 text-center max-w-lg">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ChevronLeft className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Content Unavailable</h2>
                <p className="text-slate-500 mb-8">{error}</p>
                <Link href="/university" className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all">
                    <ChevronLeft className="w-4 h-4" />
                    Back to Library
                </Link>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole={userRole as any} />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'ml-28' : 'ml-80'}`}>
                <Header userName={user?.full_name || 'Student'} userEmail={user?.email || 'student@aptivo.edu'} />

                <main className="mt-16 p-8">
                    <div className="max-w-4xl mx-auto">
                        {/* Breadcrumbs */}
                        <nav className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-8 overflow-x-auto whitespace-nowrap pb-2">
                            <Link href={`/university/${uniId}`} className="hover:text-indigo-600 transition-colors">UNIVERSITY</Link>
                            <ChevronLeft className="w-4 h-4 rotate-180 flex-shrink-0" />
                            <Link href={`/university/${uniId}`} className="text-slate-600 truncate hover:text-indigo-600 transition-colors">{subject?.name?.toUpperCase()}</Link>
                            <ChevronLeft className="w-4 h-4 rotate-180 flex-shrink-0" />
                            <span className="text-indigo-600 truncate">{subtopic?.name?.toUpperCase()}</span>
                        </nav>

                        {/* Lesson Header */}
                        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 mb-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -translate-y-1/2 translate-x-1/2 -z-0" />

                            <div className="relative z-10">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-baseline gap-3">
                                        <div className="bg-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black text-white uppercase tracking-tighter">Lesson</div>
                                        <h1 className="text-4xl font-black text-slate-900 leading-tight">{subtopic?.name}</h1>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100 text-xs font-bold text-slate-500">
                                            <Clock className="w-3.5 h-3.5" />
                                            {subtopic?.estimated_minutes || '15'} MIN
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-4 items-center mt-2">
                                    <div className="flex items-center gap-2 text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100/50">
                                        <GraduationCap className="w-4 h-4 text-indigo-500" />
                                        <span className="text-xs font-bold uppercase">{subject?.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100/50">
                                        <BookOpen className="w-4 h-4 text-orange-500" />
                                        <span className="text-xs font-bold uppercase">{topic?.name}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                            <div className="lg:col-span-3">
                                <div className="bg-white p-10 rounded-[2rem] shadow-sm border border-gray-100 prose prose-slate max-w-none 
                                    prose-headings:font-black prose-headings:text-slate-900 prose-headings:tracking-tight prose-headings:mt-12 prose-headings:mb-6
                                    prose-h1:text-3xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base
                                    prose-p:text-slate-700 prose-p:leading-loose prose-p:mb-10
                                    prose-ul:my-8 prose-li:text-slate-700 prose-li:my-2 prose-li:leading-loose
                                    prose-strong:text-slate-900 prose-strong:font-black
                                    prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs prose-code:font-mono prose-code:text-indigo-600
                                    prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-xl prose-pre:p-5
                                    prose-img:rounded-2xl prose-img:shadow-xl prose-img:mx-auto prose-img:my-10
                                    prose-hr:my-16 prose-hr:border-slate-200
                                    prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50/50 prose-blockquote:p-6 prose-blockquote:rounded-r-xl prose-blockquote:my-8 prose-blockquote:not-italic
                                    [&_.katex-display]:flex [&_.katex-display]:justify-center [&_.katex-display]:my-10 [&_.katex-display]:overflow-x-auto [&_.katex-display]:py-8 [&_.katex-display]:bg-slate-50/50 [&_.katex-display]:rounded-xl [&_.katex-display]:border [&_.katex-display]:border-slate-100
                                    [&_br]:block [&_br]:content-[''] [&_br]:my-2
                                ">
                                    {subtopic?.content_markdown ? (
                                        <MarkdownRenderer content={subtopic?.content_markdown} />

                                    ) : (
                                        <div className="py-20 text-center">
                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-gray-200">
                                                <BarChart className="w-8 h-8 text-gray-200" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-800 mb-2">Detailed Content Coming Soon</h3>
                                            <p className="text-slate-400 text-sm max-w-xs mx-auto">This lesson is being finalized by our curriculum experts. Check back soon for the full study material.</p>
                                        </div>
                                    )}
                                </div>

                            </div>

                            {/* Sidebar / Stats */}
                            <div className="lg:col-span-1 space-y-6">
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm sticky top-24">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Learning Goals</h4>
                                    <ul className="space-y-4">
                                        <li className="flex gap-3">
                                            <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <CheckCircle className="w-3 h-3 text-green-500" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 leading-normal">Concepts in this module</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <CheckCircle className="w-3 h-3 text-blue-500" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 leading-normal">Practical applications</span>
                                        </li>
                                        <li className="flex gap-3 text-slate-300">
                                            <div className="w-5 h-5 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <CheckCircle className="w-3 h-3" />
                                            </div>
                                            <span className="text-xs font-bold leading-normal">Interactive Assessment</span>
                                        </li>
                                    </ul>

                                    <div className="h-px bg-gray-100 my-8" />

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between text-[10px] font-black tracking-widest text-slate-400 uppercase">
                                            <span>Progress</span>
                                            <span>66%</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-600 w-2/3 shadow-sm shadow-indigo-200" />
                                        </div>
                                    </div>

                                    {mcqCount > 0 && (
                                        <div className="mt-8 pt-6 border-t border-slate-100">
                                            {userRole === 'student' ? (
                                                <button
                                                    onClick={() => router.push(`/university/${uniId}/practice/${subtopicId}`)}
                                                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 group"
                                                >
                                                    Practice Now
                                                    <MoveRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                </button>
                                            ) : (
                                                <div className="px-6 py-3 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-200 text-center">
                                                    Practice Mode Disabled
                                                </div>
                                            )}
                                            <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-tighter mt-4">
                                                {mcqCount} Items Available
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Navigation Footer */}
                        <div className="mt-12 pt-8 border-t border-gray-200 flex items-center justify-between gap-4 flex-wrap">
                            <Link
                                href={`/university/${uniId}`}
                                className="group flex items-center gap-3 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                BACK TO LIBRARY
                            </Link>

                            {mcqCount > 0 && (
                                <button
                                    onClick={() => router.push(`/university/${uniId}/practice/${subtopicId}`)}
                                    className="group flex items-center gap-3 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                                >
                                    PROCEED TO PRACTICE
                                    <MoveRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
