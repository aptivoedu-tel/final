'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
    Plus, Search, Trash2, Edit2, X, FileText, Save, ChevronLeft,
    Clock, AlertCircle, Layout, Loader2, BookOpen, ChevronRight,
    Settings, Layers, HelpCircle, Upload, FileSpreadsheet, Image as ImageIcon,
    CheckCircle, List, ArrowLeft, BarChart3, Target, Zap, Users, Calendar, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { AuthService } from '@/lib/services/authService';
import * as XLSX from 'xlsx';

type ExamType = 'mock' | 'module' | 'final';
type QuestionType = 'mcq_single' | 'mcq_multiple' | 'true_false' | 'numerical' | 'essay' | 'passage' | 'short_answer' | 'fill_blank' | 'matching' | 'ordering' | 'hotspot' | 'case_study';

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
    created_by?: string;
    institution_id?: number | null;
    start_time?: string;
    end_time?: string;
}

interface Passage {
    id: number;
    title: string;
    content: string;
}

interface Section {
    id: number;
    exam_id: number;
    name: string;
    num_questions: number;
    weightage: number;
    order_index: number;
}

interface Question {
    id?: number;
    section_id: number;
    question_text: string;
    question_type: QuestionType | string;
    image_url?: string;
    options: string[];
    correct_answer: any;
    marks: number;
    explanation?: string;
    passage_id?: number | null;
}

interface UniversityExamManagerProps {
    uniId: number;
    userRole: string;
    onBack: () => void;
}

export default function UniversityExamManager({ uniId, userRole, onBack }: UniversityExamManagerProps) {
    const [loading, setLoading] = useState(true);
    const [university, setUniversity] = useState<any>(null);
    const [exams, setExams] = useState<Exam[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [user, setUser] = useState<any>(null);

    // View State
    const [view, setView] = useState<'exams' | 'sections' | 'questions' | 'results'>('exams');
    const [activeExam, setActiveExam] = useState<Exam | null>(null);
    const [activeSection, setActiveSection] = useState<Section | null>(null);
    const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);

    // Data State
    const [sections, setSections] = useState<Section[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [passages, setPassages] = useState<Passage[]>([]);
    const [examResults, setExamResults] = useState<any[]>([]);

    // Modal States
    const [isExamModalOpen, setIsExamModalOpen] = useState(false);
    const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
    const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [isPassageModalOpen, setIsPassageModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form States
    const [examForm, setExamForm] = useState<any>({
        name: '', exam_type: 'mock', total_duration: 120,
        allow_continue_after_time_up: false, allow_reattempt: true,
        auto_submit: true, result_release_setting: 'instant',
        is_active: true, negative_marking: 0,
        start_time: '', end_time: ''
    });

    const [sectionForm, setSectionForm] = useState<any>({
        name: '', num_questions: 10, weightage: 10, order_index: 0
    });

    const [questionForm, setQuestionForm] = useState<any>({
        question_text: '',
        image_url: '',
        question_type: 'mcq_single',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct_answer: '',
        marks: 1,
        explanation: '',
        passage_id: '' as string | number
    });

    const [passageForm, setPassageForm] = useState({
        title: '',
        content: ''
    });
    const [activePassage, setActivePassage] = useState<Passage | null>(null);
    const [passageQuestions, setPassageQuestions] = useState<Question[]>([]);
    const [imageUploading, setImageUploading] = useState(false);

    useEffect(() => {
        const init = async () => {
            const currentUser = AuthService.getCurrentUser();
            if (currentUser) {
                setUser(currentUser);
                await fetchInitialData(currentUser);
            }
        };
        init();
    }, [uniId]);

    const fetchInitialData = async (currentUser: any = user) => {
        setLoading(true);
        try {
            const { data: uni } = await supabase.from('universities').select('*').eq('id', uniId).single();
            setUniversity(uni);

            let query = supabase
                .from('university_exams')
                .select('*')
                .eq('university_id', uniId);

            if (userRole === 'super_admin') {
                // Super admin: show all global (null) + created by them? OR just all global.
                // Assuming super admin manages global pool.
                query = query.is('institution_id', null);
            } else if (userRole === 'institution_admin' && currentUser?.institution_id) {
                // Institution admin: Global exams OR their institution's exams
                query = query.or(`institution_id.is.null,institution_id.eq.${currentUser.institution_id}`);
            } else if (userRole === 'institution_admin') {
                // Fallback: if user not fully loaded, likely global only
                query = query.is('institution_id', null);
            }

            const { data: examsData } = await query.order('created_at', { ascending: false });

            const { data: passagesData } = await supabase
                .from('passages')
                .select('*')
                .order('created_at', { ascending: false });

            if (examsData) setExams(examsData);
            if (passagesData) setPassages(passagesData);
        } catch (error: any) {
            console.error('Error fetching exam data:', error);
            toast.error('Failed to load exam data');
        } finally {
            setLoading(false);
        }
    };

    const handleSavePassage = async () => {
        if (!passageForm.content) {
            toast.error("Passage content is required");
            return;
        }

        setIsSaving(true);
        try {
            if (activePassage) {
                const { error } = await supabase
                    .from('passages')
                    .update(passageForm)
                    .eq('id', activePassage.id);
                if (error) throw error;
                toast.success("Passage updated");
                setPassages(passages.map(p => p.id === activePassage.id ? { ...p, ...passageForm } : p));
            } else {
                const { data, error } = await supabase
                    .from('passages')
                    .insert([passageForm])
                    .select()
                    .single();

                if (error) throw error;
                toast.success("Passage created successfully");
                setPassages([data, ...passages]);
                setActivePassage(data);
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const fetchPassageQuestions = async (passageId: number) => {
        const { data } = await supabase.from('exam_questions').select('*').eq('passage_id', passageId).order('id');
        setPassageQuestions(data || []);
    };

    const fetchSections = async (examId: number) => {
        setLoading(true);
        const { data } = await supabase.from('exam_sections').select('*').eq('exam_id', examId).order('order_index');
        setSections(data || []);
        setLoading(false);
    };

    const fetchQuestions = async (sectionId: number) => {
        setLoading(true);
        const { data } = await supabase.from('exam_questions').select('*').eq('section_id', sectionId).order('id');
        setQuestions(data || []);
        setLoading(false);
    };

    const fetchResults = async (examId: number) => {
        setLoading(true);
        try {
            const { data: attempts } = await supabase
                .from('exam_attempts')
                .select('*')
                .eq('exam_id', examId)
                .order('created_at', { ascending: false });

            if (attempts && attempts.length > 0) {
                const studentIds = [...new Set(attempts.map(a => a.student_id))];
                const { data: students } = await supabase.from('users').select('id, full_name, email').in('id', studentIds);

                const combined = attempts.map(a => {
                    const st = students?.find(s => s.id === a.student_id);
                    return { ...a, student_name: st?.full_name || 'Unknown', student_email: st?.email };
                });
                setExamResults(combined);
            } else {
                setExamResults([]);
            }
        } catch (e: any) {
            toast.error("Failed to load results");
        } finally {
            setLoading(false);
        }
    };

    // --- Exam Handlers ---
    const handleSaveExam = async () => {
        setIsSaving(true);
        try {
            // Permission Check
            if (activeExam && userRole !== 'super_admin') {
                if (activeExam.institution_id && (!activeExam.institution_id || activeExam.institution_id !== user?.institution_id)) {
                    toast.error("You cannot edit this exam (Owned by another context)");
                    setIsSaving(false);
                    return;
                }
                if (!activeExam.institution_id && userRole === 'institution_admin') {
                    // Global exam edits prevented for inst admin
                    toast.error("You cannot edit Global Exams");
                    setIsSaving(false);
                    return;
                }
            }

            const payload: any = { ...examForm, university_id: uniId, created_by: user?.id };
            if (userRole === 'institution_admin' && user?.institution_id) {
                payload.institution_id = user.institution_id;
            } else if (userRole === 'super_admin') {
                payload.institution_id = null;
            }

            if (activeExam) {
                const { error } = await supabase.from('university_exams').update(payload).eq('id', activeExam.id);
                if (error) throw error;
                toast.success('Exam updated');
            } else {
                const { error } = await supabase.from('university_exams').insert([payload]);
                if (error) throw error;
                toast.success('Exam created');
            }
            setIsExamModalOpen(false);
            fetchInitialData();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    // --- Section Handlers ---
    const handleSaveSection = async () => {
        if (!activeExam) return;
        if (userRole !== 'super_admin' && (!activeExam.institution_id || activeExam.institution_id !== user?.institution_id)) {
            toast.error('You do not have permission to modify this exam.');
            return;
        }
        setIsSaving(true);
        try {
            const payload = { ...sectionForm, exam_id: activeExam.id };
            if (activeSection) {
                const { error } = await supabase.from('exam_sections').update(payload).eq('id', activeSection.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('exam_sections').insert([payload]);
                if (error) throw error;
            }
            setIsSectionModalOpen(false);
            fetchSections(activeExam.id);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    // --- Question Handlers ---
    const handleSaveQuestion = async () => {
        if (!activeSection) return;
        if (userRole !== 'super_admin' && (!activeExam?.institution_id || activeExam?.institution_id !== user?.institution_id)) {
            toast.error('You do not have permission to modify this exam.');
            return;
        }
        setIsSaving(true);
        try {
            const payload = {
                ...questionForm,
                section_id: activeSection.id,
                passage_id: questionForm.passage_id === '' ? null : Number(questionForm.passage_id)
            };

            if (questionForm.id) {
                const { error } = await supabase
                    .from('exam_questions')
                    .update(payload)
                    .eq('id', questionForm.id);
                if (error) throw error;
                toast.success('Question updated');
            } else {
                const { error } = await supabase
                    .from('exam_questions')
                    .insert([payload]);
                if (error) throw error;
                toast.success('Question added');
            }
            setIsQuestionModalOpen(false);

            // If we are currently in the passage case builder, refresh its question list
            if (activePassage) {
                fetchPassageQuestions(activePassage.id);
            }

            setQuestionForm({
                question_text: '',
                image_url: '',
                question_type: 'mcq_single',
                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                correct_answer: '',
                marks: 1,
                explanation: '',
                passage_id: ''
            });
            if (activeSection) fetchQuestions(activeSection.id);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteExam = async (exam: Exam) => {
        if (userRole !== 'super_admin') {
            if (!exam.institution_id) {
                toast.error("Cannot delete Global Exams");
                return;
            }
            if (exam.institution_id !== user?.institution_id) {
                toast.error("Unauthorized to delete this exam");
                return;
            }
        }
        if (!confirm('Permanent delete? Questions and sections will also be removed.')) return;
        const { error } = await supabase.from('university_exams').delete().eq('id', exam.id);
        if (error) toast.error(error.message);
        else {
            toast.success('Exam deleted');
            fetchInitialData();
        }
    };

    const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0] || !activeSection) return;
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data: any[] = XLSX.utils.sheet_to_json(ws);

            const questions_to_insert = data.map(row => ({
                section_id: activeSection.id,
                question_text: row.question_text || row.Question || '',
                options: [row.option1, row.option2, row.option3, row.option4].filter(Boolean),
                correct_answer: row.correct_option?.toString() || row.Answer?.toString() || '1',
                marks: row.marks || 1,
                question_type: 'mcq_single'
            }));

            const { error } = await supabase.from('exam_questions').insert(questions_to_insert);
            if (error) toast.error(error.message);
            else {
                toast.success(`Uploaded ${questions_to_insert.length} questions`);
                fetchQuestions(activeSection.id);
                setIsBulkModalOpen(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `question-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('exam_images').upload(fileName, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('exam_images').getPublicUrl(fileName);
            setQuestionForm({ ...questionForm, image_url: publicUrl });
            toast.success('Image uploaded');
        } catch (error: any) {
            toast.error('Upload failed: ' + error.message);
        } finally {
            setImageUploading(false);
        }
    };

    const handleBack = () => {
        if (view === 'questions') {
            setView('sections');
            return;
        }
        if (view === 'sections') {
            setView('exams');
            setActiveExam(null);
            return;
        }
        if (view === 'results' as any) {
            setView('exams');
            setActiveExam(null);
            return;
        }
        onBack();
    };

    const filteredExams = exams.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Render Helpers
    const renderHeader = () => (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div className="flex items-center gap-5">
                <button
                    onClick={handleBack}
                    className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all hover:bg-slate-50 shadow-sm group"
                >
                    <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-3">
                        {view === 'exams' && (
                            <>
                                <Target className="w-8 h-8 text-emerald-600" />
                                Assessment Hub
                            </>
                        )}
                        {view === 'sections' && (
                            <>
                                <Layers className="w-8 h-8 text-emerald-600" />
                                {activeExam?.name} Structure
                            </>
                        )}
                        {view === 'questions' && (
                            <>
                                <HelpCircle className="w-8 h-8 text-emerald-600" />
                                {activeSection?.name} Questions
                            </>
                        )}
                        {view === 'results' as any && (
                            <>
                                <BarChart3 className="w-8 h-8 text-emerald-600" />
                                Exam Results
                            </>
                        )}
                    </h1>
                    <p className="text-slate-500 font-medium mt-2">
                        {view === 'exams' && `Managing tests for ${university?.name || 'Academic Institution'}`}
                        {view === 'sections' && 'Define assessment sections and weightage'}
                        {view === 'questions' && `Manage active question pool (${questions.length} items)`}
                        {view === 'results' as any && 'Student Performance Analysis'}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {view === 'exams' && (
                    <button
                        onClick={() => {
                            setActiveExam(null);
                            setExamForm({
                                name: '', exam_type: 'mock', total_duration: 120,
                                allow_continue_after_time_up: false, allow_reattempt: true,
                                auto_submit: true, result_release_setting: 'instant',
                                is_active: true, negative_marking: 0,
                                start_time: '', end_time: ''
                            });
                            setIsExamModalOpen(true);
                        }}
                        className="px-8 py-3.5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-900 transition-all shadow-xl shadow-emerald-100 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Create Exam
                    </button>
                )}
                {(view === 'sections' && (userRole === 'super_admin' || (activeExam?.institution_id && activeExam.institution_id === user?.institution_id))) && (
                    <button
                        onClick={() => {
                            setActiveSection(null);
                            setSectionForm({ name: '', num_questions: 10, weightage: 10, order_index: sections.length });
                            setIsSectionModalOpen(true);
                        }}
                        className="px-8 py-3.5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-900 transition-all shadow-xl shadow-emerald-100 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Add Section
                    </button>
                )}
                {(view === 'questions' && (userRole === 'super_admin' || (activeExam?.institution_id && activeExam.institution_id === user?.institution_id))) && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsBulkModalOpen(true)}
                            className="px-6 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all flex items-center gap-2"
                        >
                            <Upload className="w-4 h-4" /> Bulk Upload
                        </button>
                        <button
                            onClick={() => {
                                setQuestionForm({
                                    question_text: '', question_type: 'mcq_single',
                                    options: ['', '', '', ''], correct_answer: 0,
                                    marks: 1, explanation: ''
                                });
                                setIsQuestionModalOpen(true);
                            }}
                            className="px-8 py-3.5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-900 transition-all shadow-xl shadow-emerald-100 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> New Question
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto py-4">
            {renderHeader()}

            {loading ? (
                <div className="py-32 flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Syncing with system...</p>
                </div>
            ) : (
                <>
                    {/* EXAMS VIEW */}
                    {view === 'exams' && (
                        <div className="space-y-10">
                            {/* Institution Tests Section (only for institution admins) */}
                            {userRole === 'institution_admin' && filteredExams.filter(e => e.institution_id !== null).length > 0 && (
                                <div>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center">
                                            <Users className="w-5 h-5 text-emerald-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900">Your Institution Tests</h3>
                                            <p className="text-xs text-slate-500 font-medium">Tests created by your institution</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {filteredExams.filter(e => e.institution_id !== null).map(exam => (
                                            <div
                                                key={exam.id}
                                                className="group relative bg-gradient-to-br from-emerald-600 to-green-600 p-10 rounded-xl shadow-2xl hover:shadow-amber-500/20 transition-all duration-500 overflow-hidden flex flex-col min-h-[400px]"
                                            >
                                                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                                                <div className="absolute top-4 left-4 z-20">
                                                    <span className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-[10px] font-black text-white uppercase tracking-widest">Institution</span>
                                                </div>

                                                <div className="relative z-10 mb-8 mt-8">
                                                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-10 ring-1 ring-white/30">
                                                        <FileText className="w-7 h-7 text-white" />
                                                    </div>
                                                    <h3 className="text-3xl font-black text-white tracking-tight leading-tight">{exam.name}</h3>
                                                    <div className="flex flex-wrap gap-3 mt-6">
                                                        <span className="flex items-center gap-1.5 px-4 py-2 bg-white/10 text-white/80 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10">
                                                            <Clock className="w-3.5 h-3.5" /> {exam.total_duration}M
                                                        </span>
                                                        <span className="flex items-center gap-1.5 px-4 py-2 bg-white/10 text-white/80 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10">
                                                            <Target className="w-3.5 h-3.5" /> {exam.exam_type}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="absolute top-4 right-4 z-20 flex gap-2">
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteExam(exam); }} className="p-2 bg-white/20 text-white rounded-lg hover:bg-white hover:text-emerald-600 transition-all">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); setActiveExam(exam); setExamForm({ ...exam, start_time: exam.start_time ? new Date(exam.start_time).toISOString().slice(0, 16) : '', end_time: exam.end_time ? new Date(exam.end_time).toISOString().slice(0, 16) : '' }); setIsExamModalOpen(true); }} className="p-2 bg-white/20 text-white rounded-lg hover:bg-white hover:text-emerald-600 transition-all">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <div className="mt-auto relative z-10 flex gap-4">
                                                    <button onClick={() => { setActiveExam(exam); setView('sections'); fetchSections(exam.id); }} className="flex-1 py-5 bg-white text-emerald-600 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:bg-emerald-50 transition-all shadow-xl active:scale-95">
                                                        Configure <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => { setActiveExam(exam); fetchResults(exam.id); setView('results' as any); }} className="px-6 py-5 bg-white/20 text-white rounded-[1.5rem] font-black uppercase transition-all hover:bg-white hover:text-emerald-600 shadow-lg">
                                                        <BarChart3 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Global/University Tests Section */}
                            <div>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900">{userRole === 'super_admin' ? 'Global Tests' : 'University Official Tests'}</h3>
                                        <p className="text-xs text-slate-500 font-medium">{userRole === 'super_admin' ? 'Standard tests visible to all institutions' : 'Official assessments from university'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {filteredExams.filter(e => e.institution_id === null).map(exam => (
                                        <div
                                            key={exam.id}
                                            className="group relative bg-emerald-900 p-10 rounded-xl border border-slate-800 shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 overflow-hidden flex flex-col min-h-[400px]"
                                        >
                                            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
                                            <div className="absolute top-4 left-4 z-20">
                                                <span className="px-3 py-1.5 bg-emerald-500/20 backdrop-blur-sm rounded-lg text-[10px] font-black text-emerald-400 uppercase tracking-widest">Global</span>
                                            </div>

                                            <div className="relative z-10 mb-8 mt-8">
                                                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-10 ring-1 ring-white/20">
                                                    <FileText className="w-7 h-7 text-emerald-400" />
                                                </div>
                                                <h3 className="text-3xl font-black text-white tracking-tight leading-tight group-hover:text-emerald-400 transition-colors">{exam.name}</h3>
                                                <div className="flex flex-wrap gap-3 mt-6">
                                                    <span className="flex items-center gap-1.5 px-4 py-2 bg-white/5 text-white/60 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5">
                                                        <Clock className="w-3.5 h-3.5" /> {exam.total_duration}M
                                                    </span>
                                                    <span className="flex items-center gap-1.5 px-4 py-2 bg-white/5 text-white/60 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5">
                                                        <Target className="w-3.5 h-3.5" /> {exam.exam_type}
                                                    </span>
                                                </div>
                                            </div>
                                            {userRole === 'super_admin' && (
                                                <div className="absolute top-4 right-4 z-20 flex gap-2">
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteExam(exam); }} className="p-2 bg-rose-500/20 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); setActiveExam(exam); setExamForm({ ...exam, start_time: exam.start_time ? new Date(exam.start_time).toISOString().slice(0, 16) : '', end_time: exam.end_time ? new Date(exam.end_time).toISOString().slice(0, 16) : '' }); setIsExamModalOpen(true); }} className="p-2 bg-emerald-500/20 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}

                                            <div className="mt-auto relative z-10 flex gap-4">
                                                <button onClick={() => { setActiveExam(exam); setView('sections'); fetchSections(exam.id); }} className="flex-1 py-5 bg-emerald-600 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 group/btn hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/20 active:scale-95">
                                                    {userRole === 'super_admin' ? 'Configure' : 'View'} <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                                </button>
                                                <button onClick={() => { setActiveExam(exam); fetchResults(exam.id); setView('results' as any); }} className="px-6 py-5 bg-slate-800 text-white rounded-[1.5rem] font-black uppercase transition-all hover:bg-slate-700 shadow-lg">
                                                    <BarChart3 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {filteredExams.filter(e => e.institution_id === null).length === 0 && (
                                        <div className="col-span-full py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 text-center">
                                            <BookOpen className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                                            <h3 className="text-xl font-black text-slate-900">No Global Tests Available</h3>
                                            <p className="text-slate-500 font-medium">{userRole === 'super_admin' ? 'Create your first global examination.' : 'University has not created any official tests yet.'}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTIONS VIEW */}
                    {view === 'sections' && (
                        <div className="space-y-6">
                            <div className="bg-emerald-600 text-white p-10 rounded-xl shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />
                                <div className="relative z-10 text-center md:text-left">
                                    <div className="flex items-center gap-3 mb-4 opacity-70">
                                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                                            <Layout className="w-4 h-4 text-white" />
                                        </div>
                                        <p className="text-white text-[10px] font-black uppercase tracking-[0.3em]">Examination Blueprint</p>
                                    </div>
                                    <h2 className="text-5xl font-black tracking-tighter text-white mb-6 leading-none">{activeExam?.name}</h2>
                                    <div className="flex flex-wrap items-center gap-6 text-white/90 font-bold text-sm">
                                        <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl border border-white/10">
                                            <Layers className="w-4 h-4" /> {sections.length} Sections
                                        </div>
                                        <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl border border-white/10">
                                            <Clock className="w-4 h-4" /> {activeExam?.total_duration} Minutes
                                        </div>
                                        <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl border border-white/10 capitalize">
                                            <Target className="w-4 h-4" /> {activeExam?.exam_type} Mode
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setActiveExam(null); setView('exams'); }}
                                    className="relative z-10 px-10 py-5 bg-white text-emerald-600 hover:bg-emerald-50 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-emerald-900/20 flex items-center gap-2 group/back"
                                >
                                    <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" />
                                    Return to Hub
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                                {sections.map((section, idx) => (
                                    <div
                                        key={section.id}
                                        className="bg-white p-8 rounded-xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 bg-emerald-900 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900">{section.name}</h3>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                                    {section.num_questions} Questions • Weightage: {section.weightage}%
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {(userRole === 'super_admin' || (activeExam?.institution_id && activeExam.institution_id === user?.institution_id)) && (
                                                <>
                                                    <button
                                                        onClick={() => { setActiveSection(section); setSectionForm(section); setIsSectionModalOpen(true); }}
                                                        className="p-3 bg-emerald-50/50 text-slate-400 hover:text-emerald-600 rounded-xl transition-all"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => { setActiveSection(section); fetchQuestions(section.id); setView('questions'); }}
                                                        className="px-6 py-3 bg-emerald-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-600 transition-all flex items-center gap-2"
                                                    >
                                                        Manage Questions <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                            {/* Read-only View Questions button for non-owners */}
                                            {!(userRole === 'super_admin' || (activeExam?.institution_id && activeExam.institution_id === user?.institution_id)) && (
                                                <button
                                                    onClick={() => { setActiveSection(section); fetchQuestions(section.id); setView('questions'); }}
                                                    className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all flex items-center gap-2"
                                                >
                                                    View Questions <Eye className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* QUESTIONS VIEW */}
                    {view === 'questions' && (
                        <div className="space-y-8">

                            <div className="grid grid-cols-1 gap-4">
                                {questions.map((q, idx) => (
                                    <div key={q.id} className="bg-white p-8 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start gap-8">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest">Q{idx + 1}</span>
                                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{q.question_type}</span>
                                                    <span className="px-3 py-1 bg-emerald-100/50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{q.marks} Marks</span>
                                                    {q.passage_id && (
                                                        <button
                                                            onClick={() => {
                                                                const p = passages.find(p => p.id === q.passage_id);
                                                                if (p) {
                                                                    setPassageForm({ title: p.title, content: p.content });
                                                                    setActivePassage(p);
                                                                    fetchPassageQuestions(p.id);
                                                                    setIsPassageModalOpen(true);
                                                                }
                                                            }}
                                                            className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-amber-100 transition-all"
                                                        >
                                                            <BookOpen className="w-3 h-3" /> Associated Case
                                                        </button>
                                                    )}
                                                </div>
                                                {q.image_url && (
                                                    <div className="mb-6 rounded-2xl overflow-hidden border border-slate-100 max-w-lg">
                                                        <img src={q.image_url} alt="Question" className="w-full h-auto" />
                                                    </div>
                                                )}
                                                <h4 className="text-lg font-bold text-slate-800 leading-relaxed mb-6">
                                                    {typeof q.question_text === 'string' ? q.question_text : (q.question_text as any)?.text || JSON.stringify(q.question_text)}
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {q.question_type.startsWith('mcq') && Array.isArray(q.options) && q.options.map((opt, oidx) => (
                                                        <div
                                                            key={oidx}
                                                            className={`p-4 rounded-xl text-sm font-semibold transition-all border ${String(q.correct_answer).includes(String(oidx + 1)) ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-inner' : 'bg-slate-50 border-slate-100 text-slate-500'}`}
                                                        >
                                                            <span className="opacity-50 mr-3">{String.fromCharCode(65 + oidx)}.</span>
                                                            {typeof opt === 'string' ? opt : (opt as any)?.text || JSON.stringify(opt)}
                                                        </div>
                                                    ))}
                                                    {q.question_type === 'true_false' && (
                                                        <div className="flex gap-4">
                                                            <div className={`px-6 py-3 rounded-xl font-bold border ${q.correct_answer === 'true' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>TRUE</div>
                                                            <div className={`px-6 py-3 rounded-xl font-bold border ${q.correct_answer === 'false' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>FALSE</div>
                                                        </div>
                                                    )}
                                                    {q.question_type === 'numerical' && (
                                                        <div className="px-6 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-bold">
                                                            Correct Answer: {q.correct_answer}
                                                        </div>
                                                    )}
                                                    {(q.question_type === 'essay' || q.question_type === 'short_answer') && (
                                                        <div className="col-span-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 italic">
                                                            Manual Grading Required (Guidelines: {q.correct_answer || 'N/A'})
                                                        </div>
                                                    )}
                                                    {q.question_type === 'fill_blank' && (
                                                        <div className="col-span-full px-6 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-bold">
                                                            Answer: {q.correct_answer}
                                                        </div>
                                                    )}
                                                    {q.question_type === 'ordering' && (
                                                        <div className="col-span-full space-y-2">
                                                            <p className="text-xs font-bold text-slate-400 uppercase">Correct Sequence:</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {Array.isArray(q.correct_answer) ? q.correct_answer.map((item: any, i: number) => (
                                                                    <span key={i} className="px-3 py-1 bg-slate-100 rounded border border-slate-200 text-sm">
                                                                        {i + 1}. {typeof item === 'string' ? item : JSON.stringify(item)}
                                                                    </span>
                                                                )) : <span className="text-slate-500">{String(q.correct_answer)}</span>}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {(q.question_type === 'hotspot' || q.question_type === 'case_study' || q.question_type === 'matching') && (
                                                        <div className="col-span-full p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-bold flex items-center gap-2">
                                                            <AlertCircle className="w-4 h-4" />
                                                            Advanced Type - Preview in Student Mode
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {(userRole === 'super_admin' || (activeExam?.institution_id && activeExam.institution_id === user?.institution_id)) && (
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm('Delete question?')) return;
                                                        await supabase.from('exam_questions').delete().eq('id', q.id);
                                                        fetchQuestions(activeSection!.id);
                                                    }}
                                                    className="p-3 bg-rose-50 text-rose-400 hover:text-rose-600 rounded-xl transition-all"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {view === 'results' as any && (
                        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                            <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                                <Users className="w-6 h-6 text-emerald-600" />
                                Student Attempts
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="pb-4 pl-4 font-black uppercase text-xs text-slate-400 tracking-widest">Student</th>
                                            <th className="pb-4 font-black uppercase text-xs text-slate-400 tracking-widest">Date</th>
                                            <th className="pb-4 font-black uppercase text-xs text-slate-400 tracking-widest">Score</th>
                                            <th className="pb-4 font-black uppercase text-xs text-slate-400 tracking-widest">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {examResults.map((res: any) => (
                                            <tr key={res.id} className="group hover:bg-slate-50 transition-colors">
                                                <td className="py-4 pl-4">
                                                    <div className="font-bold text-slate-900">{res.student_name}</div>
                                                    <div className="text-xs text-slate-400 font-medium">{res.student_email}</div>
                                                </td>
                                                <td className="py-4 font-medium text-slate-600 text-sm">
                                                    {new Date(res.created_at).toLocaleDateString()} <span className="text-xs text-slate-400">{new Date(res.created_at).toLocaleTimeString()}</span>
                                                </td>
                                                <td className="py-4 font-black text-emerald-600 text-lg">
                                                    {res.score} <span className="text-xs text-slate-400 font-medium">/ {res.total_marks}</span>
                                                </td>
                                                <td className="py-4">
                                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${res.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                        {res.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {examResults.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="py-12 text-center text-slate-400 font-medium italic">
                                                    No attempts recorded yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}


                    {/* MODALS */}
                    {isExamModalOpen && (
                        <div className="fixed inset-0 bg-emerald-900/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
                            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900">{activeExam ? 'Edit Assessment' : 'New Assessment'}</h2>
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Configure Exam Properties</p>
                                    </div>
                                    <button onClick={() => setIsExamModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm">
                                        <X className="w-6 h-6 text-slate-400" />
                                    </button>
                                </div>
                                <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Assessment Name</label>
                                        <input
                                            value={examForm.name}
                                            onChange={e => setExamForm({ ...examForm, name: e.target.value })}
                                            className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-700 focus:ring-2 focus:ring-teal-500/20 transition-all"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Exam Category</label>
                                            <div className="relative group">
                                                <Layout className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 z-10" />
                                                <select
                                                    value={examForm.exam_type}
                                                    onChange={e => setExamForm({ ...examForm, exam_type: e.target.value })}
                                                    className="w-full pl-12 pr-10 py-4 bg-slate-50 rounded-2xl font-bold border-none appearance-none cursor-pointer text-slate-700 focus:ring-2 focus:ring-teal-500/10 transition-all"
                                                >
                                                    <option value="mock">Mock Assessment</option>
                                                    <option value="module">Module Exam</option>
                                                    <option value="final">Final Entrance</option>
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-emerald-600 transition-colors">
                                                    <ChevronRight className="w-4 h-4 rotate-90" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Duration (Mins)</label>
                                            <input
                                                type="number"
                                                value={examForm.total_duration}
                                                onChange={e => setExamForm({ ...examForm, total_duration: parseInt(e.target.value) })}
                                                className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold text-slate-700"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Start Time (Live)</label>
                                            <input
                                                type="datetime-local"
                                                value={examForm.start_time}
                                                onChange={e => setExamForm({ ...examForm, start_time: e.target.value })}
                                                className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold text-slate-700"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">End Time (Expiry)</label>
                                            <input
                                                type="datetime-local"
                                                value={examForm.end_time}
                                                onChange={e => setExamForm({ ...examForm, end_time: e.target.value })}
                                                className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold text-slate-700"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="flex items-center gap-3 p-5 bg-slate-50 rounded-2xl cursor-pointer">
                                            <input type="checkbox" checked={examForm.allow_reattempt} onChange={e => setExamForm({ ...examForm, allow_reattempt: e.target.checked })} className="w-5 h-5" />
                                            <span className="font-bold text-sm">Allow Reattempts</span>
                                        </label>
                                        <label className="flex items-center gap-3 p-5 bg-slate-50 rounded-2xl cursor-pointer">
                                            <input type="checkbox" checked={examForm.auto_submit} onChange={e => setExamForm({ ...examForm, auto_submit: e.target.checked })} className="w-5 h-5" />
                                            <span className="font-bold text-sm">Strict Timer</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="p-8 bg-slate-50/50 flex gap-4">
                                    <button onClick={handleSaveExam} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-600/20">
                                        {isSaving ? 'Finalizing...' : 'Commit Assessment'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {isSectionModalOpen && (
                        <div className="fixed inset-0 bg-emerald-900/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
                            <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl">
                                <div className="p-8 border-b border-slate-50">
                                    <h2 className="text-2xl font-black text-slate-900">{activeSection ? 'Edit Section' : 'New Section'}</h2>
                                </div>
                                <div className="p-8 space-y-4">
                                    <input value={sectionForm.name} onChange={e => setSectionForm({ ...sectionForm, name: e.target.value })} placeholder="Section Name (e.g. Physics)" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="number" value={sectionForm.num_questions} onChange={e => setSectionForm({ ...sectionForm, num_questions: parseInt(e.target.value) })} placeholder="Questions" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" />
                                        <input type="number" value={sectionForm.weightage} onChange={e => setSectionForm({ ...sectionForm, weightage: parseInt(e.target.value) })} placeholder="Weightage %" className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold" />
                                    </div>
                                    <button onClick={handleSaveSection} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-600/20">
                                        Save Section
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {isQuestionModalOpen && (
                        <div className="fixed inset-0 bg-emerald-900/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
                            <div className="bg-white rounded-[2.5rem] w-full max-w-4xl overflow-hidden shadow-2xl">
                                <div className="p-8 bg-slate-50/50 border-b flex justify-between">
                                    <h2 className="text-2xl font-black text-slate-900">
                                        {questionForm.question_type === 'passage' ? 'Passage Block Configuration' : 'Add Question'}
                                    </h2>
                                    <button onClick={() => setIsQuestionModalOpen(false)}><X /></button>
                                </div>
                                <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto">
                                    {questionForm.question_type === 'passage' ? (
                                        <div className="col-span-2 py-12 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-500">
                                            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[2.5rem] flex items-center justify-center shadow-inner ring-4 ring-teal-50">
                                                <BookOpen className="w-12 h-12" />
                                            </div>
                                            <div className="max-w-md">
                                                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Integrated Case Builder</h3>
                                                <p className="text-slate-500 font-medium mt-3 leading-relaxed">
                                                    Passage-based blocks allow you to define a narrative and multiple related questions on a single page.
                                                    This provides a cohesive experience for students during case analysis.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setIsQuestionModalOpen(false);
                                                    setPassageForm({ title: '', content: '' });
                                                    setActivePassage(null);
                                                    setPassageQuestions([]);
                                                    setIsPassageModalOpen(true);
                                                }}
                                                className="px-10 py-5 bg-emerald-900 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] hover:bg-emerald-600 transition-all shadow-2xl shadow-emerald-900/40 active:scale-95 ring-4 ring-slate-100"
                                            >
                                                Launch Comprehensive Builder
                                            </button>
                                        </div>
                                    ) : (
                                        <React.Fragment>
                                            <div className="space-y-8">
                                                <div className="space-y-4">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Question Blueprint Type</label>
                                                    <div className="relative group">
                                                        <Settings className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 z-10" />
                                                        <select
                                                            value={questionForm.question_type}
                                                            onChange={e => setQuestionForm({ ...questionForm, question_type: e.target.value })}
                                                            className="w-full pl-12 pr-10 py-4 bg-slate-50 rounded-2xl font-bold border-none appearance-none cursor-pointer text-slate-700 focus:ring-2 focus:ring-teal-500/10 transition-all"
                                                        >
                                                            <option value="mcq_single">MCQ Single Choice</option>
                                                            <option value="mcq_multiple">MCQ Multiple Choice</option>
                                                            <option value="true_false">True / False</option>
                                                            <option value="numerical">Numerical Entry</option>
                                                            <option value="essay">Essay / Free Text</option>
                                                            <option value="short_answer">Short Answer</option>
                                                            <option value="fill_blank">Fill in the Blanks</option>
                                                            <option value="matching">Match the Following</option>
                                                            <option value="ordering">Sequence / Ordering</option>
                                                            <option value="hotspot">Image Hotspot</option>
                                                            <option value="case_study">Case Study Analysis</option>
                                                            <option value="passage">Passage-Based Block</option>
                                                        </select>
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-emerald-600 transition-colors">
                                                            <ChevronRight className="w-4 h-4 rotate-90" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marks Allotted</label>
                                                        <div className="relative">
                                                            <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                                                            <input
                                                                type="number"
                                                                value={questionForm.marks}
                                                                onChange={e => setQuestionForm({ ...questionForm, marks: parseFloat(e.target.value) })}
                                                                className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl font-bold border-none focus:ring-2 focus:ring-teal-500/10"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Case Relationship</label>
                                                        <div className="relative group">
                                                            <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 z-10" />
                                                            <select
                                                                value={questionForm.passage_id}
                                                                onChange={e => setQuestionForm({ ...questionForm, passage_id: e.target.value })}
                                                                className="w-full pl-12 pr-10 py-4 bg-slate-50 rounded-2xl font-bold border-none appearance-none cursor-pointer text-slate-700 text-xs truncate focus:ring-2 focus:ring-teal-500/10"
                                                            >
                                                                <option value="">Detached Item</option>
                                                                {passages.map(p => (
                                                                    <option key={p.id} value={p.id}>{p.title || `Case #${p.id}`}</option>
                                                                ))}
                                                            </select>
                                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-emerald-600 transition-colors">
                                                                <ChevronRight className="w-4 h-4 rotate-90" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Visual Reference</label>
                                                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                                        <div className="flex-1">
                                                            {questionForm.image_url ? (
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-12 h-12 bg-white rounded-lg border overflow-hidden">
                                                                        <img src={questionForm.image_url} className="w-full h-full object-cover" />
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-slate-500 truncate max-w-[150px]">Image attached</span>
                                                                    <button onClick={() => setQuestionForm({ ...questionForm, image_url: '' })} className="text-rose-500 font-black text-[10px] uppercase">Remove</button>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] font-black text-slate-400 uppercase">No visual attached</span>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => document.getElementById('q-image-upload')?.click()}
                                                            disabled={imageUploading}
                                                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-900 hover:text-white transition-all"
                                                        >
                                                            {imageUploading ? '...' : 'Upload Image'}
                                                        </button>
                                                        <input id="q-image-upload" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Question Content</label>
                                                    <textarea
                                                        value={questionForm.question_text}
                                                        onChange={e => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                                                        placeholder="Enter your question here..."
                                                        className="w-full h-40 px-6 py-4 bg-slate-50 rounded-2xl font-bold resize-none"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                {(questionForm.question_type === 'mcq_single' || questionForm.question_type === 'mcq_multiple') && (
                                                    <div className="space-y-4">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Options & Keys</label>
                                                        {questionForm.options.map((opt: string, idx: number) => (
                                                            <div key={idx} className="flex gap-4">
                                                                <button
                                                                    onClick={() => {
                                                                        if (questionForm.question_type === 'mcq_single') {
                                                                            setQuestionForm({ ...questionForm, correct_answer: (idx + 1).toString() });
                                                                        } else {
                                                                            const current = String(questionForm.correct_answer).split(',').filter(Boolean);
                                                                            const val = (idx + 1).toString();
                                                                            const next = current.includes(val) ? current.filter(v => v !== val) : [...current, val];
                                                                            setQuestionForm({ ...questionForm, correct_answer: next.join(',') });
                                                                        }
                                                                    }}
                                                                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-black transition-all ${String(questionForm.correct_answer).split(',').includes((idx + 1).toString()) ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
                                                                >
                                                                    {String.fromCharCode(65 + idx)}
                                                                </button>
                                                                <input
                                                                    value={opt}
                                                                    onChange={e => {
                                                                        const opts = [...questionForm.options];
                                                                        opts[idx] = e.target.value;
                                                                        setQuestionForm({ ...questionForm, options: opts });
                                                                    }}
                                                                    className="flex-1 px-4 bg-slate-50 rounded-xl font-bold"
                                                                    placeholder={`Option ${idx + 1}`}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {questionForm.question_type === 'true_false' && (
                                                    <div className="space-y-4">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Final Verdict</label>
                                                        <div className="flex gap-4">
                                                            <button
                                                                onClick={() => setQuestionForm({ ...questionForm, correct_answer: 'true' })}
                                                                className={`flex-1 py-6 rounded-2xl font-black transition-all ${questionForm.correct_answer === 'true' ? 'bg-emerald-600 text-white shadow-xl' : 'bg-slate-50 text-slate-400'}`}
                                                            >
                                                                TRUE
                                                            </button>
                                                            <button
                                                                onClick={() => setQuestionForm({ ...questionForm, correct_answer: 'false' })}
                                                                className={`flex-1 py-6 rounded-2xl font-black transition-all ${questionForm.correct_answer === 'false' ? 'bg-rose-600 text-white shadow-xl' : 'bg-slate-50 text-slate-400'}`}
                                                            >
                                                                FALSE
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {questionForm.question_type === 'numerical' && (
                                                    <div className="space-y-4">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Answer</label>
                                                        <input
                                                            type="text"
                                                            value={questionForm.correct_answer}
                                                            onChange={e => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                                                            placeholder="Enter exact numerical answer"
                                                            className="w-full px-6 py-6 bg-slate-50 rounded-2xl font-black text-2xl"
                                                        />
                                                    </div>
                                                )}

                                                {(questionForm.question_type === 'essay' || questionForm.question_type === 'short_answer') && (
                                                    <div className="space-y-4">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Answer Guidelines</label>
                                                        <textarea
                                                            value={questionForm.correct_answer}
                                                            onChange={e => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                                                            placeholder="Enter keywords or model answer..."
                                                            className="w-full h-32 px-6 py-4 bg-slate-50 rounded-2xl font-bold resize-none"
                                                        />
                                                    </div>
                                                )}

                                                {questionForm.question_type === 'fill_blank' && (
                                                    <div className="space-y-4">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Missing Words (Comma separated)</label>
                                                        <input
                                                            type="text"
                                                            value={questionForm.correct_answer}
                                                            onChange={e => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                                                            placeholder="e.g. oxygen, nitrogen"
                                                            className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold"
                                                        />
                                                    </div>
                                                )}

                                                {questionForm.question_type === 'ordering' && (
                                                    <div className="space-y-4">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correct Sequence (Comma separated)</label>
                                                        <input
                                                            type="text"
                                                            value={questionForm.correct_answer}
                                                            onChange={e => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                                                            placeholder="e.g. 3, 1, 4, 2"
                                                            className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold"
                                                        />
                                                    </div>
                                                )}

                                                {questionForm.question_type === 'hotspot' && (
                                                    <div className="space-y-4">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hotspot Coordinates (x,y,radius)</label>
                                                        <input
                                                            type="text"
                                                            value={questionForm.correct_answer}
                                                            onChange={e => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                                                            placeholder="e.g. 150,200,30"
                                                            className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-bold"
                                                        />
                                                    </div>
                                                )}

                                                {questionForm.question_type === 'case_study' && (
                                                    <div className="space-y-4">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Case Evidence / Detailed Scenario</label>
                                                        <textarea
                                                            value={questionForm.correct_answer}
                                                            onChange={e => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                                                            placeholder="Describe the case scenario in detail..."
                                                            className="w-full h-48 px-6 py-4 bg-slate-50 rounded-2xl font-bold resize-none"
                                                        />
                                                    </div>
                                                )}

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Explanation (Optional)</label>
                                                    <textarea
                                                        value={questionForm.explanation}
                                                        onChange={e => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                                                        placeholder="Explain the solution..."
                                                        className="w-full h-32 px-6 py-4 bg-slate-50 rounded-2xl font-bold resize-none"
                                                    />
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    )}
                                </div>
                                {questionForm.question_type !== 'passage' && (
                                    <div className="p-8 bg-slate-50/50">
                                        <button onClick={handleSaveQuestion} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-600/20">Save Question to Pool</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {isPassageModalOpen && (
                        <div className="fixed inset-0 bg-emerald-900/90 backdrop-blur-xl z-[120] flex items-center justify-center p-6">
                            <div className="bg-[#F8FAFC] rounded-[3rem] w-full max-w-6xl h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-white/20 animate-in fade-in zoom-in duration-300">
                                {/* Header */}
                                <div className="p-8 bg-white border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-white to-slate-50">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-600/20">
                                            <BookOpen className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-slate-900">Passage Case Builder</h2>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
                                                {activePassage ? 'Case #' + activePassage.id : 'Formulate New Case Scenario'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => {
                                                setIsPassageModalOpen(false);
                                                setActivePassage(null);
                                                setPassageQuestions([]);
                                                setPassageForm({ title: '', content: '' });
                                                if (activeSection) fetchQuestions(activeSection.id);
                                            }}
                                            className="p-4 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-2xl transition-all"
                                        >
                                            <X className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>

                                {/* Split Interface */}
                                <div className="flex-1 flex overflow-hidden">
                                    {/* Left: Passage Content */}
                                    <div className="w-1/2 p-8 border-r border-slate-100 overflow-y-auto space-y-8 bg-white">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Case Title</label>
                                            <input
                                                value={passageForm.title}
                                                onChange={e => setPassageForm({ ...passageForm, title: e.target.value })}
                                                placeholder="e.g., Clinical Scenario - Internal Medicine"
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold focus:ring-4 focus:ring-teal-600/5 transition-all outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Narrative Content</label>
                                            <textarea
                                                value={passageForm.content}
                                                onChange={e => setPassageForm({ ...passageForm, content: e.target.value })}
                                                placeholder="Enter the comprehensive passage details here..."
                                                className="w-full h-[400px] px-8 py-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] font-bold resize-none focus:ring-8 focus:ring-teal-600/5 transition-all outline-none leading-[1.8] text-slate-700 shadow-inner"
                                            />
                                        </div>
                                        <button
                                            onClick={handleSavePassage}
                                            disabled={isSaving}
                                            className="w-full py-5 bg-emerald-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-slate-900/20 hover:bg-emerald-600 transition-all active:scale-[0.98] ring-4 ring-slate-50"
                                        >
                                            {isSaving ? 'Processing...' : activePassage ? 'Sync Narrative Updates' : 'Initialize Passage Context'}
                                        </button>
                                    </div>

                                    {/* Right: Questions Pool */}
                                    <div className="w-1/2 p-8 overflow-y-auto bg-[#F8FAFC]">
                                        {activePassage ? (
                                            <div className="space-y-8">
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <h3 className="text-xl font-black text-slate-900">Case Questions</h3>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{passageQuestions.length} Items Attached</p>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setQuestionForm({
                                                                question_text: '',
                                                                image_url: '',
                                                                question_type: 'mcq_single',
                                                                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                                                                correct_answer: '',
                                                                marks: 1,
                                                                explanation: '',
                                                                passage_id: activePassage.id
                                                            });
                                                            setIsQuestionModalOpen(true);
                                                        }}
                                                        className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-600/20 hover:scale-[1.05] transition-all"
                                                    >
                                                        Add Item to Case
                                                    </button>
                                                </div>

                                                <div className="space-y-4">
                                                    {passageQuestions.map((pq, idx) => (
                                                        <div key={pq.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-black text-slate-400">
                                                                    P.{idx + 1}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-slate-800 line-clamp-1">{pq.question_text}</p>
                                                                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{pq.question_type} • {pq.marks} Marks</span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    setQuestionForm({ ...pq, passage_id: pq.passage_id || '' });
                                                                    setIsQuestionModalOpen(true);
                                                                }}
                                                                className="p-3 bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ))}

                                                    {passageQuestions.length === 0 && (
                                                        <div className="py-20 text-center bg-white/50 border-2 border-dashed border-slate-200 rounded-[2rem]">
                                                            <HelpCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No questions formulated for this passage</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-center px-12">
                                                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm mb-6">
                                                    <Zap className="w-10 h-10 text-slate-200" />
                                                </div>
                                                <h3 className="text-xl font-black text-slate-400">Narrative Setup Required</h3>
                                                <p className="text-slate-400 font-bold text-sm mt-4">Initialize the passage narrative on the left before adding associated exam questions.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {isBulkModalOpen && (
                        <div className="fixed inset-0 bg-emerald-900/40 backdrop-blur z-[160] flex items-center justify-center">
                            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
                                <div className="flex justify-between mb-8">
                                    <h3 className="text-xl font-black">Bulk Question Upload</h3>
                                    <button onClick={() => setIsBulkModalOpen(false)}><X /></button>
                                </div>
                                <div className="border-4 border-dashed border-slate-100 rounded-3xl p-10 text-center mb-8 bg-slate-50/50">
                                    <FileSpreadsheet className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                                    <p className="text-slate-500 font-bold text-sm mb-6">Select Excel (.xlsx) file with columns: question_text, option1, option2, option3, option4, correct_option</p>
                                    <input type="file" accept=".xlsx" onChange={handleBulkUpload} className="hidden" id="bulk-file" />
                                    <label htmlFor="bulk-file" className="block w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase cursor-pointer hover:bg-teal-700 transition-all">Choose Spreadsheet</label>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )
            }
        </div >
    );
}
