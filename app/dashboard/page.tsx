'use client';

import React, { useEffect, useState } from 'react';
import {
    BookOpen, Trophy, Flame, TrendingUp,
    MapPin, Play, ChevronRight, Zap, RefreshCw,
    CheckCircle2, Clock, Book, Brain, Info, Search, Target
} from 'lucide-react';
import {
    ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    BarChart, Bar, XAxis, YAxis, Tooltip
} from 'recharts';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/shared/Footer';
import { AuthService } from '@/lib/services/authService';
import {
    DashboardService,
    StudentStats,
    PerformanceData,
    ProgressData,
    ContinueLearningItem
} from '@/lib/services/dashboardService';
import { useUI } from '@/lib/context/UIContext';

export default function StudentDashboard() {
    const { isSidebarCollapsed } = useUI();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<StudentStats>({
        enrolledTopics: 0,
        questionsSolved: 0,
        currentStreak: 0,
        overallAccuracy: 0,
        totalStudyTime: 0
    });
    const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
    const [progressData, setProgressData] = useState<ProgressData[]>([]);
    const [continueLearning, setContinueLearning] = useState<ContinueLearningItem[]>([]);
    const [recommended, setRecommended] = useState<any>(null);
    const [dataLoading, setDataLoading] = useState(true);

    useEffect(() => {
        const loadDashboard = async () => {
            const currentUser = AuthService.getCurrentUser();
            const storedUser = typeof window !== 'undefined' ? localStorage.getItem('aptivo_user') : null;

            let activeUser = currentUser;
            if (currentUser) {
                activeUser = currentUser;
            } else if (storedUser) {
                activeUser = JSON.parse(storedUser);
            } else {
                window.location.href = '/login';
                return;
            }

            setUser(activeUser);
            setLoading(false);

            if (activeUser && activeUser.id) {
                try {
                    const [statsRes, perfRes, progRes, learnRes, recRes] = await Promise.all([
                        DashboardService.getStudentStats(activeUser.id),
                        DashboardService.getPerformanceBySubject(activeUser.id),
                        DashboardService.getProgressBySubtopic(activeUser.id),
                        DashboardService.getContinueLearningItems(activeUser.id),
                        DashboardService.getRecommendedSubtopic(activeUser.id)
                    ]);

                    if (statsRes.stats) setStats(statsRes.stats);
                    if (perfRes.data) setPerformanceData(perfRes.data);
                    if (progRes.data) setProgressData(progRes.data);
                    if (learnRes.data) setContinueLearning(learnRes.data);
                    if (recRes.subtopic) setRecommended(recRes.subtopic);

                } catch (error) {
                    console.error("Failed to load dashboard data", error);
                } finally {
                    setDataLoading(false);
                }
            }
        };

        loadDashboard();
    }, []);

    if (loading) return null;

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m} min`;
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <Sidebar userRole="student" />

            <div className={`flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-24' : 'lg:ml-72'}`}>
                <Header userName={user?.full_name || 'Student'} userEmail={user?.email} userAvatar={user?.avatar_url} />

                <main className="p-4 lg:p-8 mt-28 lg:mt-24">
                    <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8 bg-white p-4 md:p-8 rounded-2xl border border-slate-200/80 shadow-sm">
                        {/* Welcome Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center text-3xl transform rotate-3">
                                    🚀
                                </div>
                                <div>
                                    <h1 className="text-xl lg:text-4xl font-black text-slate-900 mb-1 lg:mb-2 tracking-tight">
                                        Good Morning, {user?.full_name?.split(' ')[0] || 'Student'}! 👋
                                    </h1>
                                    <p className="text-slate-600 font-bold text-sm lg:text-lg">
                                        You're on a <span className="text-teal-600 font-extrabold underline decoration-indigo-100 underline-offset-4 tracking-tight">{stats.currentStreak}-day streak!</span> Keep it up.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Top Stats Row */}
                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                            {[
                                { label: 'Topics Enrolled', value: stats.enrolledTopics, icon: BookOpen, color: 'bg-teal-50 text-teal-600' },
                                { label: 'Modules Completed', value: stats.questionsSolved, icon: Trophy, color: 'bg-teal-50 text-teal-600' },
                                { label: 'Current Streak', value: `${stats.currentStreak} days`, icon: Flame, color: 'bg-orange-50 text-orange-600' },
                                { label: 'Accuracy', value: `${stats.overallAccuracy}%`, icon: TrendingUp, color: 'bg-rose-50 text-rose-600' }
                            ].map((stat, i) => (
                                <div key={i} className="bg-white p-5 lg:p-8 rounded-2xl lg:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-3 lg:gap-4 transform transition-all hover:scale-[1.02] hover:shadow-lg">
                                    <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl ${stat.color} flex items-center justify-center`}>
                                        <stat.icon className="w-5 h-5 lg:w-6 lg:h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl lg:text-3xl font-black text-slate-900 leading-none mb-1">{dataLoading ? '...' : stat.value}</h3>
                                        <p className="text-slate-500 font-black uppercase tracking-widest text-[8px] lg:text-[10px]">{stat.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Special Recommendation Card */}
                        {(recommended || (continueLearning.length > 0)) && (
                            <div className="bg-gradient-to-br from-teal-600 to-teal-950 rounded-[2.5rem] p-8 lg:p-12 text-white relative overflow-hidden shadow-2xl shadow-teal-200">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                                    <div className="space-y-4 max-w-xl text-center md:text-left">
                                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest">
                                            <Target className="w-3.5 h-3.5 text-teal-400" />
                                            Smart Recommendation
                                        </div>
                                        <h2 className="text-3xl lg:text-4xl font-black tracking-tight leading-tight">
                                            {recommended ? `Ready to master ${recommended.subtopics.name}?` : `Pick up where you left off in ${continueLearning[0].title}`}
                                        </h2>
                                        <p className="text-teal-200 text-sm lg:text-lg font-medium opacity-80">
                                            Based on your recent performance, we recommend a focused practice session to boost your {recommended ? 'detected weakness' : 'learning momentum'}.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const subId = recommended?.subtopic_id || continueLearning[0]?.subtopicId;
                                            // Since we don't have uniId easily here, we'll redirect to university page or try to find an enrollment
                                            window.location.href = `/university`;
                                        }}
                                        className="px-10 py-5 bg-white text-teal-600 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-teal-900/20 hover:bg-teal-500 hover:text-white transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3"
                                    >
                                        Start Smart Practice
                                        <ChevronRight className="w-5 h-5 font-black" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Main Grid Content */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

                            {/* Today's Plan Column */}
                            <div className="lg:col-span-6 space-y-6">
                                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="pr-4">
                                            <h2 className="text-lg lg:text-xl font-black text-slate-900">Continue Learning</h2>
                                            <p className="text-[10px] lg:text-xs font-black text-slate-500 tracking-wider">Your recently accessed topics</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                                            <Play className="w-5 h-5 text-teal-600" />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {continueLearning.length > 0 ? (
                                            continueLearning.map((item, i) => (
                                                <Link
                                                    key={i}
                                                    href={`/university`}
                                                    className="p-5 rounded-2xl border bg-slate-50 border-slate-100 hover:border-teal-200 transition-all flex items-center justify-between group"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center group-hover:bg-teal-50 transition-colors`}>
                                                            <BookOpen className="w-5 h-5 text-teal-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-base font-bold text-slate-800">{item.title}</p>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-teal-500 transition-all duration-1000"
                                                                        style={{ width: `${item.progress}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.progress}%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-teal-600 transition-all" />
                                                </Link>
                                            ))
                                        ) : (
                                            <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/50">
                                                <Book className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No active topics found</p>
                                                <Link href="/university" className="mt-4 inline-block text-xs font-black text-teal-600 uppercase tracking-[0.2em] underline underline-offset-4">Browse Curriculum</Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Recommendations & Performance */}
                            <div className="lg:col-span-6 space-y-8">
                                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="pr-4">
                                            <h2 className="text-lg lg:text-xl font-black text-slate-900">Performance Status</h2>
                                            <p className="text-[10px] lg:text-xs font-black text-slate-500 tracking-wider">Overall accuracy by subject</p>
                                        </div>
                                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                                        </div>
                                    </div>

                                    <div className="h-[250px] w-full">
                                        {dataLoading ? (
                                            <div className="h-full flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs">Analytics Loading...</div>
                                        ) : performanceData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={performanceData}>
                                                    <PolarGrid stroke="#e2e8f0" />
                                                    <PolarAngleAxis dataKey="subject_name" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                                                    <PolarRadiusAxis angle={30} domain={[0, 100]} axisLine={false} tick={false} />
                                                    <Radar
                                                        name="Performance"
                                                        dataKey="score"
                                                        stroke="#0d9488"
                                                        fill="#0d9488"
                                                        fillOpacity={0.4}
                                                    />
                                                </RadarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                                <Brain className="w-12 h-12 mb-2" />
                                                <p className="text-xs font-black uppercase tracking-widest text-center px-4">Insufficient data for radar visualization</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-6 pt-6 border-t border-slate-50">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Questions Attempted</span>
                                            <span className="text-lg font-black text-slate-900">{stats.questionsSolved}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Correct Answers</span>
                                            <span className="text-lg font-black text-teal-600">{Math.round((stats.questionsSolved * stats.overallAccuracy) / 100)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total Study Time</span>
                                            <span className="text-lg font-black text-slate-900">{formatTime(stats.totalStudyTime)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <Footer />
                    </div>
                </main>
            </div>
        </div>
    );
}
