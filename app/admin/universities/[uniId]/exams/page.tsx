'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import {
    Plus, Search, Trash2, Edit2, X, CheckCircle, Upload,
    Image as ImageIcon, FileText, Save, Layout, ChevronLeft,
    Settings, Clock, AlertCircle, FileSpreadsheet, Eye,
    ChevronDown, ChevronUp, Copy, BookOpen, Building2, ExternalLink, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useUI } from '@/lib/context/UIContext';

type ExamType = 'mock' | 'module' | 'final';
type QuestionType = 'mcq_single' | 'mcq_multiple' | 'true_false' | 'numerical' | 'essay' | 'passage';

interface Exam {
    id: number;
    university_id: number;
    name: string;
    exam_type: ExamType;
    total_duration: number;
    allow_continue_after_time_up: boolean;
    allow_reattempt: boolean;
    auto_submit: boolean;
    result_release_setting: string;
    is_active: boolean;
    negative_marking?: number;
}

interface Section {
    id: number;
    exam_id: number;
    name: string;
    section_duration?: number;
    num_questions: number;
    weightage: number;
    order_index: number;
    negative_marking?: number;
    default_marks_per_question?: number;
}

interface Question {
    id?: number;
    section_id: number;
    question_text: string;
    image_url?: string;
    image_type: 'direct' | 'drive';
    question_type: QuestionType;
    options: any;
    correct_answer: any;
    marks: number;
    difficulty?: string;
    explanation?: string;
    order_index: number;
    passage_id?: number | null;
}

export default function UniversityExamsPage() {
    const params = useParams();
    const router = useRouter();
    const uniId = parseInt(params.uniId as string);
    const { isSidebarCollapsed } = useUI();

    const [loading, setLoading] = useState(true);
    const [university, setUniversity] = useState<any>(null);
    const [exams, setExams] = useState<Exam[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [isExamModalOpen, setIsExamModalOpen] = useState(false);
    const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
    const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
    const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [preselectedSectionId, setPreselectedSectionId] = useState<number | null>(null);

    // Selection
    const [activeExam, setActiveExam] = useState<Exam | null>(null);
    const [activeSection, setActiveSection] = useState<Section | null>(null);
    const [sections, setSections] = useState<Section[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);

    // Form States
    const [examForm, setExamForm] = useState<any>({
        name: '',
        exam_type: 'mock',
        total_duration: 120,
        allow_continue_after_time_up: false,
        allow_reattempt: true,
        auto_submit: true,
        result_release_setting: 'instant',
        negative_marking: 0
    });

    const [sectionForm, setSectionForm] = useState<any>({
        name: '',
        section_duration: null,
        num_questions: 10,
        weightage: 1.0,
        order_index: 0,
        negative_marking: 0,
        default_marks_per_question: 1
    });

    useEffect(() => {
        if (uniId) {
            fetchInitialData();
        }
    }, [uniId]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const { data: uni } = await supabase.from('universities').select('*').eq('id', uniId).single();
            setUniversity(uni);

            const { data: examsData } = await supabase
                .from('university_exams')
                .select('*')
                .eq('university_id', uniId)
                .order('created_at', { ascending: false });

            setExams(examsData || []);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchSections = async (examId: number) => {
        const { data } = await supabase
            .from('exam_sections')
            .select('*')
            .eq('exam_id', examId)
            .order('order_index');
        setSections(data || []);
    };

    const handleSaveExam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;

        console.log('Attempting to save exam:', { payload: { ...examForm, university_id: uniId }, activeExamId: activeExam?.id });

        setIsSaving(true);
        try {
            const payload = {
                name: examForm.name,
                exam_type: examForm.exam_type,
                total_duration: Number(examForm.total_duration),
                allow_continue_after_time_up: examForm.allow_continue_after_time_up,
                allow_reattempt: examForm.allow_reattempt,
                auto_submit: examForm.auto_submit,
                result_release_setting: examForm.result_release_setting,
                negative_marking: Number(examForm.negative_marking || 0),
                university_id: uniId
            };

            if (activeExam?.id) {
                const { error } = await supabase.from('university_exams').update(payload).eq('id', activeExam.id);
                if (error) throw error;
                toast.success('Exam updated successfully');
            } else {
                const { error } = await supabase.from('university_exams').insert([payload]);
                if (error) throw error;
                toast.success('Exam created successfully');
            }
            setIsExamModalOpen(false);
            fetchInitialData();
        } catch (error: any) {
            console.error('Error saving exam:', error);
            toast.error(`Database Error: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveSection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeExam) return;
        try {
            const payload = { ...sectionForm, exam_id: activeExam.id };
            if (activeSection?.id) {
                const { error } = await supabase.from('exam_sections').update(payload).eq('id', activeSection.id);
                if (error) throw error;
                toast.success('Section updated');
            } else {
                const { error } = await supabase.from('exam_sections').insert([payload]);
                if (error) throw error;
                toast.success('Section created');
            }
            setIsSectionModalOpen(false);
            fetchSections(activeExam.id);
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDeleteExam = async (id: number) => {
        if (!confirm('Are you sure you want to delete this exam and all its contents?')) return;
        const { error } = await supabase.from('university_exams').delete().eq('id', id);
        if (error) toast.error(error.message);
        else {
            toast.success('Exam deleted');
            fetchInitialData();
        }
    };

    const filteredExams = exams.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="min-h-screen bg-[#f8fafc] flex font-sans">
            <Sidebar userRole="super_admin" />
            <div className="flex-1 flex flex-col">
                <Header />

                <main className={`${isSidebarCollapsed ? 'ml-20' : 'ml-72'} mt-16 p-8 transition-all duration-300`}>
                    <div className="max-w-7xl mx-auto">
                        {/* Breadcrumbs & Header */}
                        <div className="mb-8 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => router.push('/admin/universities')}
                                    className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 transition-all hover:bg-slate-50"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <div>
                                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                                        {university?.name || 'University'} Exams
                                    </h1>
                                    <div className="flex items-center gap-2 text-slate-500 mt-1 uppercase text-[10px] font-black tracking-widest">
                                        <Building2 className="w-3.5 h-3.5" />
                                        <span>Exam Management Dashboard</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setActiveExam(null);
                                    setExamForm({
                                        name: '',
                                        exam_type: 'mock',
                                        total_duration: 120,
                                        allow_continue_after_time_up: false,
                                        allow_reattempt: true,
                                        auto_submit: true,
                                        result_release_setting: 'instant',
                                        negative_marking: 0
                                    });
                                    setIsExamModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                            >
                                <Plus className="w-4 h-4" />
                                Create New Exam
                            </button>
                        </div>

                        {/* Search & Filter */}
                        <div className="bg-white p-4 rounded-3xl border border-slate-100 mb-8 shadow-sm flex items-center gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search exams by name..."
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 border border-transparent transition-all font-medium text-slate-700"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Exams List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="bg-white h-64 rounded-3xl border border-slate-100 animate-pulse shadow-sm" />
                                ))
                            ) : filteredExams.length === 0 ? (
                                <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 shadow-sm">
                                    <Layout className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                                    <h3 className="text-xl font-bold text-slate-900 mb-1">No Exams Found</h3>
                                    <p className="text-slate-500 font-medium">Create your first university test to get started.</p>
                                </div>
                            ) : (
                                filteredExams.map(exam => (
                                    <div key={exam.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-50/50 transition-all group relative overflow-hidden">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${exam.exam_type === 'final' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                                                exam.exam_type === 'module' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                                                    'bg-indigo-50 border-indigo-100 text-indigo-600'
                                                }`}>
                                                {exam.exam_type} Test
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setActiveExam(exam);
                                                        setExamForm({
                                                            name: exam.name,
                                                            exam_type: exam.exam_type,
                                                            total_duration: exam.total_duration,
                                                            allow_continue_after_time_up: exam.allow_continue_after_time_up,
                                                            allow_reattempt: exam.allow_reattempt,
                                                            auto_submit: exam.auto_submit,
                                                            result_release_setting: exam.result_release_setting,
                                                            negative_marking: exam.negative_marking || 0
                                                        });
                                                        setIsExamModalOpen(true);
                                                    }}
                                                    className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteExam(exam.id)}
                                                    className="p-2 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-black text-slate-900 mb-2 line-clamp-1">{exam.name}</h3>

                                        <div className="space-y-3 mb-8">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Clock className="w-4 h-4" />
                                                <span className="text-xs font-bold">{exam.total_duration} Minutes Duration</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Settings className="w-4 h-4" />
                                                <span className="text-xs font-bold">
                                                    {exam.allow_continue_after_time_up ? 'Open Ended' : 'Hard Stop'} • {exam.allow_reattempt ? 'Multi-Attempt' : 'Single-Shot'}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                setActiveExam(exam);
                                                fetchSections(exam.id);
                                            }}
                                            className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                                        >
                                            Configure Sections & Questions
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* activeExam Detail Area */}
                        {activeExam && (
                            <div className="mt-12 bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500">
                                <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl">
                                            <Layout className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-slate-900">{activeExam.name}</h2>
                                            <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mt-1">Sectional Architecture</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => {
                                                setSectionForm({
                                                    name: '',
                                                    section_duration: null,
                                                    num_questions: 10,
                                                    weightage: 1.0,
                                                    order_index: sections.length,
                                                    negative_marking: 0,
                                                    default_marks_per_question: 1
                                                });
                                                setIsSectionModalOpen(true);
                                            }}
                                            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add Section
                                        </button>
                                        <button
                                            onClick={() => setIsBulkUploadModalOpen(true)}
                                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                                        >
                                            <FileSpreadsheet className="w-4 h-4" />
                                            Bulk Upload
                                        </button>
                                        <button
                                            onClick={() => setActiveExam(null)}
                                            className="p-3 text-slate-400 hover:text-slate-900 rounded-2xl hover:bg-white transition-all shadow-sm"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-10">
                                    {sections.length === 0 ? (
                                        <div className="py-20 text-center">
                                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <Layout className="w-10 h-10 text-slate-200" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 mb-2">No Sections Defined</h3>
                                            <p className="text-slate-500 max-w-sm mx-auto font-medium">Add sections like English, Math, or IQ to structure this exam correctly.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {sections.map(section => (
                                                <div key={section.id} className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:border-indigo-100 transition-all group">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-900 font-black border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                                            {section.order_index + 1}
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => {
                                                                    setSectionForm(section);
                                                                    setActiveSection(section);
                                                                    setIsSectionModalOpen(true);
                                                                }}
                                                                className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (confirm('Delete this section?')) {
                                                                        await supabase.from('exam_sections').delete().eq('id', section.id);
                                                                        fetchSections(activeExam.id);
                                                                    }
                                                                }}
                                                                className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <h4 className="text-lg font-black text-slate-900 mb-4">{section.name}</h4>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="bg-white p-3 rounded-2xl border border-slate-100">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Questions</p>
                                                            <p className="text-sm font-black text-slate-900">{section.num_questions}</p>
                                                        </div>
                                                        <div className="bg-white p-3 rounded-2xl border border-slate-100">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Time (Min)</p>
                                                            <p className="text-sm font-black text-slate-900">{section.section_duration || 'Global'}</p>
                                                        </div>
                                                        <div className="bg-white p-3 rounded-2xl border border-slate-100">
                                                            <p className="text-[10px] font-black text-red-400 uppercase tracking-tighter mb-1">Neg. Marking</p>
                                                            <p className="text-sm font-black text-slate-900">-{section.negative_marking || 0}</p>
                                                        </div>
                                                        <div className="bg-white p-3 rounded-2xl border border-slate-100">
                                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter mb-1">Def. Marks</p>
                                                            <p className="text-sm font-black text-slate-900">{section.default_marks_per_question || 1}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3 mt-6">
                                                        <button
                                                            onClick={() => {
                                                                setPreselectedSectionId(section.id!);
                                                                setIsBulkUploadModalOpen(true);
                                                            }}
                                                            className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
                                                        >
                                                            <FileSpreadsheet className="w-3.5 h-3.5" />
                                                            Bulk Upload
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setActiveSection(section);
                                                                setIsQuestionModalOpen(true);
                                                            }}
                                                            className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-900 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm"
                                                        >
                                                            Manage Questions
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
                {/* --- MODALS --- */}

                {/* Exam Modal */}
                {
                    isExamModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200 border border-slate-200">
                                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                                    <h3 className="text-xl font-black text-slate-900">{activeExam ? 'Edit Exam Path' : 'Define New Exam'}</h3>
                                    <button onClick={() => setIsExamModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <form onSubmit={handleSaveExam} className="p-8 space-y-5">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Exam Name</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                                            placeholder="e.g. NET Computing Standard"
                                            value={examForm.name}
                                            onChange={e => setExamForm({ ...examForm, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Exam Type</label>
                                            <select
                                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700 appearance-none"
                                                value={examForm.exam_type}
                                                onChange={e => setExamForm({ ...examForm, exam_type: e.target.value })}
                                            >
                                                <option value="mock">Mock Test</option>
                                                <option value="module">Module Test</option>
                                                <option value="final">Final Exam</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Duration (Min)</label>
                                            <input
                                                required
                                                type="number"
                                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                                                value={examForm.total_duration}
                                                onChange={e => setExamForm({ ...examForm, total_duration: parseInt(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Negative Marking (e.g. 0.25)</label>
                                            <input
                                                required
                                                type="number"
                                                step="0.01"
                                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                                                value={examForm.negative_marking || 0}
                                                onChange={e => setExamForm({ ...examForm, negative_marking: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4 pt-4 border-t border-slate-50">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    className="peer hidden"
                                                    checked={examForm.allow_continue_after_time_up}
                                                    onChange={e => setExamForm({ ...examForm, allow_continue_after_time_up: e.target.checked })}
                                                />
                                                <div className="w-10 h-6 bg-slate-200 rounded-full peer-checked:bg-indigo-600 transition-all shadow-inner" />
                                                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:left-5 shadow-sm" />
                                            </div>
                                            <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Allow continue after time-up</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    className="peer hidden"
                                                    checked={examForm.allow_reattempt}
                                                    onChange={e => setExamForm({ ...examForm, allow_reattempt: e.target.checked })}
                                                />
                                                <div className="w-10 h-6 bg-slate-200 rounded-full peer-checked:bg-indigo-600 transition-all shadow-inner" />
                                                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:left-5 shadow-sm" />
                                            </div>
                                            <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Allow Reattempts</span>
                                        </label>
                                    </div>
                                    <div className="pt-6">
                                        <button
                                            type="submit"
                                            disabled={isSaving}
                                            className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 text-xs uppercase tracking-[0.2em] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                                            {isSaving ? 'Saving...' : (activeExam ? 'Sync Changes' : 'Initialize Exam')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

                {/* Section Modal */}
                {
                    isSectionModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200 border border-slate-200">
                                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                                    <h3 className="text-xl font-black text-slate-900">{activeSection ? 'Edit Section' : 'Add New Section'}</h3>
                                    <button onClick={() => setIsSectionModalOpen(false)} className="text-slate-400 hover:text-slate-900">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <form onSubmit={handleSaveSection} className="p-8 space-y-5">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Section Name (e.g. English)</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                                            value={sectionForm.name}
                                            onChange={e => setSectionForm({ ...sectionForm, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Questions</label>
                                            <input
                                                required
                                                type="number"
                                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                                                value={sectionForm.num_questions}
                                                onChange={e => setSectionForm({ ...sectionForm, num_questions: parseInt(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Section Time (Opt)</label>
                                            <input
                                                type="number"
                                                placeholder="Global"
                                                value={sectionForm.section_duration || ''}
                                                onChange={e => setSectionForm({ ...sectionForm, section_duration: e.target.value ? parseInt(e.target.value) : null })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Neg. Marking (Override)</label>
                                            <input
                                                required
                                                type="number"
                                                step="0.01"
                                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                                                value={sectionForm.negative_marking || 0}
                                                onChange={e => setSectionForm({ ...sectionForm, negative_marking: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Default Marks/Q</label>
                                            <input
                                                required
                                                type="number"
                                                step="0.1"
                                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                                                value={sectionForm.default_marks_per_question || 1}
                                                onChange={e => setSectionForm({ ...sectionForm, default_marks_per_question: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div className="pt-6">
                                        <button
                                            type="submit"
                                            className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 text-xs uppercase tracking-[0.2em] active:scale-95"
                                        >
                                            Save Section
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

                {/* Question Management Modal */}
                {
                    isQuestionModalOpen && activeSection && (
                        <QuestionManager
                            section={activeSection}
                            onClose={() => setIsQuestionModalOpen(false)}
                            onBulkUpload={() => {
                                setPreselectedSectionId(activeSection.id!);
                                setIsBulkUploadModalOpen(true);
                            }}
                        />
                    )
                }

                {/* Bulk Upload Modal */}
                {
                    isBulkUploadModalOpen && activeExam && (
                        <BulkUploadModal
                            exam={activeExam}
                            sections={sections}
                            preselectedSectionId={preselectedSectionId}
                            onClose={() => {
                                setIsBulkUploadModalOpen(false);
                                setPreselectedSectionId(null);
                            }}
                            onSuccess={() => {
                                fetchSections(activeExam.id);
                                setIsBulkUploadModalOpen(false);
                                setPreselectedSectionId(null);
                            }}
                        />
                    )
                }
            </div >
        </div >
    );
}

// --- SUB-COMPONENTS ---

function QuestionManager({ section, onClose, onBulkUpload }: { section: Section, onClose: () => void, onBulkUpload: () => void }) {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [passages, setPassages] = useState<any[]>([]);
    const [isPassageModalOpen, setIsPassageModalOpen] = useState(false);
    const [passageForm, setPassageForm] = useState({ title: '', content: '' });

    const [form, setForm] = useState<any>({
        question_text: '',
        image_url: '',
        image_type: 'direct',
        question_type: 'mcq_single',
        options: [{ id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }, { id: 'd', text: '' }],
        correct_answer: 'a',
        marks: 1.0,
        difficulty: 'medium',
        explanation: '',
        order_index: 0,
        passage_id: null,
        passage_content: '',
        child_questions: []
    });

    useEffect(() => {
        fetchQuestions();
        fetchPassages();
    }, [section.id]);

    const fetchPassages = async () => {
        const { data } = await supabase.from('passages').select('*').order('created_at', { ascending: false });
        setPassages(data || []);
    };

    const fetchQuestions = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('exam_questions')
            .select('*')
            .eq('section_id', section.id)
            .order('order_index');
        setQuestions(data || []);
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (form.question_type === 'passage') {
                if (!form.passage_content) {
                    toast.error("Passage content is required");
                    return;
                }

                // 1. Manage Passage Entity
                let pId = form.passage_id;
                if (!pId) {
                    const { data, error } = await supabase.from('passages').insert([{ title: 'Passage Bunch', content: form.passage_content }]).select().single();
                    if (error) throw error;
                    pId = data.id;
                } else {
                    await supabase.from('passages').update({ content: form.passage_content }).eq('id', pId);
                }

                // 2. Manage Child Questions
                if (form.child_questions && form.child_questions.length > 0) {
                    for (const child of form.child_questions) {
                        const childPayload = {
                            section_id: section.id,
                            passage_id: pId,
                            question_text: child.question_text || 'Untitled Question',
                            question_type: child.question_type || 'mcq_single',
                            marks: child.marks || 1,
                            difficulty: 'medium',
                            correct_answer: child.correct_answer || 'a',
                            options: child.options,
                            order_index: child.order_index || 0
                        };

                        // Check if it's a temp ID (timestamp) or real ID
                        const isTemp = child.id > 1000000000;

                        if (!isTemp) {
                            await supabase.from('exam_questions').update(childPayload).eq('id', child.id);
                        } else {
                            await supabase.from('exam_questions').insert([childPayload]);
                        }
                    }
                }

                // 3. Manage Master Question (Placeholder for List)
                const masterPayload = {
                    section_id: section.id,
                    question_text: form.passage_content.substring(0, 100) + '...',
                    passage_id: pId,
                    question_type: 'passage',
                    marks: 0,
                    correct_answer: 'N/A',
                    options: []
                };

                if (editingQuestion && editingQuestion.id) {
                    await supabase.from('exam_questions').update(masterPayload).eq('id', editingQuestion.id);
                } else {
                    await supabase.from('exam_questions').insert([masterPayload]);
                }

                toast.success('Passage Bunch Saved');

            } else {
                // Standard Single Question Logic
                const payload = {
                    ...form,
                    section_id: section.id,
                    correct_answer: form.correct_answer || (form.question_type === 'essay' || form.question_type === 'passage' ? 'N/A' : 'a')
                };

                // Remove bundle-specific fields to avoid DB errors
                delete payload.passage_content;
                delete payload.child_questions;

                if (payload.image_type === 'drive' && payload.image_url) {
                    payload.image_url = convertDriveLink(payload.image_url);
                }

                if (editingQuestion?.id) {
                    const { error } = await supabase.from('exam_questions').update(payload).eq('id', editingQuestion.id);
                    if (error) throw error;
                    toast.success('Question updated');
                } else {
                    const { error } = await supabase.from('exam_questions').insert([payload]);
                    if (error) throw error;
                    toast.success('Question added');
                }
            }
            setIsFormOpen(false);
            fetchQuestions();
        } catch (error: any) {
            console.error('Save Question Error:', error);
            toast.error(error.message);
        }
    };

    const handleEditClick = async (q: Question) => {
        setEditingQuestion(q);
        if (q.question_type === 'passage' && q.passage_id) {
            const toastId = toast.loading("Loading Passage Bundle...");
            try {
                // Fetch Passage Content
                const { data: pData } = await supabase.from('passages').select('*').eq('id', q.passage_id).single();
                // Fetch Children (exclude self)
                const { data: cData } = await supabase.from('exam_questions')
                    .select('*')
                    .eq('passage_id', q.passage_id)
                    .neq('id', q.id || -1)
                    .order('order_index');

                setForm({
                    ...q,
                    passage_content: pData?.content || '',
                    child_questions: cData || []
                });
                toast.dismiss(toastId);
            } catch (err) {
                toast.error("Failed to load bundle details");
            }
        } else {
            setForm({ ...q, passage_content: '', child_questions: [] });
        }
        setIsFormOpen(true);
    };

    const handleCreatePassage = async () => {
        if (!passageForm.content) return;
        const { data, error } = await supabase.from('passages').insert([passageForm]).select().single();
        if (error) {
            toast.error(error.message);
        } else {
            toast.success('Passage created');
            await fetchPassages();
            setForm({ ...form, passage_id: data.id });
            setIsPassageModalOpen(false);
            setPassageForm({ title: '', content: '' });
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this question?')) return;
        const { error } = await supabase.from('exam_questions').delete().eq('id', id);
        if (error) toast.error(error.message);
        else fetchQuestions();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900">{section.name} - Question Bank</h3>
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">Managing {questions.length} / {section.num_questions} Questions</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {!isFormOpen && (
                            <button
                                onClick={() => {
                                    setEditingQuestion(null);
                                    setForm({
                                        question_text: '',
                                        image_url: '',
                                        image_type: 'direct',
                                        question_type: 'mcq_single',
                                        options: [{ id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }, { id: 'd', text: '' }],
                                        correct_answer: 'a',
                                        marks: 1.0,
                                        difficulty: 'medium',
                                        explanation: '',
                                        order_index: questions.length
                                    });
                                    setIsFormOpen(true);
                                }}
                                className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl"
                            >
                                <Plus className="w-4 h-4" />
                                Individual Entry
                            </button>
                        )}
                        <button
                            onClick={onBulkUpload}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            Bulk Seeding
                        </button>
                        <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 bg-slate-50/30 custom-scrollbar">
                    {isFormOpen ? (
                        <div className="max-w-3xl mx-auto bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl animate-in zoom-in-95 duration-200">
                            <form onSubmit={handleSave} className="space-y-6">
                                <div className="mb-6">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Question Type</label>
                                    <select
                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700 appearance-none transition-all"
                                        value={form.question_type}
                                        onChange={e => setForm({ ...form, question_type: e.target.value })}
                                    >
                                        <option value="mcq_single">MCQ (Single Choice)</option>
                                        <option value="mcq_multiple">MCQ (Multiple Choice)</option>
                                        <option value="true_false">True / False</option>
                                        <option value="numerical">Numerical</option>
                                        <option value="essay">Essay / Long Answer</option>
                                        <option value="passage">Passage / Comprehension Bunch</option>
                                    </select>
                                </div>

                                {form.question_type === 'passage' ? (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Passage Content</label>
                                            <textarea
                                                required
                                                className="w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700 min-h-[200px] leading-relaxed custom-scrollbar text-base"
                                                placeholder="Paste or type the comprehension passage here..."
                                                value={form.passage_content}
                                                onChange={e => setForm({ ...form, passage_content: e.target.value })}
                                            />
                                        </div>

                                        <div className="p-8 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100/50">
                                            <div className="flex justify-between items-center mb-6">
                                                <div>
                                                    <h4 className="text-sm font-black text-indigo-900">Question Bunch</h4>
                                                    <p className="text-[10px] text-indigo-600 font-bold mt-1">Questions linked to this passage</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newQ = {
                                                            id: Date.now(),
                                                            question_text: '',
                                                            question_type: 'mcq_single',
                                                            options: [{ id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }, { id: 'd', text: '' }],
                                                            correct_answer: 'a',
                                                            marks: 1,
                                                            order_index: (form.child_questions?.length || 0)
                                                        };
                                                        setForm({ ...form, child_questions: [...(form.child_questions || []), newQ] });
                                                    }}
                                                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                                                >
                                                    <Plus className="w-3.5 h-3.5" /> Add Question
                                                </button>
                                            </div>

                                            <div className="space-y-4">
                                                {(!form.child_questions || form.child_questions.length === 0) ? (
                                                    <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-indigo-200 text-indigo-300">
                                                        <span className="text-xs font-bold">No questions added yet</span>
                                                    </div>
                                                ) : (
                                                    form.child_questions.map((q: any, i: number) => (
                                                        <div key={q.id || i} className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm relative group">
                                                            <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500 rounded-l-3xl"></span>
                                                            <div className="ml-4">
                                                                <div className="flex gap-4 mb-4">
                                                                    <input
                                                                        placeholder="Question..."
                                                                        className="flex-1 bg-transparent font-bold text-slate-700 outline-none border-b border-dashed border-slate-200 focus:border-indigo-500 pb-1"
                                                                        value={q.question_text}
                                                                        onChange={(e) => {
                                                                            const updated = [...form.child_questions];
                                                                            updated[i].question_text = e.target.value;
                                                                            setForm({ ...form, child_questions: updated });
                                                                        }}
                                                                    />
                                                                    <button type="button" onClick={() => {
                                                                        const updated = form.child_questions.filter((_: any, idx: number) => idx !== i);
                                                                        setForm({ ...form, child_questions: updated });
                                                                    }} className="text-rose-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    {q.options && q.options.map((opt: any, optIdx: number) => (
                                                                        <div key={opt.id} className="flex items-center gap-2">
                                                                            <button type="button"
                                                                                onClick={() => {
                                                                                    const updated = [...form.child_questions];
                                                                                    updated[i].correct_answer = opt.id;
                                                                                    setForm({ ...form, child_questions: updated });
                                                                                }}
                                                                                className={`w-6 h-6 rounded-full text-[10px] font-black border ${q.correct_answer === opt.id ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}
                                                                            >{opt.id.toUpperCase()}</button>
                                                                            <input
                                                                                className="bg-slate-50 rounded-lg px-3 py-1.5 text-xs font-bold w-full outline-none focus:ring-1 focus:ring-indigo-200"
                                                                                placeholder={`Option ${opt.id.toUpperCase()}`}
                                                                                value={opt.text}
                                                                                onChange={(e) => {
                                                                                    const updated = [...form.child_questions];
                                                                                    updated[i].options[optIdx].text = e.target.value;
                                                                                    setForm({ ...form, child_questions: updated });
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6 animate-in fade-in duration-300">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Principal Question Text</label>
                                            <textarea
                                                required
                                                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700 min-h-[120px] resize-none"
                                                placeholder="Enter the question statement here..."
                                                value={form.question_text}
                                                onChange={e => setForm({ ...form, question_text: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Image Integration (Opt)</label>
                                                <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100 mb-2">
                                                    <button type="button" onClick={() => setForm({ ...form, image_type: 'direct' })} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${form.image_type === 'direct' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>Direct Link</button>
                                                    <button type="button" onClick={() => setForm({ ...form, image_type: 'drive' })} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${form.image_type === 'drive' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>Google Drive</button>
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        placeholder={form.image_type === 'drive' ? 'Paste Drive sharing link...' : 'https://example.com/image.jpg'}
                                                        className="w-full p-4 pl-10 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-xs"
                                                        value={form.image_url}
                                                        onChange={e => setForm({ ...form, image_url: e.target.value })}
                                                    />
                                                    <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                </div>
                                            </div>
                                        </div>

                                        {form.image_url && (
                                            <div className="mt-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                                                <div className="w-20 h-20 bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm flex-shrink-0">
                                                    <img
                                                        src={form.image_type === 'drive' ? convertDriveLink(form.image_url) : form.image_url}
                                                        alt="Preview"
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => (e.currentTarget.src = 'https://placehold.co/100x100?text=Invalid+Link')}
                                                    />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Image Preview</p>
                                                    <p className="text-[10px] text-slate-500 mt-1 truncate max-w-[400px]">{form.image_url}</p>
                                                </div>
                                            </div>
                                        )}

                                        {(form.question_type === 'mcq_single' || form.question_type === 'mcq_multiple') && (
                                            <div className="space-y-4">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Distractor Options</label>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {form.options.map((opt: any, idx: number) => (
                                                        <div key={idx} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${form.correct_answer.includes(opt.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (form.question_type === 'mcq_single') {
                                                                        setForm({ ...form, correct_answer: opt.id });
                                                                    } else {
                                                                        const current = Array.isArray(form.correct_answer) ? form.correct_answer : [form.correct_answer];
                                                                        const next = current.includes(opt.id)
                                                                            ? current.filter((id: any) => id !== opt.id)
                                                                            : [...current, opt.id];
                                                                        setForm({ ...form, correct_answer: next });
                                                                    }
                                                                }}
                                                                className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] border-2 transition-all ${form.correct_answer.includes(opt.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}
                                                            >
                                                                {opt.id.toUpperCase()}
                                                            </button>
                                                            <input
                                                                required
                                                                type="text"
                                                                className="flex-1 bg-transparent outline-none font-bold text-slate-700 text-sm"
                                                                placeholder={`Option ${opt.id.toUpperCase()} text...`}
                                                                value={opt.text}
                                                                onChange={e => {
                                                                    const newOpts = [...form.options];
                                                                    newOpts[idx] = { ...opt, text: e.target.value };
                                                                    setForm({ ...form, options: newOpts });
                                                                }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {form.question_type === 'true_false' && (
                                            <div className="flex gap-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setForm({ ...form, correct_answer: 'true' })}
                                                    className={`flex-1 py-4 rounded-2xl border font-black text-sm uppercase tracking-widest transition-all ${form.correct_answer === 'true' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                                                >
                                                    True
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setForm({ ...form, correct_answer: 'false' })}
                                                    className={`flex-1 py-4 rounded-2xl border font-black text-sm uppercase tracking-widest transition-all ${form.correct_answer === 'false' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                                                >
                                                    False
                                                </button>
                                            </div>
                                        )}

                                        {form.question_type === 'numerical' && (
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Numerical Answer</label>
                                                <input
                                                    required
                                                    type="text"
                                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                                                    placeholder="Enter exact numerical value..."
                                                    value={form.correct_answer}
                                                    onChange={e => setForm({ ...form, correct_answer: e.target.value })}
                                                />
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Conceptual Explanation (Shown after exam)</label>
                                            <textarea
                                                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700 min-h-[100px] resize-none"
                                                placeholder="Explain why the correct answer is right..."
                                                value={form.explanation}
                                                onChange={e => setForm({ ...form, explanation: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-4 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsFormOpen(false)}
                                        className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all text-xs uppercase tracking-widest"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 text-xs uppercase tracking-widest active:scale-95"
                                    >
                                        Save Question
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : questions.length === 0 ? (
                        <div className="py-20 text-center">
                            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                            <h3 className="text-xl font-bold text-slate-900 mb-2">No Questions Seeded</h3>
                            <p className="text-slate-500 font-medium">Use the bulk uploader or add questions manually to this section.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {questions.map((q, idx) => (
                                <div key={q.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative group hover:shadow-lg transition-all">
                                    <div className="absolute left-0 top-0 w-2 h-full bg-indigo-600 rounded-l-full opacity-0 group-hover:opacity-100 transition-all" />
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-2 py-0.5 bg-indigo-50 rounded">
                                                        {q.question_type.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                        {q.marks} Mark(s) • {q.difficulty}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEditClick(q)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-xl transition-all"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(q.id!)}
                                                className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 rounded-xl transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row gap-8">
                                        <div className="flex-1">
                                            <p className="text-slate-900 font-bold leading-relaxed text-lg mb-6">{q.question_text}</p>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {q.question_type.startsWith('mcq') && q.options.map((opt: any) => (
                                                    <div key={opt.id} className={`p-4 rounded-2xl border text-sm flex items-center gap-3 ${q.correct_answer.includes(opt.id) ? 'bg-green-50 border-green-100' : 'bg-slate-50 border-slate-50'}`}>
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] ${q.correct_answer.includes(opt.id) ? 'bg-green-600 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}>
                                                            {opt.id.toUpperCase()}
                                                        </div>
                                                        <span className={q.correct_answer.includes(opt.id) ? 'font-bold text-green-700' : 'text-slate-600'}>{opt.text}</span>
                                                    </div>
                                                ))}
                                                {q.question_type === 'true_false' && (
                                                    <div className="flex gap-3">
                                                        <div className={`px-6 py-3 rounded-2xl border text-xs font-black uppercase tracking-widest ${q.correct_answer === 'true' ? 'bg-green-50 border-green-100 text-green-600' : 'bg-slate-50 border-slate-50 text-slate-300'}`}>True</div>
                                                        <div className={`px-6 py-3 rounded-2xl border text-xs font-black uppercase tracking-widest ${q.correct_answer === 'false' ? 'bg-green-50 border-green-100 text-green-600' : 'bg-slate-50 border-slate-50 text-slate-300'}`}>False</div>
                                                    </div>
                                                )}
                                                {q.question_type === 'numerical' && (
                                                    <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-black text-sm">
                                                        Value: {q.correct_answer}
                                                    </div>
                                                )}
                                            </div>

                                            {q.explanation && (
                                                <div className="mt-6 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Explanation</p>
                                                    <p className="text-sm font-medium text-slate-600 italic">"{q.explanation}"</p>
                                                </div>
                                            )}
                                        </div>

                                        {q.image_url && (
                                            <div className="w-full md:w-64 h-48 bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm relative group-image">
                                                <img
                                                    src={q.image_url}
                                                    className="w-full h-full object-cover transition-transform group-image:hover:scale-105"
                                                    alt="Question Illustration"
                                                />
                                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-image:hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <button
                                                        onClick={() => window.open(q.image_url, '_blank')}
                                                        className="p-3 bg-white rounded-2xl text-slate-900 shadow-xl scale-90 hover:scale-100 transition-all"
                                                    >
                                                        <ExternalLink className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function BulkUploadModal({ exam, sections, preselectedSectionId, onClose, onSuccess }: { exam: Exam, sections: Section[], preselectedSectionId?: number | null, onClose: () => void, onSuccess: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'validating' | 'ready' | 'error'>('idle');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            parseExcel(selected);
        }
    };

    const parseExcel = async (file: File) => {
        setStatus('validating');
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const rows: any[] = XLSX.utils.sheet_to_json(sheet);

                // Map to our structure and validate
                const mapped = rows.map((row, i) => {
                    // Normalize keys (smart case)
                    const getVal = (patterns: string[]) => {
                        const key = Object.keys(row).find(k => patterns.some(p => k.toLowerCase().includes(p.toLowerCase())));
                        return key ? row[key] : null;
                    };

                    const question_text = getVal(['question', 'text', 'statement']);
                    const raw_section = getVal(['section', 'subject', 'category']);

                    let section = null;
                    if (preselectedSectionId) {
                        section = sections.find(s => s.id === preselectedSectionId);
                    } else {
                        section = sections.find(s => s.name.toLowerCase() === (raw_section?.toString().toLowerCase() || ''));
                    }

                    if (!question_text || !section) return { ...row, __error: !question_text ? 'Missing question text' : 'Invalid or missing section name' };

                    return {
                        section_id: section.id,
                        section_name: section.name,
                        question_text,
                        explanation: getVal(['explanation', 'reason', 'justify']) || '',
                        image_url: getVal(['image', 'url', 'link']) || '',
                        image_type: (getVal(['image', 'url', 'link'])?.toString().includes('drive.google.com')) ? 'drive' : 'direct',
                        question_type: 'mcq_single', // Default or detect
                        options: [
                            { id: 'a', text: getVal(['option a', 'a']) || '' },
                            { id: 'b', text: getVal(['option b', 'b']) || '' },
                            { id: 'c', text: getVal(['option c', 'c']) || '' },
                            { id: 'd', text: getVal(['option d', 'd']) || '' },
                        ],
                        correct_answer: getVal(['correct', 'answer'])?.toString().toLowerCase() || 'a',
                        marks: parseFloat(getVal(['marks', 'weight'])?.toString() || '1'),
                        difficulty: getVal(['difficulty', 'level'])?.toString() || 'medium',
                        order_index: i
                    };
                });

                setPreview(mapped);
                setStatus(mapped.some(r => r.__error) ? 'error' : 'ready');
            } catch (err: any) {
                toast.error('Failed to parse excel: ' + err.message);
                setStatus('idle');
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleUpload = async () => {
        setUploading(true);
        try {
            const batch = preview.filter(r => !r.__error).map(r => {
                const { section_name, __error, ...clean } = r;
                if (clean.image_type === 'drive' && clean.image_url) {
                    clean.image_url = convertDriveLink(clean.image_url);
                }
                return clean;
            });

            const { error } = await supabase.from('exam_questions').insert(batch);
            if (error) throw error;

            toast.success(`Successfully uploaded ${batch.length} questions!`);
            onSuccess();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden border border-slate-200">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900">Intelligence Bulk Import</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Automated Question Seeding System</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-900 rounded-2xl hover:bg-white transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                    {status === 'idle' ? (
                        <div className="h-full flex flex-col items-center justify-center">
                            <label className="group relative w-full max-w-xl h-64 border-4 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer hover:border-indigo-600/20 hover:bg-indigo-50/30 transition-all overflow-hidden bg-slate-50/50">
                                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl mb-6 group-hover:scale-110 transition-transform">
                                        <Upload className="w-8 h-8 text-indigo-600" />
                                    </div>
                                    <h4 className="text-lg font-black text-slate-900 mb-1">Upload Excel / CSV</h4>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Question, Section, Option A-D, Correct, Marks</p>
                                </div>
                                <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileChange} />
                            </label>

                            <div className="mt-12 w-full max-w-xl grid grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-[2rem] border border-slate-100">
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Supported Columns</h5>
                                    <div className="flex flex-wrap gap-2">
                                        {['Question', 'Section', 'Option A-D', 'Correct', 'Marks', 'Image_URL'].map(c => (
                                            <span key={c} className="px-3 py-1 bg-slate-50 text-[9px] font-black text-slate-600 rounded-full border border-slate-100">{c}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-[2rem] border border-slate-100">
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Image Support</h5>
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Direct links or Google Drive sharing links are automatically processed into cloud-ready assets.</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-6">
                                    <div className="bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Detected</span>
                                        <p className="text-2xl font-black text-slate-900">{preview.length} Rows</p>
                                    </div>
                                    <div className={`px-6 py-4 rounded-3xl border shadow-sm ${status === 'error' ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${status === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>Status</span>
                                        <p className={`text-2xl font-black ${status === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>{status === 'error' ? 'Errors Found' : 'Validation Passed'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setStatus('idle')} className="px-8 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Re-Upload</button>
                                    <button
                                        disabled={status === 'error' || uploading}
                                        onClick={handleUpload}
                                        className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
                                    >
                                        {uploading ? 'Processing Data...' : 'Confirm & Deploy'}
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-[2.5rem] border border-slate-100 bg-white overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-900">
                                        <tr>
                                            <th className="px-8 py-6 text-[10px] font-black text-indigo-400 uppercase tracking-widest">#</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-white uppercase tracking-widest">Question Text</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-white uppercase tracking-widest">Section</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-white uppercase tracking-widest">Image</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-white uppercase tracking-widest">Meta</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {preview.map((row, i) => (
                                            <tr key={i} className={`hover:bg-slate-50/50 transition-colors ${row.__error ? 'bg-rose-50/30' : ''}`}>
                                                <td className="px-8 py-6 font-black text-slate-400 text-sm">{i + 1}</td>
                                                <td className="px-8 py-6">
                                                    <p className="text-slate-900 font-bold text-sm line-clamp-2">{row.question_text || row.Question || '---'}</p>
                                                    {row.__error && <p className="text-[10px] font-black text-rose-500 uppercase mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {row.__error}</p>}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${row.section_id ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                                                        {row.section_name || row.Section || 'ERROR'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    {row.image_url ? (
                                                        <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 overflow-hidden">
                                                            <img src={row.image_type === 'drive' ? convertDriveLink(row.image_url) : row.image_url} alt="Mini Preview" className="w-full h-full object-cover" />
                                                        </div>
                                                    ) : <span className="text-[10px] font-black text-slate-300">NONE</span>}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] font-black text-slate-900 uppercase">{row.correct_answer?.toUpperCase()}</span>
                                                        <span className="text-[9px] font-black text-slate-400 uppercase">{row.marks} Marks</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Helper: Convert Drive Sharable Link to Direct Stream Link
function convertDriveLink(url: string) {
    if (!url || !url.includes('drive.google.com')) return url;
    try {
        let fileId = '';
        if (url.includes('/d/')) {
            fileId = url.split('/d/')[1].split('/')[0];
        } else if (url.includes('id=')) {
            fileId = url.split('id=')[1].split('&')[0];
        }
        return fileId ? `https://drive.google.com/uc?export=view&id=${fileId}` : url;
    } catch (e) {
        return url;
    }
}
