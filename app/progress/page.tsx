'use client';

import React, { useEffect, useState } from 'react';
import {
    TrendingUp, Award, Calendar, Clock,
    ChevronRight, BookOpen, CheckCircle2,
    BarChart2, PieChart, Activity, Zap
} from 'lucide-react';
import {
    ResponsiveContainer, AreaChart, Area,
    XAxis, YAxis, Tooltip, CartesianGrid,
    BarChart, Bar, Cell
} from 'recharts';
import { useUI } from '@/lib/context/UIContext';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { DashboardService } from '@/lib/services/dashboardService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

export default function ProgressPage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [performanceData, setPerformanceData] = useState<any[]>([]);
    const [exporting, setExporting] = useState(false);
    const [rankData, setRankData] = useState<any>({ rank: '--', change: '→ 0' });
    const [milestones, setMilestones] = useState<any[]>([]);
    const { isSidebarCollapsed } = useUI();

    useEffect(() => {
        const loadProgress = async () => {
            const currentUser = AuthService.getCurrentUser();
            if (!currentUser) {
                window.location.href = '/login';
                return;
            }
            setUser(currentUser);
            setLoading(false);

            try {
                const [statsRes, perfRes, rankRes, milestonesRes] = await Promise.all([
                    DashboardService.getStudentStats(currentUser.id),
                    DashboardService.getPerformanceBySubject(currentUser.id),
                    DashboardService.getStudentRank(currentUser.id),
                    DashboardService.getRecentMilestones(currentUser.id)
                ]);

                if (statsRes.stats) setStats(statsRes.stats);
                if (perfRes.data) setPerformanceData(perfRes.data);
                if (rankRes) setRankData(rankRes);
                if (milestonesRes) setMilestones(milestonesRes);
            } catch (error) {
                console.error("Error loading progress data", error);
            }
        };

        loadProgress();
    }, []);

    const handleDownloadReport = async () => {
        if (exporting) return;
        setExporting(true);

        try {
            const pdf = new jsPDF();
            const pageWidth = pdf.internal.pageSize.getWidth();

            // Header
            pdf.setFillColor(172, 200, 162); // Soft Sage
            pdf.rect(0, 0, pageWidth, 45, 'F');

            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(24);
            pdf.setFont('helvetica', 'bold');
            pdf.text("Student Performance Report", 14, 22);

            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Student: ${user?.full_name}`, 14, 32);
            pdf.text(`Email: ${user?.email}`, 14, 37);
            pdf.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 42);

            // Quick Stats
            pdf.setTextColor(15, 23, 42);
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text("Learning Overview", 14, 60);

            autoTable(pdf, {
                startY: 65,
                head: [['Metric', 'Value']],
                body: [
                    ['Total Study Time', formatStudyTime(stats?.totalStudyTime || 0)],
                    ['Overall Accuracy', `${stats?.overallAccuracy || 0}%`],
                    ['Current Streak', `${stats?.currentStreak || 0} Days`],
                    ['Total Questions Solved', stats?.questionsSolved || 0]
                ],
                theme: 'striped',
                headStyles: { fillColor: [15, 118, 110] }, // Aptivo indigo
                styles: { textColor: [71, 85, 105] } // Slate-600
            });

            // Subject Mastery
            const statsY = (pdf as any).lastAutoTable?.finalY || 100;
            pdf.setTextColor(15, 23, 42);
            pdf.setFontSize(14);
            pdf.text("Subject Mastery", 14, statsY + 15);

            autoTable(pdf, {
                startY: statsY + 20,
                head: [['Subject', 'Mastery Level', 'Status']],
                body: performanceData.map(p => [
                    p.subject,
                    `${p.score}%`,
                    p.score > 80 ? 'Excellent' : p.score > 50 ? 'Steady' : 'Needs Review'
                ]),
                theme: 'grid',
                headStyles: { fillColor: [15, 23, 42] }
            });

            pdf.save(`Aptivo_Report_${user?.full_name?.replace(/\s+/g, '_')}.pdf`);
            toast.success("Standardized Report Generated");
        } catch (error: any) {
            console.error("PDF Export Fail:", error);
            toast.error("Failed to generate PDF");
        } finally {
            setExporting(false);
        }
    };

    const formatStudyTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const remainingMinutes = Math.floor((seconds % 3600) / 60);
        if (hours === 0) return `${remainingMinutes}m`;
        return `${hours}h ${remainingMinutes}m`;
    };

    if (loading) return null;

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <Sidebar userRole="student" />
            <Header userName={user?.full_name || 'Student'} userEmail={user?.email} userAvatar={user?.avatar_url} />

            <main className={`${isSidebarCollapsed ? 'lg:ml-24' : 'lg:ml-72'} pt-28 lg:pt-24 p-4 lg:p-8 transition-all duration-300`} id="report-content">
                {/* Hero Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Your Learning Journey</h1>
                        <p className="text-slate-500 mt-1">Track your performance and master your subjects.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary-dark" />
                            <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">Total Study: {formatStudyTime(stats?.totalStudyTime || 0)}</span>
                        </div>
                        <button
                            onClick={handleDownloadReport}
                            disabled={exporting}
                            className="bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-teal-500/20 hover:bg-teal-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                        >
                            {exporting ? 'Generating...' : 'Download PDF Report'}
                        </button>
                    </div>
                </div>

                {/* Achievement Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Award className="w-6 h-6 text-primary-dark" />
                            </div>
                            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Rank Position</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-slate-900">#{rankData.rank}</span>
                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-lg ${rankData.change.includes('↑') ? 'text-teal-600 bg-teal-50' : 'text-slate-400 bg-slate-50'}`}>
                                    {rankData.change}
                                </span>
                            </div>
                        </div>
                        <Award className="absolute -right-4 -bottom-4 w-24 h-24 text-primary opacity-20" />
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Activity className="w-6 h-6 text-teal-600" />
                            </div>
                            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Overall Accuracy</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-slate-900">{stats?.overallAccuracy || 0}%</span>
                                <span className="text-xs font-semibold text-primary-dark px-1.5 py-0.5 bg-primary/10 rounded-lg">Top 15%</span>
                            </div>
                        </div>
                        <Activity className="absolute -right-4 -bottom-4 w-24 h-24 text-teal-50 opacity-50" />
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Calendar className="w-6 h-6 text-orange-600" />
                            </div>
                            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Learning Streak</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-slate-900">{stats?.currentStreak || 0} Days</span>
                                <span className="text-xs font-semibold text-orange-600 px-1.5 py-0.5 bg-orange-50 rounded-lg">Personal Best</span>
                            </div>
                        </div>
                        <Calendar className="absolute -right-4 -bottom-4 w-24 h-24 text-orange-50 opacity-50" />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Activity Area Chart */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary-dark" />
                                Study Activity
                            </h3>
                            <div className="flex gap-2">
                                <button className="px-3 py-1 text-xs font-bold rounded-lg bg-gray-50 text-slate-400">Week</button>
                                <button className="px-3 py-1 text-xs font-bold rounded-lg bg-primary/10 text-primary-dark">Month</button>
                            </div>
                        </div>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={performanceData.map((p, i) => ({
                                    day: p.subject.substring(0, 3).toUpperCase(),
                                    hours: (p.score / 20) // Normalizing score for visual activity representation
                                }))}>
                                    <defs>
                                        <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                                    />
                                    <Area type="monotone" dataKey="hours" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Subject Radar / Breakdown */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <PieChart className="w-5 h-5 text-primary-dark" />
                            Subject Mastery
                        </h3>
                        <div className="space-y-6">
                            {performanceData.length > 0 ? performanceData.map((item, i) => (
                                <div key={i}>
                                    <div className="flex justify-between items-center text-sm mb-2">
                                        <span className="font-semibold text-slate-700">{item.subject}</span>
                                        <span className="font-bold text-primary-dark">
                                            {item.score}%
                                        </span>
                                    </div>
                                    <div className="h-2.5 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                                        <div
                                            className="h-full rounded-full transition-all duration-1000 bg-primary"
                                            style={{ width: `${item.score}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-12 text-slate-400">
                                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">Start practicing to see mastery.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Milestones / Recent Completion */}
                <div className="bg-white p-4 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Award className="w-6 h-6 text-primary" />
                        Recent Milestones
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {milestones.map((m, i) => {
                            const Icon = TrendingUp; // Simple fallback if icon string is used
                            return (
                                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer group">
                                    <div className={`w-14 h-14 ${m.bg} rounded-2xl flex items-center justify-center shrink-0`}>
                                        <TrendingUp className={`w-7 h-7 ${m.color}`} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 group-hover:text-primary-dark transition-colors">{m.title}</h4>
                                        <p className="text-sm text-slate-500">{m.desc}</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-300 ml-auto" />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
}
