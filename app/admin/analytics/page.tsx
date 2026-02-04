'use client';

import React, { useEffect, useState } from 'react';
import {
    TrendingUp, Users, BookOpen, Clock,
    ArrowUpRight, ArrowDownRight, Activity, PieChart
} from 'lucide-react';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart as RechartsPieChart, Pie, Cell, Legend
} from 'recharts';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useUI } from '@/lib/context/UIContext';
import { AuthService } from '@/lib/services/authService';
import { AnalyticsService, TotalStats, GrowthData, WeakTopic } from '@/lib/services/analyticsService';

export default function AnalyticsPage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
    const { isSidebarCollapsed } = useUI();

    // Data States
    const [stats, setStats] = useState<TotalStats | null>(null);
    const [growth, setGrowth] = useState<GrowthData[]>([]);
    const [performance, setPerformance] = useState<WeakTopic[]>([]);

    // Mock Distribution for Pie Chart (assuming service provided generic or we mock for visual)
    const [distributionData, setDistributionData] = useState<any[]>([]);

    useEffect(() => {
        loadAnalytics();
    }, [dateRange]);

    const loadAnalytics = async () => {
        const currentUser = AuthService.getCurrentUser();
        // Fallback for dev
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('aptivo_user') : null;
        const activeUser = currentUser || (storedUser ? JSON.parse(storedUser) : null);

        if (!activeUser) {
            window.location.href = '/login';
            return;
        }
        setUser(activeUser);

        try {
            // Map date range to service parameters
            const periodMap: Record<string, 'week' | 'month' | 'year'> = {
                '7d': 'week',
                '30d': 'month',
                '90d': 'year'
            };

            const [statsRes, growthRes, perfRes, distRes] = await Promise.all([
                AnalyticsService.getTotalStats(),
                AnalyticsService.getStudentGrowth(periodMap[dateRange]),
                AnalyticsService.getWeakestTopics(10),
                AnalyticsService.getSubjectDistribution()
            ]);

            if (statsRes.stats) setStats(statsRes.stats);
            if (growthRes.data) setGrowth(growthRes.data);
            if (perfRes.topics) setPerformance(perfRes.topics);
            if (distRes.data) setDistributionData(distRes.data);

        } catch (error) {
            console.error("Error loading analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return null; // Or a loader

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="super_admin" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name} userEmail={user?.email} userAvatar={user?.avatar_url} />

                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8">
                    <div className="max-w-7xl mx-auto">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Analytics Overview</h1>
                                <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium">Insights into system performance and user engagement</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-1 flex w-full sm:w-auto overflow-x-auto no-scrollbar">
                                <button
                                    onClick={() => setDateRange('7d')}
                                    className={`flex-1 sm:flex-none px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${dateRange === '7d' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    7 Days
                                </button>
                                <button
                                    onClick={() => setDateRange('30d')}
                                    className={`flex-1 sm:flex-none px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${dateRange === '30d' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    30 Days
                                </button>
                                <button
                                    onClick={() => setDateRange('90d')}
                                    className={`flex-1 sm:flex-none px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${dateRange === '90d' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    90 Days
                                </button>
                            </div>
                        </div>

                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                            {[
                                {
                                    label: 'Subjects',
                                    value: stats?.totalSubjects.toLocaleString() || '0',
                                    change: '+2%',
                                    icon: BookOpen,
                                    color: 'bg-indigo-600',
                                    shadow: 'shadow-indigo-100'
                                },
                                {
                                    label: 'Students',
                                    value: stats?.totalStudents.toLocaleString() || '0',
                                    change: '+12%',
                                    icon: Users,
                                    color: 'bg-emerald-600',
                                    shadow: 'shadow-emerald-100'
                                },
                                {
                                    label: 'Questions',
                                    value: stats?.totalMCQs.toLocaleString() || '0',
                                    change: '+5%',
                                    icon: Activity,
                                    color: 'bg-rose-600',
                                    shadow: 'shadow-rose-100'
                                },
                                {
                                    label: 'Sessions',
                                    value: stats?.totalPracticeSessions.toLocaleString() || '0',
                                    change: '+18%',
                                    icon: Clock,
                                    color: 'bg-amber-600',
                                    shadow: 'shadow-amber-100'
                                }
                            ].map((card, i) => (
                                <div key={i} className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all active:scale-[0.98]">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-2.5 sm:p-3 rounded-2xl ${card.color} text-white shadow-lg ${card.shadow}`}>
                                            <card.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                                        </div>
                                        <span className="hidden sm:flex items-center text-[10px] font-black px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 uppercase tracking-wider">
                                            {card.change}
                                        </span>
                                    </div>
                                    <h3 className="text-xl sm:text-3xl font-black text-slate-800 mb-1">{card.value}</h3>
                                    <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Charts Row 1 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                            {/* Growth Chart */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                                    Student Growth
                                </h3>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={growth}>
                                            <defs>
                                                <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorGrowth)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Performance Distribution (Pie) */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <PieChart className="w-5 h-5 text-indigo-600" />
                                    Subject Distribution
                                </h3>
                                <div className="h-[300px] flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        {distributionData.length > 0 ? (
                                            <RechartsPieChart>
                                                <Pie
                                                    data={distributionData}
                                                    innerRadius={80}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    nameKey="name"
                                                >
                                                    {distributionData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                                            </RechartsPieChart>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center text-center p-8">
                                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                                    <PieChart className="w-8 h-8 text-gray-200" />
                                                </div>
                                                <p className="text-sm text-gray-400 font-medium">No distribution data available</p>
                                            </div>
                                        )}
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Topic Performance Bar Chart */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-indigo-600" />
                                    Topic Performance
                                </h3>
                            </div>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={performance} barSize={40}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="topicName" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} unit="%" />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Bar dataKey="averageScore" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
