'use client';

import React, { useEffect, useState } from 'react';
import {
    ChevronRight, ChevronDown,
    Layers, Hash, FileText,
    Search, RefreshCw, Target,
    CheckCircle2, HelpCircle,
    BarChart3, Plus, Filter, Settings
} from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { X, Save, Trash2 } from 'lucide-react';
import { useUI } from '@/lib/context/UIContext';
import { useLoading } from '@/lib/context/LoadingContext';

// Data Type
type HierarchyItem = {
    id: string;
    dbId: number;
    type: 'subject' | 'topic' | 'subtopic';
    title: string;
    children?: HierarchyItem[];
    expanded?: boolean;
    mcqCount?: number;
};

export default function SuperAdminQuestionBankPage() {
    const [user, setUser] = useState<any>(null);
    const [data, setData] = useState<HierarchyItem[]>([]);
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState<HierarchyItem | null>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const questionsLoading = loading; // Map to global loading

    // MCQ Modal State
    const [isMcqModalOpen, setIsMcqModalOpen] = useState(false);
    const [isPassageModalOpen, setIsPassageModalOpen] = useState(false);
    const [passages, setPassages] = useState<any[]>([]);
    const [editingMcq, setEditingMcq] = useState<any>(null);
    const [mcqForm, setMcqForm] = useState({
        question: '',
        question_type: 'mcq_single',
        difficulty: 'medium',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_option: 'A',
        explanation: '',
        question_image_url: '',
        question_image_type: 'direct',
        explanation_url: '',
        explanation_image_type: 'direct',
        passage_id: '' as string | number
    });

    const [passageForm, setPassageForm] = useState({
        title: '',
        content: ''
    });

    const convertDriveLink = (url: string) => {
        if (!url) return '';
        if (url.includes('drive.google.com')) {
            const idMatch = url.match(/\/d\/(.+?)\//) || url.match(/id=(.+?)(&|$)/);
            if (idMatch && idMatch[1]) {
                return `https://lh3.googleusercontent.com/u/0/d/${idMatch[1]}=w1000`;
            }
        }
        return url;
    };

    const loadHierarchy = async () => {
        setGlobalLoading(true, 'Syncing Master Tree...');
        try {
            // Fetch ALL subjects, topics, subtopics
            const { data: subjects } = await supabase.from('subjects').select('*').order('name');
            const { data: topics } = await supabase.from('topics').select('*').order('name');
            const { data: subtopics } = await supabase.from('subtopics').select('*').order('name');

            // Get MCQ counts for both subtopics and direct topics
            const { data: allMcqs } = await supabase.from('mcqs').select('id, subtopic_id, topic_id');

            if (subjects) {
                const tree: HierarchyItem[] = subjects.map((s: any) => {
                    const subjectTopics = topics?.filter((t: any) => t.subject_id === s.id) || [];
                    const processedTopics = subjectTopics.map((t: any): HierarchyItem => {
                        const topicSubtopics = subtopics?.filter((st: any) => st.topic_id === t.id) || [];
                        const processedSubtopics: HierarchyItem[] = topicSubtopics.map((st: any): HierarchyItem => {
                            const count = allMcqs?.filter(m => m.subtopic_id === st.id).length || 0;
                            return {
                                id: `st-${st.id}`,
                                dbId: st.id,
                                type: 'subtopic',
                                title: st.name,
                                mcqCount: count
                            };
                        });

                        const directTopicCount = allMcqs?.filter(m => m.topic_id === t.id).length || 0;
                        const totalTopicCount = processedSubtopics.reduce((sum, st) => sum + (st.mcqCount || 0), 0) + directTopicCount;

                        return {
                            id: `t-${t.id}`,
                            dbId: t.id,
                            type: 'topic',
                            title: t.name,
                            expanded: false,
                            mcqCount: totalTopicCount,
                            children: processedSubtopics
                        };
                    });
                    const subjectCount = processedTopics.reduce((sum, t) => sum + (t.mcqCount || 0), 0);
                    return {
                        id: `s-${s.id}`,
                        dbId: s.id,
                        type: 'subject',
                        title: s.name,
                        expanded: false,
                        mcqCount: subjectCount,
                        children: processedTopics
                    };
                });
                setData(tree);
            }
        } finally {
            setGlobalLoading(false);
        }
    };

    const fetchPassages = async () => {
        const { data } = await supabase.from('passages').select('*').order('created_at', { ascending: false });
        if (data) setPassages(data);
    };

    const handleSavePassage = async () => {
        if (!passageForm.content) {
            toast.error("Passage content is required");
            return;
        }

        try {
            const { data, error } = await supabase
                .from('passages')
                .insert([passageForm])
                .select()
                .single();

            if (error) throw error;

            toast.success("Passage created successfully");
            setPassages([data, ...passages]);
            setIsPassageModalOpen(false);
            setPassageForm({ title: '', content: '' });
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    useEffect(() => {
        const currentUser = AuthService.getCurrentUser();
        if (currentUser) setUser(currentUser);
        loadHierarchy();
        fetchPassages();
    }, []);

    const loadQuestions = async (item: HierarchyItem) => {
        setGlobalLoading(true, 'Accessing Encrypted Archives...');
        try {
            let query = supabase.from('mcqs').select('*');

            if (item.type === 'subtopic') {
                query = query.eq('subtopic_id', item.dbId);
            } else if (item.type === 'topic') {
                query = query.eq('topic_id', item.dbId);
            } else {
                setQuestions([]);
                return;
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (data) setQuestions(data);
        } catch (error) {
            console.error("Error loading questions:", error);
        } finally {
            setGlobalLoading(false);
        }
    };

    const handleOpenAddMcq = () => {
        if (!selectedItem || selectedItem.type === 'subject') {
            toast.error("Please select a topic or subtopic first");
            return;
        }
        setEditingMcq(null);
        setMcqForm({
            question: '',
            question_type: 'mcq_single',
            difficulty: 'medium',
            option_a: '',
            option_b: '',
            option_c: '',
            option_d: '',
            correct_option: 'A',
            explanation: '',
            question_image_url: '',
            question_image_type: 'direct',
            explanation_url: '',
            explanation_image_type: 'direct',
            passage_id: ''
        });
        setIsMcqModalOpen(true);
    };

    const handleOpenEditMcq = (q: any) => {
        setEditingMcq(q);
        setMcqForm({
            question: q.question || '',
            question_type: q.question_type || 'mcq_single',
            difficulty: q.difficulty || 'medium',
            option_a: q.option_a || '',
            option_b: q.option_b || '',
            option_c: q.option_c || '',
            option_d: q.option_d || '',
            correct_option: q.correct_option || 'A',
            explanation: q.explanation || '',
            question_image_url: q.question_image_url || '',
            question_image_type: q.question_image_url?.includes('googleusercontent.com') ? 'drive' : 'direct',
            explanation_url: q.explanation_url || '',
            explanation_image_type: q.explanation_url?.includes('googleusercontent.com') ? 'drive' : 'direct',
            passage_id: q.passage_id || ''
        });
        setIsMcqModalOpen(true);
    };

    const handleSaveMcq = async () => {
        if (!mcqForm.question || !mcqForm.option_a || !mcqForm.option_b) {
            toast.error("Please fill in the question and at least two options");
            return;
        }

        try {
            const processedForm = {
                ...mcqForm,
                question_image_url: mcqForm.question_image_type === 'drive'
                    ? convertDriveLink(mcqForm.question_image_url)
                    : mcqForm.question_image_url,
                explanation_url: mcqForm.explanation_image_type === 'drive'
                    ? convertDriveLink(mcqForm.explanation_url)
                    : mcqForm.explanation_url,
                passage_id: mcqForm.passage_id === '' ? null : Number(mcqForm.passage_id)
            };

            // Remove internal UI state before saving
            const { question_image_type, explanation_image_type, ...payload } = {
                ...processedForm,
                subtopic_id: selectedItem?.type === 'subtopic' ? selectedItem.dbId : null,
                topic_id: selectedItem?.type === 'topic' ? selectedItem.dbId : null,
                is_active: true
            };

            let error;
            if (editingMcq) {
                const { error: err } = await supabase
                    .from('mcqs')
                    .update(payload)
                    .eq('id', editingMcq.id);
                error = err;
            } else {
                const { error: err } = await supabase
                    .from('mcqs')
                    .insert([payload]);
                error = err;
            }

            if (error) throw error;

            toast.success(editingMcq ? "Question updated successfully" : "Question added successfully");
            setIsMcqModalOpen(false);
            if (selectedItem) loadQuestions(selectedItem);
        } catch (err: any) {
            console.error("Save MCQ error:", err);
            toast.error(err.message || "Failed to save MCQ");
        }
    };

    const handleDeleteMcq = async (id: number) => {
        if (!confirm("Are you sure you want to permanently delete this question? This action cannot be undone.")) return;

        try {
            const { error } = await supabase
                .from('mcqs')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success("Question deleted successfully");
            if (selectedItem) loadQuestions(selectedItem);
        } catch (err: any) {
            console.error("Delete MCQ error:", err);
            toast.error(err.message || "Failed to delete question");
        }
    };

    useEffect(() => {
        const currentUser = AuthService.getCurrentUser();
        if (currentUser) setUser(currentUser);
        loadHierarchy();
    }, []);


    const toggleExpand = (id: string, items: HierarchyItem[]): HierarchyItem[] => {
        return items.map(item => {
            if (item.id === id) {
                return { ...item, expanded: !item.expanded };
            }
            if (item.children) {
                return { ...item, children: toggleExpand(id, item.children) };
            }
            return item;
        });
    };

    const handleExpandCallback = (id: string) => {
        setData(toggleExpand(id, data));
    };

    const renderTree = (items: HierarchyItem[], level = 0) => {
        const filtered = items.filter(item =>
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.children && item.children.some(child => child.title.toLowerCase().includes(searchQuery.toLowerCase())))
        );

        return filtered.map((item) => (
            <div key={item.id} className="select-none">
                <div
                    className={`
                        group flex items-center gap-3 py-2 px-4 border-b border-indigo-50/10 hover:bg-slate-50 transition-all cursor-pointer
                        ${selectedItem?.id === item.id ? 'bg-slate-100 border-l-4 border-l-indigo-600' : 'bg-transparent border-l-4 border-l-transparent'}
                    `}
                    style={{ paddingLeft: `${level * 16 + 16}px` }}
                    onClick={() => {
                        if (item.type === 'subject' || item.type === 'topic') {
                            handleExpandCallback(item.id);
                        }

                        // Select if topic or subtopic
                        if (item.type === 'topic' || item.type === 'subtopic') {
                            setSelectedItem(item);
                            loadQuestions(item);
                        }
                    }}
                >
                    {/* Expand Toggle */}
                    <div className={`p-1 rounded text-slate-500 ${!item.children || item.children.length === 0 ? 'invisible' : ''}`}>
                        {item.expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </div>

                    {/* Icon */}
                    <div className={`
                        w-6 h-6 rounded flex items-center justify-center
                        ${item.type === 'subject' ? 'bg-indigo-500/10 text-indigo-400' :
                            item.type === 'topic' ? 'bg-blue-500/10 text-blue-400' :
                                'bg-slate-500/10 text-slate-400'}
                    `}>
                        {item.type === 'subject' && <Layers className="w-3 h-3" />}
                        {item.type === 'topic' && <Hash className="w-3 h-3" />}
                        {item.type === 'subtopic' && <Target className="w-3 h-3" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className={`text-xs font-bold truncate ${selectedItem?.id === item.id ? 'text-slate-900' : 'text-slate-500'}`}>
                            {item.title}
                        </div>
                    </div>

                    {item.mcqCount !== undefined && (
                        <div className={`text-[9px] font-black px-1.5 py-0.5 rounded min-w-[20px] text-center shadow-sm ${item.mcqCount > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                            {item.mcqCount}
                        </div>
                    )}
                </div>

                {/* Recursively render children */}
                {item.expanded && item.children && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                        {renderTree(item.children, level + 1)}
                    </div>
                )}
            </div>
        ));
    };

    const { isSidebarCollapsed } = useUI();

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="super_admin" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name || 'Super Admin'} userEmail={user?.email} />

                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8 flex flex-col min-h-0">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Question Bank Master</h1>
                            <p className="text-sm sm:text-base text-slate-500 font-medium">Platform-wide question repository and verification hub.</p>
                        </div>
                        <button
                            onClick={handleOpenAddMcq}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 text-white font-black uppercase tracking-wider text-[11px] rounded-xl hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            New Question
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0">
                        {/* Left: Hierarchy Sidebar */}
                        <div className="w-full lg:w-80 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[300px] lg:min-h-0">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Filter hierarchy..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-300"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {loading ? null : data.length > 0 ? (
                                    renderTree(data)
                                ) : (
                                    <div className="p-8 text-center text-slate-400">
                                        <Target className="w-8 h-8 mx-auto mb-2 opacity-10" />
                                        <p className="text-xs font-bold uppercase tracking-widest">Repository Empty</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: Modern Question Viewer */}
                        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[500px] lg:min-h-0">
                            {selectedItem ? (
                                <>
                                    <div className="p-6 border-b border-gray-100 bg-white flex justify-between items-center shadow-sm">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                                    Master Data Repository
                                                </span>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                                    {questions.length} Total Questions
                                                </span>
                                            </div>
                                            <h2 className="text-xl font-black text-slate-900">{selectedItem?.title}</h2>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-lg border border-gray-100">
                                                <Filter className="w-4 h-4 text-slate-400" />
                                                <select className="bg-transparent border-none text-[10px] font-black text-slate-600 outline-none uppercase tracking-wider">
                                                    <option>Filter Difficulty</option>
                                                    <option>Easy</option>
                                                    <option>Medium</option>
                                                    <option>Hard</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 custom-scrollbar">
                                        {questionsLoading ? null : questions.length > 0 ? (
                                            questions.map((q, idx) => (
                                                <div key={q.id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleOpenEditMcq(q)}
                                                                className="text-slate-400 hover:text-indigo-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-slate-50 rounded-lg border border-gray-100 transition-colors"
                                                            >
                                                                Edit Entry
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteMcq(q.id)}
                                                                className="text-slate-400 hover:text-rose-600 p-1 bg-slate-50 rounded-lg border border-gray-100 transition-colors"
                                                                title="Delete Question"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-slate-900/10">
                                                                {idx + 1}
                                                            </span>
                                                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] ${q.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700' :
                                                                q.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' :
                                                                    'bg-rose-100 text-rose-700'
                                                                }`}>
                                                                {q.difficulty}
                                                            </span>
                                                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-[0.1em]">
                                                                {q.question_type?.replace('_', ' ') || 'MCQ Single'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-6 pr-12">
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Attempts</span>
                                                                <span className="text-sm font-black text-slate-900">{q.times_attempted || 0}</span>
                                                            </div>
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Platform Accuracy</span>
                                                                <span className="text-sm font-black text-emerald-600">{((q.times_correct || 0) / (q.times_attempted || 1) * 100).toFixed(1)}%</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="text-slate-800 text-lg font-black mb-8 leading-tight">
                                                        {q.question}
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                                        {['A', 'B', 'C', 'D'].map((opt) => (
                                                            <div
                                                                key={opt}
                                                                className={`px-5 py-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${q.correct_option === opt
                                                                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 shadow-sm'
                                                                    : 'border-slate-100 bg-slate-50/50 text-slate-500'
                                                                    }`}
                                                            >
                                                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${q.correct_option === opt ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-200 text-slate-500'
                                                                    }`}>
                                                                    {opt}
                                                                </span>
                                                                <span className="text-sm font-bold">{q[`option_${opt.toLowerCase()}`]}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {q.explanation && (
                                                        <div className="p-5 bg-indigo-50/30 rounded-2xl border border-indigo-50">
                                                            <div className="flex items-center gap-2 text-indigo-700 text-[10px] font-black uppercase tracking-widest mb-2">
                                                                <HelpCircle className="w-4 h-4" />
                                                                Academic Rationale
                                                            </div>
                                                            <p className="text-sm text-indigo-900/80 font-medium leading-relaxed italic">"{q.explanation}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-20">
                                                <div className="w-24 h-24 bg-white rounded-full shadow-2xl shadow-indigo-500/10 flex items-center justify-center mb-8">
                                                    <Target className="w-12 h-12 text-indigo-100" />
                                                </div>
                                                <h3 className="text-2xl font-black text-slate-900 mb-2">Virgin Territory</h3>
                                                <p className="text-slate-500 max-w-sm mb-8">
                                                    This subtopic contains no validated questions. Use the 'New Question' button or Excel Uploader to initialize the bank.
                                                </p>
                                                <button className="px-8 py-3 bg-slate-900 text-white font-black rounded-2xl hover:scale-105 transition-transform shadow-xl shadow-slate-900/20">
                                                    Add First MCQ
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white">
                                    <div className="w-32 h-32 bg-indigo-50 rounded-full flex items-center justify-center mb-10 animate-pulse">
                                        <Target className="w-16 h-16 text-indigo-600 opacity-10" />
                                    </div>
                                    <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Select a Data Node</h3>
                                    <p className="text-slate-500 max-w-md font-medium leading-relaxed">
                                        The master question bank allows platform-wide auditing. Select any Subject → Topic → Subtopic from the global tree to explore and modify the platform's core educational data.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* MCQ Modal */}
                    {isMcqModalOpen && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900">{editingMcq ? 'Edit MCQ' : 'Create New MCQ'}</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedItem?.title}</p>
                                    </div>
                                    <button onClick={() => setIsMcqModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                                    {/* Question Type Selection */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">System Blueprint Type</label>
                                        <div className="relative group">
                                            <Settings className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600 z-10" />
                                            <select
                                                value={mcqForm.question_type}
                                                onChange={(e) => setMcqForm({ ...mcqForm, question_type: e.target.value })}
                                                className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-gray-100 rounded-xl text-slate-800 font-bold outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500/10 transition-all"
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
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-600 transition-colors">
                                                <ChevronDown className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Passage Selection */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Passage (Optional)</label>
                                        <div className="flex gap-2">
                                            <select
                                                value={mcqForm.passage_id}
                                                onChange={(e) => setMcqForm({ ...mcqForm, passage_id: e.target.value })}
                                                className="flex-1 px-5 py-3 bg-slate-50 border border-gray-100 rounded-xl text-slate-800 font-bold outline-none truncate"
                                            >
                                                <option value="">No Passage</option>
                                                {passages.map(p => (
                                                    <option key={p.id} value={p.id}>{p.title || `Passage #${p.id}`}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => setIsPassageModalOpen(true)}
                                                className="px-4 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Question Text */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Question Prompt</label>
                                        <textarea
                                            value={mcqForm.question}
                                            onChange={(e) => setMcqForm({ ...mcqForm, question: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-50 border border-gray-100 rounded-2xl text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none h-32 resize-none"
                                            placeholder="Enter the question text..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Difficulty</label>
                                            <select
                                                value={mcqForm.difficulty}
                                                onChange={(e) => setMcqForm({ ...mcqForm, difficulty: e.target.value })}
                                                className="w-full px-5 py-3 bg-slate-50 border border-gray-100 rounded-xl text-slate-800 font-bold outline-none"
                                            >
                                                <option value="easy">Easy</option>
                                                <option value="medium">Medium</option>
                                                <option value="hard">Hard</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Correct Option</label>
                                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                                {['A', 'B', 'C', 'D'].map(opt => (
                                                    <button
                                                        key={opt}
                                                        onClick={() => setMcqForm({ ...mcqForm, correct_option: opt as any })}
                                                        className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${mcqForm.correct_option === opt ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Options */}
                                    <div className="space-y-4">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Answer Options</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            {['a', 'b', 'c', 'd'].map(opt => (
                                                <div key={opt} className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">{opt}</span>
                                                    <input
                                                        type="text"
                                                        value={(mcqForm as any)[`option_${opt}`]}
                                                        onChange={(e) => setMcqForm({ ...mcqForm, [`option_${opt}`]: e.target.value })}
                                                        className="w-full pl-10 pr-5 py-3 bg-slate-50 border border-gray-100 rounded-xl text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                        placeholder={`Option ${opt.toUpperCase()}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Question Image */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Question image (Optional)</label>
                                        <div className="flex bg-slate-50 p-1 rounded-xl border border-gray-100 mb-2">
                                            <button
                                                type="button"
                                                onClick={() => setMcqForm({ ...mcqForm, question_image_type: 'direct' })}
                                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mcqForm.question_image_type === 'direct' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                                            >
                                                Direct Link
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setMcqForm({ ...mcqForm, question_image_type: 'drive' })}
                                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mcqForm.question_image_type === 'drive' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                                            >
                                                Google Drive
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder={mcqForm.question_image_type === 'drive' ? 'Paste Drive link...' : 'https://...'}
                                            value={mcqForm.question_image_url}
                                            onChange={(e) => setMcqForm({ ...mcqForm, question_image_url: e.target.value })}
                                            className="w-full px-5 py-3 bg-slate-50 border border-gray-100 rounded-xl text-slate-800 font-bold outline-none"
                                        />
                                        {mcqForm.question_image_url && (
                                            <div className="mt-2 w-32 h-20 rounded-lg overflow-hidden border border-slate-100">
                                                <img
                                                    src={mcqForm.question_image_type === 'drive' ? convertDriveLink(mcqForm.question_image_url) : mcqForm.question_image_url}
                                                    className="w-full h-full object-cover"
                                                    alt="Preview"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Explanation */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Academic Rationale (Explanation)</label>
                                        <textarea
                                            value={mcqForm.explanation}
                                            onChange={(e) => setMcqForm({ ...mcqForm, explanation: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-50 border border-gray-100 rounded-2xl text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none h-24 resize-none"
                                            placeholder="Explain why the correct option is right..."
                                        />
                                    </div>

                                    {/* Explanation Image */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Explanation image (Optional)</label>
                                        <div className="flex bg-slate-50 p-1 rounded-xl border border-gray-100 mb-2">
                                            <button
                                                type="button"
                                                onClick={() => setMcqForm({ ...mcqForm, explanation_image_type: 'direct' })}
                                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mcqForm.explanation_image_type === 'direct' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                                            >
                                                Direct Link
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setMcqForm({ ...mcqForm, explanation_image_type: 'drive' })}
                                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mcqForm.explanation_image_type === 'drive' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                                            >
                                                Google Drive
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder={mcqForm.explanation_image_type === 'drive' ? 'Paste Drive link...' : 'https://...'}
                                            value={mcqForm.explanation_url}
                                            onChange={(e) => setMcqForm({ ...mcqForm, explanation_url: e.target.value })}
                                            className="w-full px-5 py-3 bg-slate-50 border border-gray-100 rounded-xl text-slate-800 font-bold outline-none"
                                        />
                                        {mcqForm.explanation_url && (
                                            <div className="mt-2 w-32 h-20 rounded-lg overflow-hidden border border-slate-100">
                                                <img
                                                    src={mcqForm.explanation_image_type === 'drive' ? convertDriveLink(mcqForm.explanation_url) : mcqForm.explanation_url}
                                                    className="w-full h-full object-cover"
                                                    alt="Preview"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50 border-t border-gray-100 flex justify-end gap-4">
                                    <button
                                        onClick={() => setIsMcqModalOpen(false)}
                                        className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-200 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveMcq}
                                        className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 text-sm"
                                    >
                                        <Save className="w-4 h-4" />
                                        {editingMcq ? 'Save Changes' : 'Initialize MCQ'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Passage Modal */}
                    {isPassageModalOpen && (
                        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                                <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                                    <h3 className="text-2xl font-black text-slate-900">Manage Passage</h3>
                                    <button onClick={() => setIsPassageModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="p-8 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Passage Title</label>
                                        <input
                                            value={passageForm.title}
                                            onChange={e => setPassageForm({ ...passageForm, title: e.target.value })}
                                            placeholder="Enter passage title (e.g. Reading Comprehension 1)"
                                            className="w-full px-6 py-4 bg-slate-50 border border-gray-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-600/20"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Passage Content</label>
                                        <textarea
                                            value={passageForm.content}
                                            onChange={e => setPassageForm({ ...passageForm, content: e.target.value })}
                                            placeholder="Enter the full passage content here..."
                                            className="w-full h-64 px-6 py-4 bg-slate-50 border border-gray-100 rounded-2xl font-bold resize-none outline-none focus:ring-2 focus:ring-indigo-600/20"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSavePassage}
                                        className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >
                                        Deploy Passage to Repository
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
