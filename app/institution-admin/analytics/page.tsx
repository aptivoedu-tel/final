'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, Building2, Users, Download, RefreshCw, AlertCircle, ChevronRight, GraduationCap } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { AnalyticsService } from '@/lib/services/analyticsService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Loader from '@/components/ui/Loader';

export default function PerformanceAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [drillLoading, setDrillLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'universities' | 'students' | 'drilldown'>('overview');
    const [stats, setStats] = useState<any>(null);
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [drillData, setDrillData] = useState<any>(null);
    const [exporting, setExporting] = useState(false);
    const [duration, setDuration] = useState<'all' | 'today' | '7days' | '30days'>('all');
    const [institutionId, setInstitutionId] = useState<number | null>(null);

    useEffect(() => {
        loadAnalytics();
    }, [duration]);

    useEffect(() => {
        if (selectedStudentId) {
            handleStudentDrilldown(selectedStudentId);
        }
    }, [selectedStudentId]);

    const handleStudentDrilldown = async (studentId: string) => {
        setDrillLoading(true);
        try {
            const { startDate } = getDates();
            const data = await AnalyticsService.getStudentDrilldownAnalytics(studentId, startDate);
            setDrillData(data);
            setActiveTab('drilldown');
        } catch (error) {
            toast.error("Failed to load student deep-dive");
        } finally {
            setDrillLoading(false);
        }
    };

    const getDates = () => {
        let startDate: Date | undefined;
        const endDate = new Date();

        if (duration === 'today') {
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
        } else if (duration === '7days') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
        } else if (duration === '30days') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
        }

        return { startDate, endDate };
    };

    const loadAnalytics = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch institutionId if not already in state
            let currentInstId = institutionId;
            if (!currentInstId) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('institution_id')
                    .eq('id', user.id)
                    .single();

                currentInstId = profile?.institution_id;

                if (!currentInstId) {
                    const { data: adminLink } = await supabase
                        .from('institution_admins')
                        .select('institution_id')
                        .eq('user_id', user.id)
                        .maybeSingle();
                    currentInstId = adminLink?.institution_id;
                }

                if (currentInstId) {
                    setInstitutionId(currentInstId);
                }
            }

            if (!currentInstId) {
                toast.error("Institution link missing.");
                setLoading(false);
                return;
            }

            const { startDate } = getDates();
            const data = await AnalyticsService.getInstitutionDetailedAnalytics(currentInstId, startDate);
            setStats(data);
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to load report");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (exporting || !stats) return;
        setExporting(true);

        try {
            const pdf = new jsPDF();
            const pageWidth = pdf.internal.pageSize.getWidth();

            // Header
            pdf.setFillColor(15, 23, 42); // slate-900
            pdf.rect(0, 0, pageWidth, 40, 'F');

            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(22);
            pdf.setFont('helvetica', 'bold');
            pdf.text("Aptivo Institutional Intelligence", 14, 20);

            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
            pdf.text(`Duration: ${duration.toUpperCase()} | Students: ${stats.overall.totalStudents}`, 14, 35);

            // University Table
            pdf.setTextColor(15, 23, 42);
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text("Campus Performance Leaderboard", 14, 55);

            autoTable(pdf, {
                startY: 60,
                head: [['#', 'University Name', 'Students', 'Avg Score', 'Sessions']],
                body: (stats.universityStats || []).map((u: any, i: number) => [
                    i + 1,
                    u.name || 'N/A',
                    u.studentCount || 0,
                    `${u.averageScore || 0}%`,
                    u.totalSessions || 0
                ]),
                theme: 'striped',
                headStyles: { fillColor: [79, 70, 229] },
                styles: { fontSize: 9 }
            });

            // Student Table
            const finalY = (pdf as any).lastAutoTable?.finalY || 100;
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text("Student Performance Breakdown", 14, finalY + 20);

            autoTable(pdf, {
                startY: finalY + 25,
                head: [['Student Name', 'Avg Score', 'Sessions', 'Status']],
                body: (stats.studentStats || []).map((s: any) => [
                    s.name || 'Unknown',
                    `${s.averageScore || 0}%`,
                    s.totalSessions || 0,
                    s.status || 'Active'
                ]),
                theme: 'grid',
                headStyles: { fillColor: [15, 23, 42] },
                styles: { fontSize: 9 }
            });

            pdf.save(`Institutional_Report_${duration}_${new Date().toLocaleDateString()}.pdf`);
            toast.success("Institutional PDF Generated");
        } catch (error: any) {
            console.error("PDF Export Fail:", error);
            toast.error(`PDF Generation Error: ${error.message}`);
        } finally {
            setExporting(false);
        }
    };

    const handleExportStudent = async () => {
        if (exporting || !drillData) return;
        setExporting(true);

        try {
            const pdf = new jsPDF();
            const pageWidth = pdf.internal.pageSize.getWidth();

            // Header
            pdf.setFillColor(79, 70, 229); // indigo-600
            pdf.rect(0, 0, pageWidth, 50, 'F');

            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(24);
            pdf.setFont('helvetica', 'bold');
            pdf.text(drillData.student.full_name, 14, 25);

            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Individual Performance Report | ${drillData.student.email}`, 14, 35);
            pdf.text(`Duration: ${duration.toUpperCase()} | Generated: ${new Date().toLocaleString()}`, 14, 42);

            // Summary Stats box-like
            pdf.setTextColor(255, 255, 255);
            pdf.text(`Overall Score: ${drillData.stats.averageScore}%`, pageWidth - 60, 25);
            pdf.text(`Total Sessions: ${drillData.stats.totalSessions}`, pageWidth - 60, 32);

            // Subject Mastery Table
            pdf.setTextColor(15, 23, 42);
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text("Subject Mastery Profile", 14, 65);

            autoTable(pdf, {
                startY: 70,
                head: [['Subject', 'Completion/Mastery', 'Attempts']],
                body: (drillData.stats.subjectStats || []).map((s: any) => [
                    s.name,
                    `${s.average}%`,
                    s.count
                ]),
                theme: 'striped',
                headStyles: { fillColor: [79, 70, 229] }
            });

            // Topic Breakdown
            const finalY = (pdf as any).lastAutoTable?.finalY || 100;
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text("Granular Topic Intelligence", 14, finalY + 20);

            autoTable(pdf, {
                startY: finalY + 25,
                head: [['Subject', 'Topic', 'Average Score', 'Attempts']],
                body: (drillData.stats.topicStats || []).map((t: any) => [
                    t.subjectName || '-',
                    t.name,
                    `${t.average}%`,
                    t.count
                ]),
                theme: 'grid',
                headStyles: { fillColor: [15, 23, 42] }
            });

            pdf.save(`Student_Report_${drillData.student.full_name.replace(' ', '_')}_${new Date().toLocaleDateString()}.pdf`);
            toast.success("Individual Student Report Generated");
        } catch (error: any) {
            console.error("Student PDF Export Fail:", error);
            toast.error("Failed to generate individual report");
        } finally {
            setExporting(false);
        }
    };

    if (loading && !stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader size="lg" text="Crunching live institutional data..." />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto pb-20" id="institution-report">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6 mb-8">
                <div>
                    <h1 className="text-2xl lg:text-4xl font-black text-slate-900 tracking-tight">Institutional Intelligence</h1>
                    <p className="text-slate-500 text-base lg:text-lg">Performance metrics across all campuses and students.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:gap-3 w-full lg:w-auto">
                    <div className="flex gap-1 p-1 bg-white border border-gray-100 rounded-xl shadow-sm mr-2">
                        {(['all', 'today', '7days', '30days'] as const).map((d) => (
                            <button
                                key={d}
                                onClick={() => setDuration(d)}
                                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${duration === d ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-gray-50'}`}
                            >
                                {d === 'all' ? 'All Time' : d === 'today' ? 'Today' : d === '7days' ? '7D' : '30D'}
                            </button>
                        ))}
                    </div>
                    <button onClick={loadAnalytics} className="flex-none flex items-center justify-center p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                        <RefreshCw className={`w-5 h-5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-xs lg:text-sm"
                    >
                        {exporting ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        <span className="whitespace-nowrap">{exporting ? 'Generating...' : 'Export PDF Intelligence'}</span>
                    </button>
                </div>
            </div>

            {/* View Switcher */}
            <div className="flex gap-1.5 p-1.5 bg-gray-100 rounded-2xl w-full lg:w-fit mb-10 overflow-x-auto no-scrollbar scroll-smooth">
                {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'universities', label: 'By University' },
                    { id: 'students', label: 'By Student' },
                    { id: 'drilldown', label: 'Deep Intelligence' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`
                            flex-1 lg:flex-none whitespace-nowrap px-4 lg:px-8 py-2.5 rounded-xl font-black text-[10px] lg:text-xs uppercase tracking-widest transition-all
                            ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}
                        `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab: Overview */}
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                        <div className="bg-white p-6 lg:p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute right-0 top-0 p-4 opacity-5 lg:group-hover:scale-110 transition-transform hidden lg:block">
                                <Users className="w-24 h-24 text-indigo-600" />
                            </div>
                            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3 lg:mb-4">Total Students</h3>
                            <div className="text-3xl lg:text-5xl font-black text-slate-900">{stats?.overall.totalStudents}</div>
                            <div className="text-indigo-600 text-[10px] lg:text-xs font-bold mt-2">Across {stats?.overall.totalUniversities} Universities</div>
                        </div>
                        <div className="bg-white p-6 lg:p-8 rounded-3xl border border-gray-100 shadow-sm group">
                            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3 lg:mb-4">Avg Performance</h3>
                            <div className="text-3xl lg:text-5xl font-black text-slate-900">{stats?.overall.averageScore}%</div>
                            <div className="flex items-center gap-1 mt-3 lg:mt-4">
                                <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${stats?.overall.averageScore}%` }} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-6 lg:p-8 rounded-3xl border border-gray-100 shadow-sm">
                            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3 lg:mb-4">Total Sessions</h3>
                            <div className="text-3xl lg:text-5xl font-black text-slate-900">{stats?.overall.totalSessions.toLocaleString()}</div>
                            <p className="text-slate-400 text-[10px] lg:text-xs font-bold mt-2 italic">Completed attempts</p>
                        </div>
                        <div className="bg-indigo-600 p-6 lg:p-8 rounded-3xl shadow-xl shadow-indigo-100 text-white">
                            <h3 className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-3 lg:mb-4">Risk Level</h3>
                            <div className="text-base lg:text-lg font-bold mb-1">
                                {stats?.studentStats.filter((s: any) => s.status === 'At Risk').length} Students
                            </div>
                            <p className="text-indigo-100 text-[10px] lg:text-xs opacity-80 leading-relaxed font-medium">Scoring below 60% average. Priority support recommended.</p>
                        </div>
                    </div>

                    {/* Top Universities Section */}
                    <div className="bg-white rounded-[2rem] p-10 border border-gray-100 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                            <h2 className="text-xl lg:text-2xl font-black text-slate-900">Campus Leaderboard</h2>
                            <button onClick={() => setActiveTab('universities')} className="text-indigo-600 font-bold text-xs lg:text-sm flex items-center gap-1 hover:gap-2 transition-all">
                                Detailed Campus Report <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-4 lg:space-y-6">
                            {stats?.universityStats.sort((a: any, b: any) => b.averageScore - a.averageScore).slice(0, 3).map((uni: any, idx: number) => (
                                <div key={uni.id} className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6 p-4 lg:p-6 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-xl lg:hover:scale-[1.01] transition-all border border-transparent hover:border-indigo-100">
                                    <div className="flex items-center gap-4 lg:gap-6 flex-1">
                                        <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-slate-400 shrink-0">
                                            #{idx + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-slate-900 text-base lg:text-lg truncate">{uni.name}</h4>
                                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{uni.studentCount} active students</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 mt-3 sm:mt-0">
                                        <div className="sm:hidden text-[10px] font-black text-slate-400 uppercase">Avg Score</div>
                                        <div>
                                            <div className="text-xl lg:text-2xl font-black text-indigo-600">{uni.averageScore}%</div>
                                            <div className="hidden sm:block text-[10px] font-black text-slate-400 uppercase">Avg Score</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Tab: Universities */}
            {activeTab === 'universities' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {stats?.universityStats.map((uni: any) => (
                        <div key={uni.id} className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm hover:shadow-2xl transition-all group">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center overflow-hidden border border-indigo-100 p-2 group-hover:scale-110 transition-transform">
                                    {uni.logo_url ? (
                                        <img src={uni.logo_url} alt={uni.name} className="w-full h-full object-contain" />
                                    ) : (
                                        <Building2 className="w-8 h-8 text-indigo-600" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 leading-tight">{uni.name}</h3>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-tighter">{uni.studentCount} Students</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-gray-50 p-4 rounded-2xl">
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Average</p>
                                    <p className="text-xl font-black text-indigo-600">{uni.averageScore}%</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-2xl">
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Volume</p>
                                    <p className="text-xl font-black text-slate-900">{uni.totalSessions}</p>
                                </div>
                            </div>

                            <div className="relative pt-6 border-t border-gray-100 flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-400">
                                <span>{uni.totalQuestions} Questions Solved</span>
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm" title="Active Campus" />
                            </div>
                        </div>
                    ))}
                    {stats?.universityStats.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200">
                            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No campus data yet</p>
                        </div>
                    )}
                </div>
            )}

            {/* Tab: Drilldown */}
            {activeTab === 'drilldown' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-slate-900">Student Deep Intelligence</h2>
                                <p className="text-slate-500 text-xs sm:text-sm font-medium">Select a student to analyze granular progress maps.</p>
                            </div>
                            <div className="w-full md:min-w-[300px] md:w-auto">
                                <select
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 sm:px-6 sm:py-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm sm:text-base"
                                    value={selectedStudentId}
                                    onChange={(e) => setSelectedStudentId(e.target.value)}
                                >
                                    <option value="">Select Student to Probe...</option>
                                    {stats?.studentStats.map((s: any) => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.averageScore}%)</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {drillLoading ? (
                            <div className="py-20 flex flex-col items-center">
                                <Loader text="Accessing Student Core..." />
                            </div>
                        ) : drillData ? (
                            <div className="space-y-10">
                                {/* Student Profile Header */}
                                <div className="flex flex-col md:flex-row items-center gap-6 p-8 bg-slate-900 rounded-3xl text-white shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                                    <div className="w-20 h-20 bg-indigo-500 rounded-2xl flex items-center justify-center text-4xl font-black relative z-10 shrink-0">
                                        {drillData.student.full_name[0]}
                                    </div>
                                    <div className="flex-1 relative z-10 text-center md:text-left">
                                        <h3 className="text-3xl font-black">{drillData.student.full_name}</h3>
                                        <p className="text-indigo-300 font-bold opacity-80">{drillData.student.email}</p>
                                    </div>
                                    <div className="flex flex-col items-center md:items-end gap-3 relative z-10">
                                        <div className="text-right">
                                            <div className="text-4xl font-black text-indigo-400">{drillData.stats.averageScore}%</div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Composite Score</p>
                                        </div>
                                        <button
                                            onClick={handleExportStudent}
                                            disabled={exporting}
                                            className="px-4 py-2 bg-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2"
                                        >
                                            <Download className="w-3 h-3" />
                                            {exporting ? 'Exporting...' : 'Export Individual Report'}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* University Progress */}
                                    <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
                                        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                                            <Building2 className="w-5 h-5 text-indigo-600" />
                                            University Proficiency
                                        </h3>
                                        <div className="space-y-4">
                                            {drillData.stats.universityStats.map((u: any) => (
                                                <div key={u.name} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="font-bold text-slate-900">{u.name}</span>
                                                        <span className="text-sm font-black text-indigo-600">{u.average}%</span>
                                                    </div>
                                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                                                            style={{ width: `${u.average}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                            {drillData.stats.universityStats.length === 0 && <p className="text-slate-400 text-sm font-medium italic">No university specific data available.</p>}
                                        </div>
                                    </div>

                                    {/* Subject Progress */}
                                    <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
                                        <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                                            <GraduationCap className="w-5 h-5 text-indigo-600" />
                                            Subject Mastery
                                        </h3>
                                        <div className="space-y-4">
                                            {drillData.stats.subjectStats.map((s: any) => (
                                                <div key={s.name} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color || '#6366f1' }} />
                                                            <span className="font-bold text-slate-900">{s.name}</span>
                                                        </div>
                                                        <span className="text-sm font-black text-indigo-600">{s.average}%</span>
                                                    </div>
                                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-1000"
                                                            style={{
                                                                width: `${s.average}%`,
                                                                backgroundColor: s.color || '#6366f1'
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                            {drillData.stats.subjectStats.length === 0 && <p className="text-slate-400 text-sm font-medium italic">No subject data identified.</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Topic Analysis */}
                                <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
                                    <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-indigo-600" />
                                        Granular Topic Intelligence
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {drillData.stats.topicStats.map((t: any) => (
                                            <div key={t.name} className="bg-white p-6 rounded-2xl border border-gray-100 hover:shadow-lg transition-all">
                                                <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">{t.subjectName}</p>
                                                <h4 className="font-bold text-slate-900 mb-4 line-clamp-1">{t.name}</h4>
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <div className="text-2xl font-black text-slate-900">{t.average}%</div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{t.count} Attempts</div>
                                                    </div>
                                                    <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${t.average >= 75 ? 'bg-green-50 text-green-600' : t.average >= 50 ? 'bg-blue-50 text-indigo-600' : 'bg-red-50 text-red-600'}`}>
                                                        {t.average >= 75 ? 'Mastery' : t.average >= 50 ? 'Steady' : 'Support'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {drillData.stats.topicStats.length === 0 && <p className="text-slate-400 text-sm font-medium italic col-span-full">Awaiting student activity on specific topics.</p>}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-20 text-center">
                                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-400 font-bold uppercase tracking-widest">Select a student from the dropdown above to begin analysis</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
