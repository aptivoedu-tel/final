'use client';

import React, { useEffect, useState } from 'react';
import {
    TrendingUp, Users, BookOpen, Clock,
    ArrowUpRight, ArrowDownRight, Activity, PieChart,
    Building2, Filter, ChevronDown, Award, Target
} from 'lucide-react';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart as RechartsPieChart, Pie, Cell, Legend
} from 'recharts';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { AnalyticsService } from '@/lib/services/analyticsService';
import { ProfileService } from '@/lib/services/profileService';
import { useUI } from '@/lib/context/UIContext';
import { useLoading } from '@/lib/context/LoadingContext';

export default function InstitutionAnalyticsPage() {
    const [user, setUser] = useState<any>(null);
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const [stats, setStats] = useState<any>(null);
    const [institutions, setInstitutions] = useState<any[]>([]);
    const [selectedInstId, setSelectedInstId] = useState<number | null>(null);
    const dataLoading = loading;
    const { isSidebarCollapsed } = useUI();

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedInstId) {
            loadInstitutionStats(selectedInstId);
        }
    }, [selectedInstId]);

    const loadInitialData = async () => {
        const currentUser = AuthService.getCurrentUser();
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('aptivo_user') : null;
        const activeUser = currentUser || (storedUser ? JSON.parse(storedUser) : null);

        if (!activeUser) {
            window.location.href = '/login';
            return;
        }
        setUser(activeUser);

        try {
            // Get institutions managed by this admin
            const { institutions: instList } = await ProfileService.getAdminInstitutions(activeUser.id);
            setInstitutions(instList || []);

            if (instList && instList.length > 0) {
                setSelectedInstId(instList[0].institutions.id);
            } else {
                setGlobalLoading(false);
            }
        } catch (error) {
            console.error("Error loading initial data:", error);
            setGlobalLoading(false);
        }
    };

    const loadInstitutionStats = async (id: number) => {
        setGlobalLoading(true, 'Consulting Administrative Metrics...');
        try {
            const { stats: instStats } = await AnalyticsService.getInstitutionStats(id);
            setStats(instStats);
        } catch (error) {
            console.error("Error loading institution stats:", error);
        } finally {
            setGlobalLoading(false);
        }
    };

    if (loading) return null;

    const currentInst = institutions.find(i => i.institutions.id === selectedInstId)?.institutions;

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <Sidebar userRole="super_admin" />
            <Header userName={user?.full_name} userEmail={user?.email} userAvatar={user?.avatar_url} />

            <main className={`${isSidebarCollapsed ? 'ml-28' : 'ml-80'} mt-16 p-8 min-h-[calc(100vh-64px)] transition-all duration-300 relative z-10`}>
                <div className="max-w-7xl mx-auto">
                    {/* Header with Switcher */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Institution Analytics</h1>
                            <p className="text-slate-500">Performance metrics for {currentInst?.name || 'your institution'}</p>
                        </div>

                        {institutions.length > 1 && (
                            <div className="relative group">
                                <select
                                    value={selectedInstId || ''}
                                    onChange={(e) => setSelectedInstId(Number(e.target.value))}
                                    className="appearance-none bg-white border border-gray-200 rounded-xl px-5 py-3 pr-12 font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all cursor-pointer"
                                >
                                    {institutions.map((item) => (
                                        <option key={item.institutions.id} value={item.institutions.id}>
                                            {item.institutions.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                            </div>
                        )}
                    </div>

                    {!selectedInstId ? (
                        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
                            <Building2 className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                            <h2 className="text-xl font-bold text-slate-800 mb-2">No Institution Assigned</h2>
                            <p className="text-slate-500 max-w-sm mx-auto">
                                You don't have any institutions assigned to your account. Please contact the system administrator.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* KPI Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                {[
                                    {
                                        label: 'Total Students',
                                        value: stats?.totalStudents || 0,
                                        icon: Users,
                                        color: 'bg-blue-600',
                                        trend: '+5%'
                                    },
                                    {
                                        label: 'Active Today',
                                        value: stats?.activeToday || 0,
                                        icon: Activity,
                                        color: 'bg-green-500',
                                        trend: '+12%'
                                    },
                                    {
                                        label: 'Average Score',
                                        value: `${stats?.averageScore || 0}%`,
                                        icon: Award,
                                        color: 'bg-purple-600',
                                        trend: '+2%'
                                    },
                                    {
                                        label: 'Total Sessions',
                                        value: stats?.totalSessions || 0,
                                        icon: BookOpen,
                                        color: 'bg-orange-500',
                                        trend: '+18%'
                                    }
                                ].map((card, i) => (
                                    <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.color} text-white shadow-lg`}>
                                                <card.icon className="w-6 h-6" />
                                            </div>
                                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full group-hover:scale-110 transition-transform">
                                                {card.trend}
                                            </span>
                                        </div>
                                        <h3 className="text-3xl font-bold text-slate-800 mb-1">
                                            {dataLoading ? '...' : card.value}
                                        </h3>
                                        <p className="text-sm font-medium text-slate-500">{card.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Main Content Area */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Insights Table */}
                                <div className="lg:col-span-2 space-y-8">
                                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                                        <div className="flex justify-between items-center mb-8">
                                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                                <Target className="w-5 h-5 text-indigo-600" />
                                                Performance Trend
                                            </h3>
                                            <div className="text-xs font-medium text-slate-400 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                                Last 30 Days
                                            </div>
                                        </div>

                                        <div className="h-[400px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={[
                                                    { date: 'Jan 1', score: 65 },
                                                    { date: 'Jan 5', score: 68 },
                                                    { date: 'Jan 10', score: 72 },
                                                    { date: 'Jan 15', score: 70 },
                                                    { date: 'Jan 20', score: 75 },
                                                    { date: 'Jan 25', score: 78 },
                                                    { date: 'Jan 30', score: 82 },
                                                ]}>
                                                    <defs>
                                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[0, 100]} />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                    />
                                                    <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                                        <h3 className="font-bold text-slate-800 text-lg mb-6">Recent Top Performers</h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="text-slate-400 text-sm font-medium border-b border-gray-100">
                                                        <th className="pb-4">Student Name</th>
                                                        <th className="pb-4">Average Score</th>
                                                        <th className="pb-4 text-right">Sessions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {[
                                                        { name: 'Sarah Ahmed', score: 94, sessions: 28 },
                                                        { name: 'John Doe', score: 89, sessions: 22 },
                                                        { name: 'Michael Chen', score: 87, sessions: 15 },
                                                        { name: 'Amara Okafor', score: 85, sessions: 31 },
                                                        { name: 'David Lee', score: 82, sessions: 19 },
                                                    ].map((student, i) => (
                                                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                                                            <td className="py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                                        {student.name.charAt(0)}
                                                                    </div>
                                                                    <span className="font-bold text-slate-700">{student.name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-4">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${student.score}%` }}></div>
                                                                    </div>
                                                                    <span className="font-medium text-slate-600">{student.score}%</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-4 text-right">
                                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">
                                                                    {student.sessions}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* Sidebar Stats */}
                                <div className="space-y-8">
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-indigo-600" />
                                            Subject Distribution
                                        </h3>
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RechartsPieChart>
                                                    <Pie
                                                        data={[
                                                            { name: 'Math', value: 45 },
                                                            { name: 'Phy', value: 25 },
                                                            { name: 'Chem', value: 20 },
                                                            { name: 'Bio', value: 10 },
                                                        ]}
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        <Cell fill="#6366f1" />
                                                        <Cell fill="#10b981" />
                                                        <Cell fill="#f59e0b" />
                                                        <Cell fill="#ec4899" />
                                                    </Pie>
                                                    <Tooltip />
                                                </RechartsPieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="space-y-3 mt-4">
                                            {[
                                                { name: 'Mathematics', color: 'bg-indigo-600', val: '45%' },
                                                { name: 'Physics', color: 'bg-green-500', val: '25%' },
                                                { name: 'Chemistry', color: 'bg-yellow-500', val: '20%' },
                                                { name: 'Biology', color: 'bg-pink-500', val: '10%' },
                                            ].map((item, i) => (
                                                <div key={i} className="flex justify-between items-center text-sm">
                                                    <div className="flex items-center gap-2 text-slate-600">
                                                        <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
                                                        {item.name}
                                                    </div>
                                                    <span className="font-bold text-slate-800">{item.val}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white overflow-hidden relative">
                                        <Building2 className="absolute -right-8 -bottom-8 w-48 h-48 text-white opacity-5 rotate-12" />
                                        <div className="relative z-10">
                                            <h4 className="font-bold mb-4 flex items-center gap-2">
                                                <Award className="w-5 h-5 text-yellow-400" />
                                                Quick Actions
                                            </h4>
                                            <div className="space-y-3">
                                                <button className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold text-white transition-all text-left flex items-center justify-between group">
                                                    Download Monthly Report
                                                    <ChevronDown className="w-4 h-4 -rotate-90 group-hover:translate-x-1 transition-transform" />
                                                </button>
                                                <button className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold text-white transition-all text-left flex items-center justify-between group">
                                                    Email to Students
                                                    <ChevronDown className="w-4 h-4 -rotate-90 group-hover:translate-x-1 transition-transform" />
                                                </button>
                                                <button className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-bold text-white transition-all text-left flex items-center justify-between group shadow-xl shadow-indigo-900/40">
                                                    Schedule Announcement
                                                    <ChevronDown className="w-4 h-4 -rotate-90 group-hover:translate-x-1 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
