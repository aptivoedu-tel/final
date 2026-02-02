'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, Building2, Users, Download, RefreshCw, AlertCircle, ChevronRight, GraduationCap } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { AnalyticsService } from '@/lib/services/analyticsService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function PerformanceAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [drillLoading, setDrillLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'universities' | 'students' | 'drilldown'>('overview');
    const [stats, setStats] = useState<any>(null);
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [drillData, setDrillData] = useState<any>(null);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        loadAnalytics();
    }, []);

    useEffect(() => {
        if (selectedStudentId) {
            handleStudentDrilldown(selectedStudentId);
        }
    }, [selectedStudentId]);

    const handleStudentDrilldown = async (studentId: string) => {
        setDrillLoading(true);
        try {
            const data = await AnalyticsService.getStudentDrilldownAnalytics(studentId);
            setDrillData(data);
            setActiveTab('drilldown');
        } catch (error) {
            toast.error("Failed to load student deep-dive");
        } finally {
            setDrillLoading(false);
        }
    };

    const loadAnalytics = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('users')
                .select('institution_id')
                .eq('id', user.id)
                .single();

            if (!profile?.institution_id) {
                toast.error("Institution link missing.");
                setLoading(false);
                return;
            }

            const data = await AnalyticsService.getInstitutionDetailedAnalytics(profile.institution_id);
            setStats(data);
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to load live report");
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
            pdf.text(`Total Students: ${stats.overall.totalStudents} | Avg Performance: ${stats.overall.averageScore}%`, 14, 35);

            // University Table
            pdf.setTextColor(15, 23, 42);
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text("Campus Performance Leaderboard", 14, 55);

            autoTable(pdf, {
                startY: 60,
                head: [['#', 'University Name', 'Students', 'Avg Score', 'Sessions']],
                body: stats.universityStats.map((u: any, i: number) => [
                    i + 1,
                    u.name,
                    u.studentCount,
                    `${u.averageScore}%`,
                    u.totalSessions
                ]),
                theme: 'striped',
                headStyles: { fillColor: [79, 70, 229] }, // indigo-600
                styles: { fontSize: 9 }
            });

            // Student Table
            const finalY = (pdf as any).lastAutoTable.cursor.y;
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text("Student Performance Breakdown", 14, finalY + 20);

            autoTable(pdf, {
                startY: finalY + 25,
                head: [['Student Name', 'Avg Score', 'Sessions', 'Status']],
                body: stats.studentStats.map((s: any) => [
                    s.name,
                    `${s.averageScore}%`,
                    s.totalSessions,
                    s.status
                ]),
                theme: 'grid',
                headStyles: { fillColor: [15, 23, 42] }, // slate-900
                styles: { fontSize: 9 }
            });

            pdf.save(`Aptivo_Institutional_Report_${new Date().toLocaleDateString()}.pdf`);
            toast.success("Standardized PDF Generated");
        } catch (error: any) {
            console.error("PDF Export Fail:", error);
            toast.error(`PDF Generation Error: ${error.message}`);
        } finally {
            setExporting(false);
        }
    };

    if (loading && !stats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Crunching live data...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto pb-20" id="institution-report">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Institutional Intelligence</h1>
                    <p className="text-slate-500 text-lg">Performance metrics across all campuses and students.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={loadAnalytics} className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                        <RefreshCw className={`w-5 h-5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {exporting ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        {exporting ? 'Generating PDF...' : 'Export PDF Intelligence'}
                    </button>
                </div>
            </div>

            {/* View Switcher */}
            <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl w-fit mb-10">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('universities')}
                    className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'universities' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    By University
                </button>
                <button
                    onClick={() => setActiveTab('students')}
                    className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'students' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    By Student
                </button>
                <button
                    onClick={() => setActiveTab('drilldown')}
                    className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'drilldown' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    Deep Intelligence
                </button>
            </div>

            {/* Tab: Overview */}
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                                <Users className="w-24 h-24 text-indigo-600" />
                            </div>
                            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">Total Students</h3>
                            <div className="text-5xl font-black text-slate-900">{stats?.overall.totalStudents}</div>
                            <div className="text-indigo-600 text-xs font-bold mt-2">Across {stats?.overall.totalUniversities} Universities</div>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm group">
                            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">Avg Performance</h3>
                            <div className="text-5xl font-black text-slate-900">{stats?.overall.averageScore}%</div>
                            <div className="flex items-center gap-1 mt-2">
                                <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${stats?.overall.averageScore}%` }} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                            <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">Total Sessions</h3>
                            <div className="text-5xl font-black text-slate-900">{stats?.overall.totalSessions.toLocaleString()}</div>
                            <p className="text-slate-400 text-xs font-bold mt-2 italic">Completed attempts</p>
                        </div>
                        <div className="bg-indigo-600 p-8 rounded-3xl shadow-xl shadow-indigo-100 text-white">
                            <h3 className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-4">Risk Level</h3>
                            <div className="text-lg font-bold mb-1">
                                {stats?.studentStats.filter((s: any) => s.status === 'At Risk').length} Students
                            </div>
                            <p className="text-indigo-100 text-xs opacity-80 leading-relaxed font-medium">Scoring below 60% average. Priority support recommended.</p>
                        </div>
                    </div>

                    {/* Top Universities Section */}
                    <div className="bg-white rounded-[2rem] p-10 border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-slate-900">Campus Leaderboard</h2>
                            <button onClick={() => setActiveTab('universities')} className="text-indigo-600 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">
                                Detailed Campus Report <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-6">
                            {stats?.universityStats.sort((a: any, b: any) => b.averageScore - a.averageScore).slice(0, 3).map((uni: any, idx: number) => (
                                <div key={uni.id} className="flex items-center gap-6 p-6 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-xl hover:scale-[1.01] transition-all border border-transparent hover:border-indigo-100">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-slate-400">
                                        #{idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-900 text-lg">{uni.name}</h4>
                                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{uni.studentCount} active students</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-indigo-600">{uni.averageScore}%</div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase">Avg Score</div>
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
                                <h2 className="text-2xl font-black text-slate-900">Student Deep Intelligence</h2>
                                <p className="text-slate-500 text-sm font-medium">Select a student to analyze granular progress maps.</p>
                            </div>
                            <div className="min-w-[300px]">
                                <select
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
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
                                <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Accessing Student Core...</p>
                            </div>
                        ) : drillData ? (
                            <div className="space-y-10">
                                {/* Student Profile Header */}
                                <div className="flex items-center gap-6 p-8 bg-slate-900 rounded-3xl text-white shadow-xl">
                                    <div className="w-20 h-20 bg-indigo-500 rounded-2xl flex items-center justify-center text-4xl font-black">
                                        {drillData.student.full_name[0]}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-3xl font-black">{drillData.student.full_name}</h3>
                                        <p className="text-indigo-300 font-bold opacity-80">{drillData.student.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-4xl font-black text-indigo-400">{drillData.stats.averageScore}%</div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Composite Score</p>
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
