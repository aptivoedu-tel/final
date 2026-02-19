'use client';

import React, { useEffect, useState } from 'react';
import {
    TrendingUp,
    AlertTriangle,
    Clock,
    Zap,
    Brain,
    Target,
    ChevronRight,
    Sparkles,
    PlayCircle,
    Loader2,
    ChevronDown,
    Building2,
    Download,
    FileText
} from 'lucide-react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
} from 'recharts';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/shared/Footer';
import { AuthService } from '@/lib/services/authService';
import { ProfileService } from '@/lib/services/profileService';
import { useUI } from '@/lib/context/UIContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function DeepInsightsPage() {
    const { isSidebarCollapsed } = useUI();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [weakTopics, setWeakTopics] = useState<any[]>([]);
    const [performanceTrend, setPerformanceTrend] = useState<any[]>([]);
    const [behaviorSummary, setBehaviorSummary] = useState<any>(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [universities, setUniversities] = useState<any[]>([]);
    const [selectedUni, setSelectedUni] = useState<string>('general');
    const [isUniMenuOpen, setIsUniMenuOpen] = useState(false);
    const uniDropdownRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (uniDropdownRef.current && !uniDropdownRef.current.contains(event.target as Node)) {
                setIsUniMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const loadInitialData = async () => {
            const currentUser = AuthService.getCurrentUser();
            if (!currentUser) {
                window.location.href = '/login';
                return;
            }
            setUser(currentUser);
            setLoading(false);

            // Fetch list of student's universities
            const { universities: uniList, error } = await ProfileService.getStudentUniversities(currentUser.id);
            if (!error && uniList) {
                const uniqueUnis = uniList.map(u => u.universities);
                setUniversities(uniqueUnis);
            }
        };

        loadInitialData();
    }, []);

    useEffect(() => {
        const loadAnalytics = async () => {
            if (!user) return;

            setDataLoading(true);
            try {
                const query = selectedUni !== 'general' ? `?university_id=${selectedUni}` : '';

                const [weakRes, trendRes, behaviorRes] = await Promise.all([
                    fetch(`/api/analytics/weak-topics${query}`).then(r => r.json()),
                    fetch(`/api/analytics/performance-trend${query}`).then(r => r.json()),
                    fetch(`/api/analytics/behavior-summary${query}`).then(r => r.json())
                ]);

                if (weakRes.data) setWeakTopics(weakRes.data);
                if (trendRes.data) setPerformanceTrend(trendRes.data);
                if (behaviorRes.data) setBehaviorSummary(behaviorRes.data);

            } catch (error) {
                console.error("Failed to load analytics data", error);
            } finally {
                setDataLoading(false);
            }
        };

        loadAnalytics();
    }, [user, selectedUni]);

    const handlePracticeNow = (topic: string, subtopicId?: number, topicId?: number) => {
        const params = new URLSearchParams();
        params.set('topic', topic);
        if (subtopicId) params.set('subtopicId', subtopicId.toString());
        if (topicId) params.set('topicId', topicId.toString());
        window.location.href = `/practice?${params.toString()}`;
    };

    const handleDownloadReport = () => {
        const doc = new jsPDF();
        const uniName = selectedUni === 'general' ? 'Overall Performance' : universities.find(u => u.id.toString() === selectedUni)?.name || 'University';
        const timestamp = new Date().toLocaleString();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(20, 184, 166); // Teal Color
        doc.text('Deep Insights - Analytics Report', 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // Slate 400
        doc.text(`Generated on: ${timestamp}`, 14, 30);
        doc.text(`Target: ${uniName}`, 14, 35);

        // Summary Section
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42); // Slate 900
        doc.text('Behavioral Summary', 14, 48);

        autoTable(doc, {
            startY: 52,
            head: [['Metric', 'Value', 'Context']],
            body: [
                ['Overthink Count', behaviorSummary?.totalOverthinkCount || 0, 'Frequency of second-guessing or delayed responses.'],
                ['Rush Count', behaviorSummary?.totalRushCount || 0, 'Instances of high-speed incorrect answers.'],
                ['Avg Time/Question', `${behaviorSummary?.averageTimePerQuestion || 0}s`, 'Mean latency per cognitive engagement.']
            ],
            theme: 'striped',
            headStyles: { fillColor: [20, 184, 166], textColor: [255, 255, 255] }
        });

        // Weak Topics Section
        const finalY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.text('Critical Precision Areas (Weak Topics)', 14, finalY);

        if (weakTopics.length > 0) {
            const tableBody = weakTopics.map(item => [
                item.topic,
                `${item.accuracy}%`,
                item.totalQuestions,
                item.weakestSubtopics?.map((s: any) => s.name).join(', ') || 'N/A'
            ]);

            autoTable(doc, {
                startY: finalY + 4,
                head: [['Topic', 'Accuracy', 'Total Qs', 'Focus Subtopics']],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [244, 63, 94], textColor: [255, 255, 255] } // Rose 500
            });
        } else {
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text('No critical weaknesses detected for this selection.', 14, finalY + 10);
        }

        // Footer
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`Aptivo Intelligence Report | Page ${i} of ${pageCount}`, 14, 285);
        }

        doc.save(`Aptivo_Report_${uniName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    if (loading) return null;

    return (
        <div className="min-h-screen bg-gray-50 font-sans transition-colors duration-300">
            <Sidebar userRole="student" />

            <div className={`flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-24' : 'lg:ml-72'}`}>
                <Header userName={user?.full_name || 'Student'} userEmail={user?.email} userAvatar={user?.avatar_url} />

                <main className="p-4 lg:p-10 mt-28 lg:mt-24">
                    <div className="max-w-7xl mx-auto space-y-12">

                        {/* Page Header with University Filter & Download */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-200 pb-8">
                            <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-3 mb-4">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 text-teal-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                                        <Sparkles className="w-3 h-3" />
                                        AI Powered Insights
                                    </div>
                                    <div className={`inline-flex items-center gap-2 px-3 py-1 ${selectedUni === 'general' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'} rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500`}>
                                        <Target className="w-3 h-3" />
                                        Viewing: {selectedUni === 'general' ? 'Overall Performance' : `Insights for ${universities.find(u => u.id.toString() === selectedUni)?.name || 'University'}`}
                                    </div>
                                    {dataLoading && (
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            Syncing Data
                                        </div>
                                    )}
                                </div>
                                <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-none">Deep Insights</h1>
                                <p className="text-slate-500 font-bold mt-4 max-w-2xl">Advanced behavioral analysis and precision mapping of your learning curve to accelerate mastery.</p>
                            </div>

                            <div className="flex flex-col md:flex-row items-end gap-4">
                                {/* Download Report Button */}
                                <button
                                    onClick={handleDownloadReport}
                                    title="Download Performance Report"
                                    className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-teal-600 hover:border-teal-500 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300 group focus:outline-none focus:ring-4 focus:ring-teal-500/10"
                                >
                                    <Download className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                </button>

                                {/* University Filter Dropdown */}
                                <div className="w-full md:w-80 space-y-3" ref={uniDropdownRef}>
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1 block">
                                        Filter by University
                                    </label>
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsUniMenuOpen(!isUniMenuOpen)}
                                            className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-full p-4 px-6 flex items-center justify-between hover:border-teal-500 hover:shadow-lg hover:shadow-teal-500/5 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-teal-500/10"
                                        >
                                            <div className="flex items-center gap-3 truncate">
                                                <Building2 className={`w-4 h-4 ${selectedUni === 'general' ? 'text-indigo-400' : 'text-teal-500'}`} />
                                                <span className="truncate">
                                                    {selectedUni === 'general' ? 'General Analytics' : universities.find(u => u.id.toString() === selectedUni)?.name}
                                                </span>
                                            </div>
                                            <ChevronDown className={`w-4 h-4 transition-transform duration-500 ${isUniMenuOpen ? 'rotate-180 text-teal-500' : 'text-slate-400'}`} />
                                        </button>

                                        {/* Custom Dropdown Menu */}
                                        {isUniMenuOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-3 p-2 bg-white border border-slate-100 shadow-2xl shadow-teal-900/10 rounded-[2rem] z-50 animate-in fade-in zoom-in-95 duration-300 origin-top overflow-hidden backdrop-blur-xl">
                                                <div className="max-h-72 overflow-y-auto custom-scrollbar">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUni('general');
                                                            setIsUniMenuOpen(false);
                                                        }}
                                                        className={`w-full text-left p-4 px-6 rounded-2xl text-xs font-bold transition-all flex items-center gap-3 ${selectedUni === 'general' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                                                    >
                                                        <Building2 className="w-4 h-4" />
                                                        General Analytics
                                                    </button>
                                                    <div className="h-px bg-slate-50 my-1 mx-4" />
                                                    {universities.map((uni) => (
                                                        <button
                                                            key={uni.id}
                                                            onClick={() => {
                                                                setSelectedUni(uni.id.toString());
                                                                setIsUniMenuOpen(false);
                                                            }}
                                                            className={`w-full text-left p-4 px-6 rounded-2xl text-xs font-bold transition-all flex items-center gap-3 ${selectedUni === uni.id.toString() ? 'bg-teal-50 text-teal-600' : 'text-slate-600 hover:bg-slate-50'}`}
                                                        >
                                                            <div className="w-2 h-2 rounded-full bg-slate-200 group-hover:bg-teal-400 transition-colors" />
                                                            <span className="truncate">{uni.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Behavior Summary Section */}
                        <section className="space-y-4">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Behavior Genetics</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                                {dataLoading && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 rounded-[2.5rem] flex items-center justify-center transition-opacity" />}

                                {/* Overthink Card */}
                                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all group">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                            <Brain className="w-7 h-7" />
                                        </div>
                                        <div className="text-[10px] font-black text-orange-400 uppercase tracking-widest bg-orange-50 px-3 py-1 rounded-full">Caution</div>
                                    </div>
                                    <h3 className="text-4xl font-black text-slate-900 leading-none mb-1">{behaviorSummary?.totalOverthinkCount || 0}</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 leading-none">Total Overthink Events</p>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">System detected {behaviorSummary?.totalOverthinkCount || 0} instances where you second-guessed correct paths or exceeded standard response time limits.</p>
                                </div>

                                {/* Rush Card */}
                                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all group">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                            <Zap className="w-7 h-7" />
                                        </div>
                                        <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-full">High Risk</div>
                                    </div>
                                    <h3 className="text-4xl font-black text-slate-900 leading-none mb-1">{behaviorSummary?.totalRushCount || 0}</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 leading-none">Total Rush Events</p>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">Instances of rapid-fire incorrect responses. Focus on deceleration during high-complexity sequences.</p>
                                </div>

                                {/* Avg Time Card */}
                                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all group">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                            <Clock className="w-7 h-7" />
                                        </div>
                                        <div className="text-[10px] font-black text-teal-400 uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-full">Tempo</div>
                                    </div>
                                    <h3 className="text-4xl font-black text-slate-900 leading-none mb-1">{behaviorSummary?.averageTimePerQuestion || 0}s</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 leading-none">Mean Response Latency</p>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">Your average neural engagement time per problem. Ideal tempo is 45-60s for your current difficulty level.</p>
                                </div>
                            </div>
                        </section>

                        {/* Detailed Weak Topics Section */}
                        <section className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Critical Precision Mapping</h2>
                                <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest animate-pulse flex items-center gap-2">
                                    <AlertTriangle className="w-3 h-3" />
                                    Action Required
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6 min-h-[400px]">
                                {dataLoading ? (
                                    <div className="space-y-4">
                                        {[1, 2].map(i => <div key={i} className="h-48 bg-gray-100 rounded-[2.5rem] animate-pulse border border-slate-200" />)}
                                    </div>
                                ) : weakTopics.length > 0 ? (
                                    weakTopics.map((item, i) => (
                                        <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden relative group hover:border-teal-100 transition-all animate-in fade-in slide-in-from-bottom-5 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                                            {/* Decorative Background Element */}
                                            <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                                                <Target className="w-64 h-64 rotate-12" />
                                            </div>

                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
                                                {/* Left: Topic Info */}
                                                <div className="flex-1 space-y-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.accuracy < 50 ? 'bg-rose-50 text-rose-600' : 'bg-orange-50 text-orange-600'}`}>
                                                            <Target className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-2xl font-black text-slate-900 leading-none mb-1">{item.topic}</h3>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-[10px] font-black uppercase tracking-widest ${item.accuracy < 50 ? 'text-rose-500' : 'text-orange-500'}`}>{item.accuracy}% Accuracy</span>
                                                                <div className="w-1 h-1 rounded-full bg-slate-200" />
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.totalQuestions} Questions Solved</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Accuracy Bar */}
                                                    <div className="space-y-2 max-w-md">
                                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                            <span>Precision Score</span>
                                                            <span className={item.accuracy < 50 ? 'text-rose-500' : 'text-orange-500'}>{item.accuracy}%</span>
                                                        </div>
                                                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full transition-all duration-1000 ${item.accuracy < 50 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]' : 'bg-orange-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]'}`}
                                                                style={{ width: `${item.accuracy}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Subtopics Grid */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {item.weakestSubtopics?.map((sub: any, si: number) => (
                                                            <div key={si} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col justify-between group/sub">
                                                                <p className="text-xs font-bold text-slate-700 mb-2 truncate">{sub.name}</p>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Accuracy</span>
                                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${sub.accuracy < 50 ? 'text-rose-500' : 'text-orange-500'}`}>{sub.accuracy}%</span>
                                                                </div>
                                                                <div className="w-full h-1 bg-gray-200 rounded-full mt-2 overflow-hidden">
                                                                    <div
                                                                        className={`h-full ${sub.accuracy < 50 ? 'bg-rose-500' : 'bg-orange-500'}`}
                                                                        style={{ width: `${sub.accuracy}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Right: Practice Button */}
                                                <div className="w-full lg:w-auto shrink-0">
                                                    <button
                                                        onClick={() => handlePracticeNow(item.topic, item.weakestSubtopics?.[0]?.id, item.topicId)}
                                                        className="w-full lg:w-48 py-5 bg-teal-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all hover:bg-teal-700 flex items-center justify-center gap-3 shadow-xl shadow-teal-900/10 active:scale-95 group/btn"
                                                    >
                                                        Practice Now
                                                        <PlayCircle className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="bg-white p-16 rounded-[2.5rem] border border-gray-100 text-center space-y-4 transition-all duration-500">
                                        <div className="w-20 h-20 bg-teal-50 text-teal-500 mx-auto rounded-3xl flex items-center justify-center mb-6">
                                            <Sparkles className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900">Immaculate Precision Detected</h3>
                                        <p className="text-slate-500 font-medium max-w-sm mx-auto">No critical focus areas identified for this selection. Your performance profile shows balanced mastery.</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Trend Graph Section */}
                        <section className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
                            <div className="flex items-center justify-between mb-10">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 leading-tight">Mastery Velocity</h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Temporal accuracy progression</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-teal-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Accuracy %</span>
                                    </div>
                                </div>
                            </div>

                            <div className="h-[350px] w-full mt-4">
                                {dataLoading ? (
                                    <div className="h-full flex items-center justify-center text-slate-300 font-black uppercase tracking-[0.2em] text-[10px] animate-pulse">Processing temporal data...</div>
                                ) : performanceTrend.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={performanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                                domain={[0, 100]}
                                            />
                                            <RechartsTooltip
                                                contentStyle={{
                                                    borderRadius: '1.5rem',
                                                    border: 'none',
                                                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                                    backgroundColor: '#1e293b',
                                                    color: '#fff',
                                                    padding: '12px 16px'
                                                }}
                                                itemStyle={{ color: '#2dd4bf', fontWeight: 800, fontSize: '12px' }}
                                                labelStyle={{ color: '#94a3b8', fontWeight: 700, fontSize: '10px', marginBottom: '4px' }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="accuracy"
                                                stroke="#14b8a6"
                                                strokeWidth={4}
                                                dot={{ r: 5, fill: '#14b8a6', strokeWidth: 3, stroke: '#fff' }}
                                                activeDot={{ r: 8, strokeWidth: 0, fill: '#14b8a6' }}
                                                animationDuration={2000}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-300 py-12 transition-all">
                                        <TrendingUp className="w-16 h-16 mb-4 opacity-20" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Insufficient temporal data to map velocity for this selection</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        <Footer />
                    </div>
                </main>
            </div>
        </div>
    );
}
