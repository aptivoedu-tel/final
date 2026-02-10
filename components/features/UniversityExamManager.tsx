'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
    Plus, Search, Trash2, Edit2, X, FileText, Save, ChevronLeft,
    Clock, AlertCircle, Layout, BookOpen, ChevronRight,
    Settings, Layers, HelpCircle, Upload, FileSpreadsheet, Image as ImageIcon,
    CheckCircle, List, ArrowLeft, BarChart3, Target, Zap, Users, Calendar, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { AuthService } from '@/lib/services/authService';
import * as XLSX from 'xlsx';
import { useLoading } from '@/lib/context/LoadingContext';

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
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
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
        setGlobalLoading(true, 'Accessing Examination Archives...');
        try {
            const { data: uni } = await supabase.from('universities').select('*').eq('id', uniId).single();
            setUniversity(uni);

            let query = supabase
                .from('university_exams')
                .select('*')
                .eq('university_id', uniId);

            if (userRole === 'super_admin') {
                query = query.is('institution_id', null);
            } else if (userRole === 'institution_admin' && currentUser?.institution_id) {
                query = query.or(`institution_id.is.null,institution_id.eq.${currentUser.institution_id}`);
            } else if (userRole === 'institution_admin') {
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
            setTimeout(() => setGlobalLoading(false), 800);
        }
    };

    const handleSavePassage = async () => {
        if (!passageForm.content) {
            toast.error("Passage content is required");
            return;
        }

        setGlobalLoading(true, 'Synchronizing Passage Asset...');
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
            setGlobalLoading(false);
        }
    };

    const fetchPassageQuestions = async (passageId: number) => {
        const { data } = await supabase.from('exam_questions').select('*').eq('passage_id', passageId).order('id');
        setPassageQuestions(data || []);
    };

    const fetchSections = async (examId: number) => {
        setGlobalLoading(true, 'Analyzing Curriculum Structure...');
        const { data } = await supabase.from('exam_sections').select('*').eq('exam_id', examId).order('order_index');
        setSections(data || []);
        setGlobalLoading(false);
    };

    const fetchQuestions = async (sectionId: number) => {
        setGlobalLoading(true, 'Retrieving Question Pool...');
        const { data } = await supabase.from('exam_questions').select('*').eq('section_id', sectionId).order('id');
        setQuestions(data || []);
        setGlobalLoading(false);
    };

    const fetchResults = async (examId: number) => {
        setGlobalLoading(true, 'Analyzing Student Performance...');
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
            setGlobalLoading(false);
        }
    };

    // --- Exam Handlers ---
    const handleSaveExam = async () => {
        if (!user?.id) {
            toast.error("User session invalid. Please reload.");
            return;
        }

        if (!examForm.name || !examForm.total_duration) {
            toast.error("Please fill in all required fields (Name, Duration)");
            return;
        }

        setGlobalLoading(true, 'Processing Evaluation Model...');
        try {
            // Permission Check
            if (activeExam && userRole !== 'super_admin') {
                if (activeExam.institution_id && (!activeExam.institution_id || activeExam.institution_id !== user?.institution_id)) {
                    toast.error("You cannot edit this exam (Owned by another context)");
                    setGlobalLoading(false);
                    return;
                }
                if (!activeExam.institution_id && userRole === 'institution_admin') {
                    toast.error("You cannot edit Global Exams");
                    setGlobalLoading(false);
                    return;
                }
            }

            // Prepare Payload
            const payload: any = {
                name: examForm.name,
                exam_type: examForm.exam_type,
                total_duration: examForm.total_duration,
                allow_continue_after_time_up: examForm.allow_continue_after_time_up || false,
                allow_reattempt: examForm.allow_reattempt || false,
                auto_submit: examForm.auto_submit || false,
                result_release_setting: examForm.result_release_setting || 'immediate',
                is_active: examForm.is_active || false,
                university_id: uniId,
                // Ensure only updated if creating, or preserve if editing
            };

            // Handle Institution Context
            if (!activeExam) {
                // CREATION
                payload.created_by = user.id;
                if (userRole === 'institution_admin' && user?.institution_id) {
                    payload.institution_id = user.institution_id;
                } else if (userRole === 'super_admin') {
                    payload.institution_id = null; // Explicitly Global
                }
            } else {
                // EDITING - Preserving existing ownership unless explicitly transferred (not implemented here)
                // We do NOT overwrite institution_id here to avoid "sindigoing" exams or breaking global status
            }

            // Handle Dates
            if (examForm.start_time) payload.start_time = new Date(examForm.start_time).toISOString();
            else payload.start_time = null;

            if (examForm.end_time) payload.end_time = new Date(examForm.end_time).toISOString();
            else payload.end_time = null;


            if (activeExam) {
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
            console.error(error);
            toast.error(`Error: ${error.message}`);
        } finally {
            setGlobalLoading(false);
        }
    };

    // --- Section Handlers ---
    const handleSaveSection = async () => {
        if (!activeExam) return;
        if (userRole !== 'super_admin' && (!activeExam.institution_id || activeExam.institution_id !== user?.institution_id)) {
            toast.error('You do not have permission to modify this exam.');
            return;
        }
        setGlobalLoading(true, 'Defining Structural Integrity...');
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
            setGlobalLoading(false);
        }
    };

    // --- Question Handlers ---
    const handleSaveQuestion = async () => {
        if (!activeSection) return;
        if (userRole !== 'super_admin' && (!activeExam?.institution_id || activeExam?.institution_id !== user?.institution_id)) {
            toast.error('You do not have permission to modify this exam.');
            return;
        }
        setGlobalLoading(true, 'Injecting Intellectual Material...');
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
            setGlobalLoading(false);
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
        setGlobalLoading(true, 'Removing Assessment Asset...');
        const { error } = await supabase.from('university_exams').delete().eq('id', exam.id);
        setGlobalLoading(false);
        if (error) toast.error(error.message);
        else {
            toast.success('Exam deleted');
            fetchInitialData();
        }
    };

    const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0] || !activeSection) return;
        const file = e.target.files[0];
        setGlobalLoading(true, 'Parsing Academic Data Source...');
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
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
                if (error) throw error;

                toast.success(`Uploaded ${questions_to_insert.length} questions`);
                fetchQuestions(activeSection.id);
                setIsBulkModalOpen(false);
            } catch (err: any) {
                toast.error(err.message);
            } finally {
                setGlobalLoading(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setGlobalLoading(true, 'Processing Media Asset...');
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
            setGlobalLoading(false);
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
        if (view === 'results') {
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
                        {view === 'results' && (
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
                        {view === 'results' && 'Student Performance Analysis'}
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

            {loading ? null : (
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
                                                className="group relative bg-gradient-to-br from-blue-600 to-blue-600 p-10 rounded-xl shadow-2xl hover:shadow-amber-500/20 transition-all duration-500 overflow-hidden flex flex-col min-h-[350px]"
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
                                                    <button onClick={() => { setActiveExam(exam); fetchResults(exam.id); setView('results'); }} className="px-6 py-5 bg-white/20 text-white rounded-[1.5rem] font-black uppercase transition-all hover:bg-white hover:text-emerald-600 shadow-lg">
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
                                            className="group relative bg-emerald-900 p-10 rounded-xl border border-slate-800 shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 overflow-hidden flex flex-col min-h-[350px]"
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
                                                <button onClick={() => { setActiveExam(exam); fetchResults(exam.id); setView('results'); }} className="px-6 py-5 bg-slate-800 text-white rounded-[1.5rem] font-black uppercase transition-all hover:bg-slate-700 shadow-lg">
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

                                {sections.length === 0 && (
                                    <div className="col-span-full py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 text-center">
                                        <Layers className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                                        <h3 className="text-xl font-black text-slate-900">Blueprint Empty</h3>
                                        <p className="text-slate-500 font-medium">Add sections to define the structure of this assessment.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* QUESTIONS VIEW */}
                    {view === 'questions' && (
                        <div className="space-y-8">
                            <div className="bg-slate-900 text-white p-10 rounded-xl shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />
                                <div className="relative z-10 text-center md:text-left">
                                    <div className="flex items-center gap-3 mb-4 opacity-70">
                                        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                                            <HelpCircle className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em]">{activeExam?.name}</p>
                                    </div>
                                    <h2 className="text-5xl font-black tracking-tighter text-white mb-6 leading-none">{activeSection?.name}</h2>
                                    <div className="flex flex-wrap items-center gap-6 text-white/60 font-bold text-sm">
                                        <div className="flex items-center gap-2">
                                            <Zap className="w-4 h-4 text-emerald-400" /> {questions.length} Active Items
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Target className="w-4 h-4 text-emerald-400" /> {activeSection?.weightage}% Exam Weight
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setActiveSection(null); setView('sections'); fetchSections(activeExam!.id); }}
                                    className="relative z-10 px-10 py-5 bg-white text-slate-900 hover:bg-emerald-50 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl flex items-center gap-2 group/back"
                                >
                                    <ArrowLeft className="w-4 h-4 group-hover/back:-translate-x-1 transition-transform" />
                                    Back to Blueprint
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                {questions.map((q, idx) => (
                                    <div
                                        key={q.id}
                                        className="bg-white overflow-hidden rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all group flex flex-col md:flex-row"
                                    >
                                        <div className="md:w-32 bg-slate-50 flex items-center justify-center p-8 md:p-0 border-r border-slate-100">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Q-Index</span>
                                                <span className="text-3xl font-black text-slate-900">{idx + 1}</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 p-10">
                                            <div className="flex items-start justify-between gap-6 mb-8">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-lg">
                                                            {q.question_type.replace('_', ' ')}
                                                        </span>
                                                        <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg">
                                                            {q.marks} Marks
                                                        </span>
                                                    </div>
                                                    <h4 className="text-2xl font-bold text-slate-900 leading-relaxed">{q.question_text}</h4>
                                                    {q.image_url && (
                                                        <div className="mt-6 rounded-2xl overflow-hidden border border-slate-100 max-w-sm">
                                                            <img src={q.image_url} alt="Question Asset" className="w-full h-auto object-cover" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    {(userRole === 'super_admin' || (activeExam?.institution_id && activeExam.institution_id === user?.institution_id)) && (
                                                        <>
                                                            <button
                                                                onClick={() => { setQuestionForm({ ...q, passage_id: q.passage_id || '' }); setIsQuestionModalOpen(true); }}
                                                                className="p-3 bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (!confirm('Remove this question?')) return;
                                                                    setGlobalLoading(true, 'Eliminating Question Entity...');
                                                                    const { error } = await supabase.from('exam_questions').delete().eq('id', q.id);
                                                                    setGlobalLoading(false);
                                                                    if (error) toast.error(error.message);
                                                                    else {
                                                                        toast.success('Question removed');
                                                                        fetchQuestions(activeSection!.id);
                                                                    }
                                                                }}
                                                                className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {q.options.map((opt, i) => {
                                                    const isCorrect = Array.isArray(q.correct_answer)
                                                        ? q.correct_answer.includes(i + 1)
                                                        : Number(q.correct_answer) === i + 1;
                                                    return (
                                                        <div
                                                            key={i}
                                                            className={`p-5 rounded-2xl border-2 transition-all flex items-center gap-4 ${isCorrect ? 'bg-emerald-50 border-emerald-500/20 text-emerald-900' : 'bg-slate-50 border-slate-100 text-slate-600'}`}
                                                        >
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${isCorrect ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-400'}`}>
                                                                {String.fromCharCode(65 + i)}
                                                            </div>
                                                            <span className="font-bold">{opt}</span>
                                                            {isCorrect && <CheckCircle className="w-4 h-4 ml-auto text-emerald-600" />}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {q.explanation && (
                                                <div className="mt-8 p-6 bg-slate-900 rounded-2xl text-slate-300">
                                                    <div className="flex items-center gap-2 mb-2 text-emerald-400">
                                                        <Zap className="w-4 h-4" />
                                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Solution Insight</span>
                                                    </div>
                                                    <p className="text-sm font-medium leading-relaxed">{q.explanation}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {questions.length === 0 && (
                                    <div className="py-32 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 text-center">
                                        <HelpCircle className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                                        <h3 className="text-xl font-black text-slate-900">Question Pool Empty</h3>
                                        <p className="text-slate-500 font-medium">Add questions manually or via bulk upload.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* RESULTS VIEW */}
                    {view === 'results' && (
                        <div className="space-y-8">
                            <div className="bg-emerald-900 text-white p-10 rounded-xl">
                                <h2 className="text-3xl font-black mb-2">{activeExam?.name} Results</h2>
                                <p className="text-emerald-400 font-bold uppercase tracking-widest text-xs">Student Performance Dashboard</p>
                            </div>

                            <div className="bg-white rounded-xl border border-slate-100 shadow-xl overflow-hidden">
                                <div className="p-8 border-b border-slate-100">
                                    <h3 className="text-xl font-black text-slate-900">Attempt History</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50">
                                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Student</th>
                                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Score</th>
                                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Time Spent</th>
                                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Completed</th>
                                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {examResults.map((res: any) => (
                                                <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-6 border-b border-slate-100">
                                                        <div className="font-bold text-slate-900">{res.student_name}</div>
                                                        <div className="text-xs text-slate-500">{res.student_email}</div>
                                                    </td>
                                                    <td className="p-6 border-b border-slate-100">
                                                        <span className="text-lg font-black text-emerald-600">{res.score?.toFixed(1)}%</span>
                                                    </td>
                                                    <td className="p-6 border-b border-slate-100 font-bold text-slate-600">
                                                        {Math.floor(res.time_spent / 60)}m {res.time_spent % 60}s
                                                    </td>
                                                    <td className="p-6 border-b border-slate-100 text-slate-600 font-medium">
                                                        {new Date(res.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-6 border-b border-slate-100">
                                                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${res.is_completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {res.is_completed ? 'Finished' : 'In Progress'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {examResults.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="p-20 text-center text-slate-400 font-bold italic">No attempts recorded for this examination yet.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* EXAM MODAL */}
            {isExamModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-xl font-bold text-slate-900">
                                {activeExam ? 'Edit Assessment' : 'Create New Assessment'}
                            </h3>
                            <button onClick={() => setIsExamModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Exam Title</label>
                                    <input
                                        type="text"
                                        value={examForm.name}
                                        onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                        placeholder="e.g. Final Semester Physics"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Exam Type</label>
                                    <select
                                        value={examForm.exam_type}
                                        onChange={(e) => setExamForm({ ...examForm, exam_type: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                    >
                                        <option value="mock">Mock Test</option>
                                        <option value="module">Module Assessment</option>
                                        <option value="final">Final Exam</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Duration (Minutes)</label>
                                    <input
                                        type="number"
                                        value={examForm.total_duration}
                                        onChange={(e) => setExamForm({ ...examForm, total_duration: parseInt(e.target.value) })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Start Time</label>
                                    <input
                                        type="datetime-local"
                                        value={examForm.start_time}
                                        onChange={(e) => setExamForm({ ...examForm, start_time: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">End Time</label>
                                    <input
                                        type="datetime-local"
                                        value={examForm.end_time}
                                        onChange={(e) => setExamForm({ ...examForm, end_time: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Configuration</h4>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div>
                                        <span className="block font-bold text-slate-700">Allow Reattempt</span>
                                        <span className="text-xs text-slate-500">Students can take the test multiple times</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={examForm.allow_reattempt} onChange={(e) => setExamForm({ ...examForm, allow_reattempt: e.target.checked })} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div>
                                        <span className="block font-bold text-slate-700">Auto Submit</span>
                                        <span className="text-xs text-slate-500">Submit automatically when time expires</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={examForm.auto_submit} onChange={(e) => setExamForm({ ...examForm, auto_submit: e.target.checked })} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div>
                                        <span className="block font-bold text-slate-700">Active Status</span>
                                        <span className="text-xs text-slate-500">Immediately visible to students</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={examForm.is_active} onChange={(e) => setExamForm({ ...examForm, is_active: e.target.checked })} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsExamModalOpen(false)}
                                className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveExam}
                                className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                            >
                                {activeExam ? 'Update Exam' : 'Create Exam'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION MODAL */}
            {isSectionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-xl font-bold text-slate-900">
                                {activeSection ? 'Edit Section' : 'Add New Section'}
                            </h3>
                            <button onClick={() => setIsSectionModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Section Name</label>
                                <input
                                    type="text"
                                    value={sectionForm.name}
                                    onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                    placeholder="e.g. Physics Section A"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Total Questions</label>
                                    <input
                                        type="number"
                                        value={sectionForm.num_questions}
                                        onChange={(e) => setSectionForm({ ...sectionForm, num_questions: parseInt(e.target.value) })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Weightage (%)</label>
                                    <input
                                        type="number"
                                        value={sectionForm.weightage}
                                        onChange={(e) => setSectionForm({ ...sectionForm, weightage: parseInt(e.target.value) })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsSectionModalOpen(false)}
                                className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveSection}
                                className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                            >
                                Save Section
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QUESTION MODAL */}
            {isQuestionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-xl font-bold text-slate-900">
                                {questionForm.id ? 'Edit Question' : 'Add New Question'}
                            </h3>
                            <button onClick={() => setIsQuestionModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Question Text</label>
                                        <textarea
                                            value={questionForm.question_text}
                                            onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium min-h-[120px] resize-none"
                                            placeholder="Enter your question here..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Question Type</label>
                                            <select
                                                value={questionForm.question_type}
                                                onChange={(e) => setQuestionForm({ ...questionForm, question_type: e.target.value })}
                                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                            >
                                                <option value="mcq_single">Single Choice MCQ</option>
                                                <option value="true_false">True / False</option>
                                                <option value="short_answer">Short Answer</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Marks</label>
                                            <input
                                                type="number"
                                                value={questionForm.marks}
                                                onChange={(e) => setQuestionForm({ ...questionForm, marks: parseInt(e.target.value) })}
                                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Image Attachment</label>
                                        <div className="flex items-center gap-4">
                                            <label className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold cursor-pointer hover:bg-slate-200 transition-all">
                                                <ImageIcon className="w-4 h-4" />
                                                Choose Image
                                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                            </label>
                                            {questionForm.image_url && (
                                                <div className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" /> Uploaded
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {(questionForm.question_type === 'mcq_single' || questionForm.question_type === 'mcq_multiple') && (
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-4">Options & Answer</label>
                                            <div className="space-y-3">
                                                {questionForm.options.map((opt: string, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-3">
                                                        <div className="w-8 h-8 flex items-center justify-center font-bold text-slate-400 bg-slate-100 rounded-lg text-xs">
                                                            {String.fromCharCode(65 + idx)}
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={opt}
                                                            onChange={(e) => {
                                                                const newOptions = [...questionForm.options];
                                                                newOptions[idx] = e.target.value;
                                                                setQuestionForm({ ...questionForm, options: newOptions });
                                                            }}
                                                            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm"
                                                            placeholder={`Option ${idx + 1}`}
                                                        />
                                                        <input
                                                            type="radio"
                                                            name="correct_answer"
                                                            checked={parseInt(questionForm.correct_answer) === idx + 1}
                                                            onChange={() => setQuestionForm({ ...questionForm, correct_answer: idx + 1 })}
                                                            className="w-5 h-5 text-emerald-600 focus:ring-blue-500 border-gray-300"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Explanation</label>
                                        <textarea
                                            value={questionForm.explanation}
                                            onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium min-h-[100px] resize-none"
                                            placeholder="Explain why the answer is correct..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsQuestionModalOpen(false)}
                                className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveQuestion}
                                className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                            >
                                Save Question
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BULK UPLOAD MODAL */}
            {isBulkModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-xl font-bold text-slate-900">Bulk Upload Questions</h3>
                            <button onClick={() => setIsBulkModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="p-8 text-center space-y-6">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                <FileSpreadsheet className="w-8 h-8" />
                            </div>

                            <div>
                                <h4 className="text-lg font-bold text-slate-900 mb-2">Upload Excel / CSV</h4>
                                <p className="text-slate-500 text-sm">
                                    Upload a spreadsheet containing questions. Ensure columns match the template: Question, Option A-D, Answer (1-4).
                                </p>
                            </div>

                            <label className="block w-full p-4 border-2 border-dashed border-slate-200 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/50 transition-all cursor-pointer group">
                                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleBulkUpload} />
                                <div className="text-slate-400 group-hover:text-emerald-600 font-bold text-sm">
                                    Click to select file
                                </div>
                            </label>

                            <a href="#" className="inline-block text-xs font-bold text-emerald-600 hover:underline">
                                Download Template
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
