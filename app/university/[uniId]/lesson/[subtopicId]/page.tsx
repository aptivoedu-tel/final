'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { BookOpen, ChevronLeft, Play, GraduationCap, Clock, CheckCircle, BarChart, MoveRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
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
    const [subtopic, setSubtopic] = useState<any>(null);
    const [topic, setTopic] = useState<any>(null);
    const [subject, setSubject] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            const u = AuthService.getCurrentUser();
            if (u) {
                setUser(u);
                await loadLessonData();
            } else {
                router.push('/login');
            }
            setLoading(false);
        };
        init();
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
        } catch (e: any) {
            console.error('Error loading lesson:', e);
            setError(e.message);
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
            <Sidebar userRole="student" />
            <div className="flex-1 flex flex-col">
                <Header userName={user?.full_name} userEmail={user?.email} />

                <main className={`transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'} mt-16 p-8`}>
                    <div className="max-w-4xl mx-auto">
                        {/* Breadcrumbs */}
                        <nav className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-8 overflow-x-auto whitespace-nowrap pb-2">
                            <Link href="/university" className="hover:text-indigo-600 transition-colors">UNIVERSITY</Link>
                            <ChevronLeft className="w-4 h-4 rotate-180 flex-shrink-0" />
                            <span className="text-slate-600 truncate">{subject?.name?.toUpperCase()}</span>
                            <ChevronLeft className="w-4 h-4 rotate-180 flex-shrink-0" />
                            <span className="text-indigo-600 truncate">{topic?.name?.toUpperCase()}</span>
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
                                    prose-headings:font-black prose-headings:text-slate-900 prose-headings:mt-10 prose-headings:mb-6
                                    prose-p:text-slate-600 prose-p:leading-[2.2] prose-p:mb-8 
                                    prose-li:text-slate-600 prose-li:leading-loose prose-li:my-3
                                    prose-strong:text-indigo-600 
                                    prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:px-1 prose-code:rounded 
                                    prose-img:rounded-2xl prose-img:shadow-lg
                                    prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50 prose-blockquote:p-6 prose-blockquote:rounded-r-2xl prose-blockquote:my-10
                                    [&_.katex-display]:flex [&_.katex-display]:justify-center [&_.katex-display]:my-10 [&_.katex-display]:overflow-x-auto [&_.katex-display]:py-4
                                ">
                                    {subtopic?.content_markdown ? (
                                        <ReactMarkdown
                                            remarkPlugins={[remarkMath, remarkGfm]}
                                            rehypePlugins={[rehypeKatex]}
                                        >
                                            {subtopic?.content_markdown}
                                        </ReactMarkdown>
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
                                </div>
                            </div>
                        </div>

                        {/* Navigation Footer */}
                        <div className="mt-12 pt-8 border-t border-gray-200 flex items-center justify-between gap-4 flex-wrap">
                            <Link
                                href="/university"
                                className="group flex items-center gap-3 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                BACK TO ALL MODULES
                            </Link>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
