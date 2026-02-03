'use client';

import React, { useEffect, useState } from 'react';
import {
    BookOpen, Trophy, Flame, TrendingUp,
    Book, Target, Play, ChevronRight, Zap, RefreshCw
} from 'lucide-react';
import {
    ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    BarChart, Bar, XAxis, YAxis, Tooltip
} from 'recharts';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import {
    DashboardService,
    StudentStats,
    PerformanceData,
    ProgressData,
    ContinueLearningItem
} from '@/lib/services/dashboardService';

export default function StudentDashboard() {
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
            // Bypass for development if no user but localStorage set
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
                    // Fetch all data in parallel
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

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <Sidebar userRole="student" />
            <Header userName={user?.full_name || 'Student'} userEmail={user?.email} />

            <main className="lg:ml-64 mt-16 p-4 lg:p-8 transition-all duration-300">
                {/* Welcome Section */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-800">Welcome back, {user?.full_name?.split(' ')[0]}!</h1>
                    <p className="text-slate-500">Keep up the great work. Here's your learning progress.</p>
                </div>

                {/* Stats Grid - Vibrant Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[
                        {
                            label: 'Enrolled Topics',
                            value: stats.enrolledTopics,
                            color: 'bg-blue-600',
                            icon: BookOpen
                        },
                        {
                            label: 'Questions Solved',
                            value: stats.questionsSolved,
                            color: 'bg-green-500',
                            icon: Trophy
                        },
                        {
                            label: 'Current Streak',
                            value: `${stats.currentStreak} days`,
                            color: 'bg-orange-500',
                            icon: Flame
                        },
                        {
                            label: 'Overall Accuracy',
                            value: `${stats.overallAccuracy}%`,
                            color: 'bg-purple-600',
                            icon: TrendingUp
                        }
                    ].map((stat, i) => (
                        <div key={i} className={`${stat.color} rounded-2xl p-6 text-white shadow-lg transform transition-all hover:scale-105`}>
                            <stat.icon className="w-6 h-6 mb-4 opacity-80" />
                            <h3 className="text-3xl font-bold mb-1">{dataLoading ? '...' : stat.value}</h3>
                            <p className="text-sm font-medium opacity-90">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Weakness Heatmap / Performance Radar */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-slate-800">Performance By Subject</h3>
                            <button className="p-1 hover:bg-gray-100 rounded-full">
                                <Zap className="w-4 h-4 text-slate-400" />
                            </button>
                        </div>

                        {dataLoading ? (
                            <div className="h-[300px] flex items-center justify-center text-slate-400">Loading charts...</div>
                        ) : performanceData.length > 0 ? (
                            <>
                                <div className="h-[300px] flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={performanceData}>
                                            <PolarGrid stroke="#e2e8f0" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                            <Radar
                                                name="Performance"
                                                dataKey="score"
                                                stroke="#ACC8A2"
                                                fill="#ACC8A2"
                                                fillOpacity={0.4}
                                            />
                                            <Tooltip />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex justify-center gap-6 mt-4 text-xs font-medium text-slate-500">
                                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400"></div>Low (0-50%)</div>
                                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400"></div>Med (51-80%)</div>
                                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400"></div>High (81-100%)</div>
                                </div>
                            </>
                        ) : (
                            <div className="h-[300px] flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <BookOpen className="w-10 h-10 mb-2 opacity-20" />
                                <p>No performance data yet</p>
                                <p className="text-xs mt-1">Take practice tests to see insights</p>
                            </div>
                        )}
                    </div>

                    {/* Progress by Subtopic */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                        <h3 className="font-bold text-slate-800 mb-6">Recent Progress</h3>

                        {dataLoading ? (
                            <div className="h-full flex items-center justify-center text-slate-400">Loading progress...</div>
                        ) : progressData.length > 0 ? (
                            <div className="space-y-6 flex-1">
                                {progressData.map((item, i) => (
                                    <div key={i}>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="font-medium text-slate-700">{item.name}</span>
                                            <span className="text-slate-500">{item.score}%</span>
                                        </div>
                                        <div className="h-3 bg-primary/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${item.score}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 min-h-[200px]">
                                <TrendingUp className="w-10 h-10 mb-2 opacity-20" />
                                <p>No progress recorded yet</p>
                                <p className="text-xs mt-1">Start reading content to track progress</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Continue Learning */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
                    <h3 className="font-bold text-slate-800 mb-6">Continue Learning</h3>

                    {dataLoading ? (
                        <div className="text-center py-8 text-slate-400">Loading study plan...</div>
                    ) : continueLearning.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {continueLearning.map((item, i) => (
                                <div key={i} className="border border-gray-100 rounded-xl p-5 hover:border-gray-200 transition-all hover:shadow-md">
                                    <div className="flex justify-between items-start mb-4">
                                        <h4 className="font-semibold text-slate-800 text-sm line-clamp-2 h-10">{item.title}</h4>
                                        <span className={`text-xs font-bold ${item.color}`}>{item.progress}%</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full mb-4">
                                        <div
                                            className={`h-full rounded-full ${i === 0 ? 'bg-primary' : i === 1 ? 'bg-orange-400' : 'bg-primary-dark'}`}
                                            style={{ width: `${item.progress}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="flex-1 py-2 text-xs font-medium text-slate-600 bg-gray-50 rounded-lg hover:bg-gray-100">
                                            Resume
                                        </button>
                                        <button className={`flex-1 py-2 text-xs font-medium text-white rounded-lg shadow-sm ${i === 0 ? 'bg-primary' : i === 1 ? 'bg-orange-400' : 'bg-primary-dark'} hover:opacity-90`}>
                                            Practice
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <Book className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                            <h4 className="text-slate-600 font-medium">No active courses</h4>
                            <p className="text-slate-400 text-sm mt-1 mb-4">You haven't started any topics yet.</p>
                            <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark">
                                Browse Topics
                            </button>
                        </div>
                    )}
                </div>

                {/* Recommended */}
                {recommended ? (
                    <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-8 text-white relative overflow-hidden transition-all hover:scale-[1.01] shadow-xl shadow-primary/20">
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Focus Area</span>
                                <h3 className="font-bold text-lg">Recommended for You</h3>
                            </div>
                            <p className="text-white/90 text-sm mb-6 max-w-lg">
                                Based on your recent performance, we noticed you might need some more practice in <span className="font-bold text-white">{recommended.subtopics?.topics?.name || 'this topic'}</span> particularly in <span className="font-bold text-white underline decoration-wavy decoration-white/50">{recommended.subtopics?.name}</span>.
                            </p>
                            <button className="bg-white text-primary-dark px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors inline-flex items-center gap-2 shadow-sm">
                                Start Practice Session
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                        <Target className="absolute right-0 bottom-0 w-64 h-64 text-white opacity-10 transform translate-x-1/4 translate-y-1/4" />
                    </div>
                ) : (
                    <div className="bg-slate-800 rounded-2xl p-8 text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="font-bold text-lg mb-2">Start Your Journey</h3>
                            <p className="text-slate-300 text-sm mb-6 max-w-lg">
                                Complete your first practice test to get personalized recommendations and AI-driven insights.
                            </p>
                            <button className="bg-white text-slate-900 px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-slate-100 transition-colors inline-flex items-center gap-2">
                                Find a Topic
                                <BookOpen className="w-4 h-4" />
                            </button>
                        </div>
                        <Target className="absolute right-0 bottom-0 w-64 h-64 text-white opacity-5 transform translate-x-1/4 translate-y-1/4" />
                    </div>
                )}
            </main>
        </div>
    );
}
