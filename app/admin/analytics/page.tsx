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
import { AuthService } from '@/lib/services/authService';
import { AnalyticsService, SystemStats, GrowthData, PerformanceData } from '@/lib/services/analyticsService';

export default function AnalyticsPage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

    // Data States
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [growth, setGrowth] = useState<GrowthData[]>([]);
    const [performance, setPerformance] = useState<PerformanceData[]>([]);

    // Mock Distribution for Pie Chart (assuming service provided generic or we mock for visual)
    const distributionData = [
        { name: 'Mathematics', value: 400, color: '#6366f1' },
        { name: 'Physics', value: 300, color: '#10b981' },
        { name: 'Chemistry', value: 300, color: '#f59e0b' },
        { name: 'Biology', value: 200, color: '#ec4899' },
    ];

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
            // Check calling convention of service. 
            // In analyticsService.ts: getSystemStats(), getStudentGrowth(period), getPerformanceMetrics()
            const [statsRes, growthRes, perfRes] = await Promise.all([
                AnalyticsService.getSystemStats(),
                AnalyticsService.getStudentGrowth(dateRange),
                AnalyticsService.getPerformanceMetrics()
            ]);

            if (statsRes.stats) setStats(statsRes.stats);
            if (growthRes.data) setGrowth(growthRes.data);
            if (perfRes.data) setPerformance(perfRes.data);

        } catch (error) {
            console.error("Error loading analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return null; // Or a loader

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <Sidebar userRole="super_admin" />
            <Header userName={user?.full_name} userEmail={user?.email} userAvatar={user?.avatar_url} />

            <main className="ml-64 mt-16 p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Analytics Overview</h1>
                            <p className="text-slate-500">Insights into system performance and user engagement</p>
                        </div>
                        <div className="bg-white rounded-lg border border-gray-200 p-1 flex">
                            <button
                                onClick={() => setDateRange('7d')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${dateRange === '7d' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                7 Days
                            </button>
                            <button
                                onClick={() => setDateRange('30d')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${dateRange === '30d' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                30 Days
                            </button>
                            <button
                                onClick={() => setDateRange('90d')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${dateRange === '90d' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                90 Days
                            </button>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {[
                            {
                                label: 'Total Students',
                                value: stats?.totalStudents.toLocaleString() || '0',
                                change: '+12%', // Mock change for visual flair if API doesn't return
                                trend: 'up',
                                icon: Users,
                                color: 'bg-blue-500'
                            },
                            {
                                label: 'Active Sessions',
                                value: stats?.activeSessions.toLocaleString() || '0',
                                change: '+8%',
                                trend: 'up',
                                icon: Activity,
                                color: 'bg-green-500'
                            },
                            {
                                label: 'Questions Solved',
                                value: stats?.questionsSolved.toLocaleString() || '0',
                                change: '+24%',
                                trend: 'up',
                                icon: BookOpen,
                                color: 'bg-purple-500'
                            },
                            {
                                label: 'Avg. Session Time',
                                value: stats?.avgSessionDuration || '0m',
                                change: '-2%',
                                trend: 'down',
                                icon: Clock,
                                color: 'bg-orange-500'
                            }
                        ].map((card, i) => (
                            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-xl ${card.color} bg-opacity-10 text-${card.color.replace('bg-', '')}`}>
                                        <card.icon className={`w-6 h-6 text-${card.color.replace('bg-', 'text-')}`} style={{ color: card.color === 'bg-blue-500' ? '#3b82f6' : card.color === 'bg-green-500' ? '#22c55e' : card.color === 'bg-purple-500' ? '#a855f7' : '#f97316' }} />
                                    </div>
                                    <span className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${card.trend === 'up' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                        {card.trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                                        {card.change}
                                    </span>
                                </div>
                                <h3 className="text-3xl font-bold text-slate-800 mb-1">{card.value}</h3>
                                <p className="text-sm font-medium text-slate-500">{card.label}</p>
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
                                        <Area type="monotone" dataKey="students" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorGrowth)" />
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
                                    <RechartsPieChart>
                                        <Pie
                                            data={distributionData}
                                            innerRadius={80}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {distributionData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                                    </RechartsPieChart>
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
                                    <XAxis dataKey="topic" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} unit="%" />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="score" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
