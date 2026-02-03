'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { AuthService } from '@/lib/services/authService';
import {
    Clock, ChevronLeft, ChevronRight, X, AlertCircle,
    CheckCircle, Flag, Info, Maximize2, ZoomIn, Search
} from 'lucide-react';
import { toast } from 'sonner';

interface Exam {
    id: number;
    name: string;
    exam_type: string;
    total_duration: number;
    allow_continue_after_time_up: boolean;
    auto_submit: boolean;
    negative_marking?: number;
}

interface Section {
    id: number;
    name: string;
    section_duration: number | null;
    num_questions: number;
    order_index: number;
    negative_marking?: number;
    default_marks_per_question?: number;
}

interface Question {
    id: number;
    section_id: number;
    question_text: string;
    image_url: string | null;
    question_type: string;
    options: any[];
    correct_answer: any;
    marks: number;
    explanation: string | null;
    passage_id?: number | null;
}

interface Passage {
    id: number;
    title: string;
    content: string;
}

export default function StudentExamPage() {
    const { uniId, examId } = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    // Data
    const [exam, setExam] = useState<Exam | null>(null);
    const [sections, setSections] = useState<Section[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [passages, setPassages] = useState<Record<number, Passage>>({});
    const [attemptId, setAttemptId] = useState<number | null>(null);

    // Real-time State
    const [activeSectionId, setActiveSectionId] = useState<number | null>(null);
    const [activeQuestionIdx, setActiveQuestionIdx] = useState(0); // Index within current section
    const [answers, setAnswers] = useState<Record<number, any>>({}); // question_id -> answer
    const [timeLeft, setTimeLeft] = useState<number>(-1);
    const [isTimeUpModalOpen, setIsTimeUpModalOpen] = useState(false);
    const [isZoomed, setIsZoomed] = useState(false);
    const [status, setStatus] = useState<'taking' | 'completed'>('taking');
    const [results, setResults] = useState<{ score: number, total: number } | null>(null);
    const [completedSectionIds, setCompletedSectionIds] = useState<number[]>([]);
    const [sectionTimeLeft, setSectionTimeLeft] = useState<number | null>(null);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    // Filtered questions for active section
    const currentSectionQuestions = questions.filter(q => q.section_id === activeSectionId);
    const activeQuestion = currentSectionQuestions[activeQuestionIdx];

    useEffect(() => {
        const init = async () => {
            const u = AuthService.getCurrentUser();
            if (!u) {
                router.push('/login');
                return;
            }
            setUser(u);
            await loadExamData(u.id);
        };
        init();
    }, []);

    const loadExamData = async (userId: string) => {
        try {
            const { data: ex } = await supabase.from('university_exams').select('*').eq('id', Number(examId)).single();
            if (!ex) throw new Error('Exam not found');
            setExam(ex);

            const { data: sects } = await supabase.from('exam_sections').select('*').eq('exam_id', Number(examId)).order('order_index');
            setSections(sects || []);
            const firstSect = sects?.[0];
            setActiveSectionId(firstSect?.id || null);
            if (firstSect?.section_duration) {
                setSectionTimeLeft(firstSect.section_duration * 60);
            }

            const { data: qs } = await supabase.from('exam_questions').select('*').in('section_id', (sects || []).map(s => s.id)).order('order_index');
            setQuestions(qs || []);

            // Fetch any linked passages
            const pIds = (qs || []).map(q => q.passage_id).filter(Boolean);
            if (pIds.length > 0) {
                const { data: ps } = await supabase.from('passages').select('*').in('id', pIds);
                const pMap: Record<number, Passage> = {};
                ps?.forEach(p => pMap[p.id] = p);
                setPassages(pMap);
            }

            await handleAttemptSession(userId, ex);
            setLoading(false);
        } catch (err: any) {
            console.error('Exam initialization failed:', err);
            toast.error(`Session Error: ${err.message}`);
            setLoading(false);
        }
    };

    const handleAttemptSession = async (userId: string, ex: Exam) => {
        const { data: existing } = await supabase
            .from('exam_attempts')
            .select('*')
            .eq('student_id', userId)
            .eq('exam_id', ex.id)
            .eq('status', 'in_progress')
            .single();

        if (existing) {
            setAttemptId(existing.id);
            const { data: ans } = await supabase.from('exam_answers').select('*').eq('attempt_id', existing.id);
            const ansMap: any = {};
            ans?.forEach(a => ansMap[a.question_id] = a.answer);
            setAnswers(ansMap);

            const startTime = new Date(existing.start_time).getTime();
            const now = new Date().getTime();
            const elapsed = Math.floor((now - startTime) / 1000);
            const remaining = (ex.total_duration * 60) - elapsed;

            if (remaining <= 0 && !ex.allow_continue_after_time_up) {
                await finalizeAttempt(existing.id);
            } else {
                setTimeLeft(remaining > 0 ? remaining : 0);
            }
        } else {
            const { data: newAtt, error } = await supabase
                .from('exam_attempts')
                .insert([{
                    student_id: userId,
                    exam_id: Number(examId),
                    university_id: Number(uniId),
                    status: 'in_progress',
                    start_time: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;
            setAttemptId(newAtt.id);
            setTimeLeft(Math.max(1, (ex.total_duration || 0) * 60));
        }
    };

    useEffect(() => {
        if (!activeSectionId || status === 'completed') return;
        const currentSection = sections.find(s => s.id === activeSectionId);
        if (!currentSection || !currentSection.section_duration) {
            setSectionTimeLeft(null);
            return;
        }

        const sTimer = setInterval(() => {
            setSectionTimeLeft(prev => {
                if (prev === null) return null;
                if (prev <= 1) {
                    clearInterval(sTimer);
                    handleFinishSection(activeSectionId);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(sTimer);
    }, [activeSectionId, sections, status]);

    const handleFinishSection = (sectionId: number) => {
        setCompletedSectionIds(prev => [...new Set([...prev, sectionId])]);
        const currentIdx = sections.findIndex(s => s.id === sectionId);
        if (currentIdx < sections.length - 1) {
            const nextSect = sections[currentIdx + 1];
            setActiveSectionId(nextSect.id);
            setActiveQuestionIdx(0);
            const duration = nextSect.section_duration ? nextSect.section_duration * 60 : null;
            setSectionTimeLeft(duration);
            toast.success(`${sections[currentIdx].name} finished and locked.`);
        } else {
            finalizeAttempt(attemptId!);
        }
    };

    useEffect(() => {
        if (timeLeft < 0) return;
        if (timeLeft === 0) {
            if (exam && !isTimeUpModalOpen) {
                setIsTimeUpModalOpen(true);
            }
            return;
        }
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev === 601) toast.info('10 minutes remaining');
                if (prev === 61) toast.warning('1 minute remaining');
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft, exam, isTimeUpModalOpen]);

    const formatTime = (seconds: number) => {
        if (seconds < 0) return '--:--';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleAnswer = async (questionId: number, answer: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
        await supabase.from('exam_answers').upsert([{
            attempt_id: attemptId,
            question_id: questionId,
            answer: answer
        }], { onConflict: 'attempt_id, question_id' });
    };

    const finalizeAttempt = async (attId: number) => {
        setLoading(true);
        try {
            let score = 0;
            let total = 0;
            questions.forEach(q => {
                const sect = sections.find(s => s.id === q.section_id);
                const qMarks = q.marks || sect?.default_marks_per_question || 1;
                const qNeg = sect?.negative_marking !== undefined ? sect.negative_marking : (exam?.negative_marking || 0);

                const studentAns = answers[q.id];
                if (studentAns !== undefined && studentAns !== null && studentAns !== '') {
                    const isCorrect = JSON.stringify(studentAns) === JSON.stringify(q.correct_answer);
                    if (isCorrect) {
                        score += qMarks;
                    } else {
                        score -= qNeg;
                    }
                }
                total += qMarks;
            });

            // Ensure score doesn't go below zero
            score = Math.max(0, score);

            await supabase.from('exam_attempts').update({
                status: 'completed',
                end_time: new Date().toISOString(),
                score: score,
                total_marks: total
            }).eq('id', attId);

            setResults({ score, total });
            setStatus('completed');
            toast.success('Exam submitted successfully!');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black animate-pulse">SYSTEM INITIALIZING...</div>;

    if (status === 'completed') {
        const scorePercentage = results ? Math.round((results.score / results.total) * 100) : 0;
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col p-8 md:p-12 overflow-y-auto custom-scrollbar">
                <div className="max-w-5xl mx-auto w-full">
                    <div className="bg-white rounded-[3rem] p-12 shadow-2xl border border-slate-100 mb-12 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                            <div className="text-center md:text-left">
                                <h1 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-4">Official Result Summary</h1>
                                <h2 className="text-4xl font-black text-slate-900 leading-tight mb-6">{exam?.name}</h2>
                                <button
                                    onClick={() => router.push('/university')}
                                    className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95"
                                >
                                    Return to Dashboard
                                </button>
                            </div>
                            <div className="w-48 h-48 rounded-full border-[12px] border-slate-50 flex flex-col items-center justify-center bg-white shadow-inner relative">
                                <svg className="absolute inset-0 w-full h-full -rotate-90">
                                    <circle
                                        cx="96" cy="96" r="84"
                                        fill="none"
                                        stroke="#4f46e5"
                                        strokeWidth="12"
                                        strokeDasharray={`${(scorePercentage * 527) / 100} 527`}
                                        strokeLinecap="round"
                                        className="transition-all duration-[2s] ease-out"
                                    />
                                </svg>
                                <span className="text-5xl font-black text-indigo-600 relative">{scorePercentage}%</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative mt-1">Total Score</span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-8 pb-20">
                        {sections.map(section => {
                            const sectionQs = questions.filter(q => q.section_id === section.id);
                            return (
                                <div key={section.id} className="space-y-6">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="h-px flex-1 bg-slate-200" />
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">{section.name}</h3>
                                        <div className="h-px flex-1 bg-slate-200" />
                                    </div>
                                    {sectionQs.map((q, idx) => {
                                        const studentAns = answers[q.id];
                                        const isCorrect = JSON.stringify(studentAns) === JSON.stringify(q.correct_answer);
                                        return (
                                            <div key={q.id} className={`bg-white rounded-[2.5rem] p-10 border-2 transition-all ${isCorrect ? 'border-emerald-100 shadow-emerald-50' : 'border-rose-100 shadow-rose-50'} shadow-xl`}>
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                                                            {idx + 1}
                                                        </div>
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isCorrect ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {isCorrect ? 'Correct Response' : 'Incorrect Response'}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{q.marks} Mark(s)</span>
                                                </div>
                                                <p className="text-xl font-bold text-slate-900 leading-relaxed mb-8">{q.question_text}</p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                                    {q.options?.map((opt: any) => {
                                                        const isSelected = studentAns === opt.id;
                                                        const isCorrectOpt = q.correct_answer === opt.id;
                                                        let style = 'bg-slate-50 border-slate-50 text-slate-600';
                                                        if (isCorrectOpt) style = 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold';
                                                        else if (isSelected && !isCorrectOpt) style = 'bg-rose-50 border-rose-200 text-rose-700 font-bold';
                                                        return (
                                                            <div key={opt.id} className={`p-5 rounded-2xl border text-sm flex items-center gap-4 ${style}`}>
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border-2 ${isCorrectOpt ? 'bg-emerald-600 border-emerald-600 text-white' : isSelected ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                                                                    {opt.id?.toUpperCase() || '?'}
                                                                </div>
                                                                <span>{opt.text}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                {q.explanation && (
                                                    <div className="mt-8 p-8 bg-indigo-50/50 rounded-3xl border border-indigo-100 flex gap-5">
                                                        <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg">
                                                            <Info className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Conceptual Clarification</p>
                                                            <p className="text-sm font-medium text-slate-700 leading-relaxed italic">"{q.explanation}"</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-slate-50 overflow-hidden select-none">
            {/* Top Navigation / Status Bar */}
            <div className="bg-slate-900 text-white px-8 py-4 flex items-center justify-between shadow-2xl z-40">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 pr-6 border-r border-slate-700">
                        <button
                            onClick={toggleFullScreen}
                            className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                            title="Toggle Fullscreen"
                        >
                            <Maximize2 className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-sm font-black uppercase tracking-widest">{exam?.name}</h1>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">Official Examination Environment</p>
                        </div>
                    </div>

                    {/* Section Switcher */}
                    <div className="flex items-center gap-1">
                        {sections.map(s => {
                            const isLocked = completedSectionIds.includes(s.id);
                            return (
                                <button
                                    key={s.id}
                                    disabled={isLocked}
                                    onClick={() => {
                                        setActiveSectionId(s.id);
                                        setActiveQuestionIdx(0);
                                    }}
                                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSectionId === s.id ? 'bg-white text-slate-900 shadow-xl scale-105' : isLocked ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white'}`}
                                >
                                    {s.name}
                                    {isLocked && <span className="ml-2">🔒</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className={`flex items-center gap-3 px-6 py-2.5 rounded-2xl border-2 transition-all ${timeLeft < 300 ? 'bg-rose-500/20 border-rose-500 animate-pulse text-rose-400' : 'bg-slate-800 border-slate-700 text-indigo-400'}`}>
                        <Clock className="w-5 h-5" />
                        <div className="flex flex-col items-start leading-none">
                            <span className="text-xl font-black font-mono tracking-widest">{formatTime(timeLeft)}</span>
                            {sectionTimeLeft !== null && (
                                <span className="text-[8px] font-black uppercase tracking-tighter text-rose-400 mt-1">Section: {formatTime(sectionTimeLeft)}</span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            if (confirm('Finish and submit your exam? This cannot be undone.')) finalizeAttempt(attemptId!);
                        }}
                        className="px-8 py-3 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all shadow-xl active:scale-95"
                    >
                        Finish Test
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Passage Side Area (conditionally shown) */}
                {activeQuestion?.passage_id && passages[activeQuestion.passage_id] && (
                    <div className="w-1/2 overflow-y-auto bg-slate-50 p-10 border-r border-slate-100 animate-in slide-in-from-left duration-500 custom-scrollbar">
                        <div className="max-w-prose mx-auto py-10">
                            {passages[activeQuestion.passage_id].title && (
                                <h1 className="text-3xl font-black text-slate-900 mb-8 leading-tight">{passages[activeQuestion.passage_id].title}</h1>
                            )}
                            <div className="prose prose-slate prose-lg max-w-none text-slate-700 font-medium leading-[2.2] whitespace-pre-wrap">
                                {passages[activeQuestion.passage_id].content}
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar relative bg-white">
                    {activeQuestion ? (
                        <div className={`max-w-4xl mx-auto ${activeQuestion.passage_id ? 'w-full' : ''}`}>
                            <div className="flex items-center gap-4 mb-10">
                                <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg">
                                    {activeQuestionIdx + 1}
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Question Workspace</h4>
                                    <p className="text-xs font-bold text-slate-400">{activeQuestion.marks} Mark(s) Assigned</p>
                                </div>
                            </div>

                            <div className="space-y-10">
                                <div className="prose prose-slate max-w-none">
                                    <p className="text-2xl font-black text-slate-800 leading-relaxed">
                                        {activeQuestion.question_text}
                                    </p>
                                </div>

                                {activeQuestion.image_url && (
                                    <div className={`relative rounded-[3rem] overflow-hidden border-4 border-white shadow-2xl transition-all duration-500 ${isZoomed ? 'scale-150 z-50 fixed inset-10 bg-white/20 backdrop-blur-md' : 'w-full max-w-lg'}`}>
                                        <img
                                            src={activeQuestion.image_url}
                                            alt="Figure"
                                            className={`w-full h-auto cursor-zoom-in rounded-[2.5rem] ${isZoomed ? 'h-full object-contain' : ''}`}
                                            onClick={() => setIsZoomed(!isZoomed)}
                                        />
                                        <button
                                            onClick={() => setIsZoomed(!isZoomed)}
                                            className="absolute top-6 right-6 p-4 bg-white/90 backdrop-blur rounded-2xl shadow-xl text-slate-900"
                                        >
                                            <ZoomIn className="w-6 h-6" />
                                        </button>
                                    </div>
                                )}

                                {/* Options & Response Area */}
                                <div className="space-y-10">
                                    {(activeQuestion.question_type === 'mcq_single' || activeQuestion.question_type === 'mcq_multiple') && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {activeQuestion.options.map((opt: any) => {
                                                const isSelected = activeQuestion.question_type === 'mcq_single'
                                                    ? answers[activeQuestion.id] === opt.id
                                                    : (answers[activeQuestion.id] || []).includes(opt.id);

                                                return (
                                                    <button
                                                        key={opt.id}
                                                        onClick={() => {
                                                            if (activeQuestion.question_type === 'mcq_single') {
                                                                handleAnswer(activeQuestion.id, opt.id);
                                                            } else {
                                                                const current = answers[activeQuestion.id] || [];
                                                                const next = current.includes(opt.id)
                                                                    ? current.filter((i: any) => i !== opt.id)
                                                                    : [...current, opt.id];
                                                                handleAnswer(activeQuestion.id, next);
                                                            }
                                                        }}
                                                        className={`p-6 rounded-[2rem] border-2 text-left transition-all flex items-center gap-5 group ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl shadow-indigo-200' : 'bg-white border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50'}`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black text-xs transition-all ${isSelected ? 'bg-white text-indigo-600 border-white' : 'bg-slate-50 text-slate-400 border-slate-200 group-hover:bg-white group-hover:text-indigo-600 group-hover:border-indigo-600'}`}>
                                                            {opt.id.toUpperCase()}
                                                        </div>
                                                        <span className="text-sm font-bold">{opt.text}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {activeQuestion.question_type === 'true_false' && (
                                        <div className="flex gap-6">
                                            {['true', 'false'].map((val) => (
                                                <button
                                                    key={val}
                                                    onClick={() => handleAnswer(activeQuestion.id, val)}
                                                    className={`flex-1 py-8 rounded-[2.5rem] border-2 font-black text-sm uppercase tracking-widest transition-all ${answers[activeQuestion.id] === val ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl shadow-indigo-200' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
                                                >
                                                    {val}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {activeQuestion.question_type === 'numerical' && (
                                        <div className="max-w-md">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Numerical Response</label>
                                            <input
                                                type="text"
                                                className="w-full p-8 bg-white border-2 border-slate-100 rounded-[2.5rem] outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 font-black text-2xl text-slate-900 shadow-sm"
                                                placeholder="Enter value..."
                                                value={answers[activeQuestion.id] || ''}
                                                onChange={(e) => handleAnswer(activeQuestion.id, e.target.value)}
                                            />
                                        </div>
                                    )}

                                    {activeQuestion.question_type === 'essay' && (
                                        <div className="space-y-4">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Essay / Long Answer</label>
                                            <textarea
                                                className="w-full p-8 bg-white border-2 border-slate-100 rounded-[2.5rem] outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 font-bold text-lg text-slate-700 shadow-sm min-h-[400px] leading-relaxed"
                                                placeholder="Begin typing your response here..."
                                                value={answers[activeQuestion.id] || ''}
                                                onChange={(e) => handleAnswer(activeQuestion.id, e.target.value)}
                                            />
                                            <div className="flex justify-between items-center px-4">
                                                <div className="bg-slate-900 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                                                    Word Count: {(answers[activeQuestion.id] || '').trim() ? (answers[activeQuestion.id] || '').trim().split(/\s+/).length : 0}
                                                </div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your progress is saved automatically</p>
                                            </div>
                                        </div>
                                    )}

                                    {activeQuestion.question_type === 'passage' && (
                                        <div className="py-20 text-center">
                                            <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-indigo-600 shadow-inner">
                                                <Search className="w-10 h-10" />
                                            </div>
                                            <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter">Read Carefully</h3>
                                            <p className="text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
                                                This section contains a reading passage or context. Please review the content on the left, then click
                                                <span className="font-black text-slate-900 mx-1">Save & Next</span>
                                                to proceed to the questions.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Navigation Controls */}
                            <div className="max-w-4xl mx-auto mt-20 flex justify-between items-center border-t border-slate-200 pt-10 px-4">
                                <button
                                    disabled={activeQuestionIdx === 0}
                                    onClick={() => setActiveQuestionIdx(prev => prev - 1)}
                                    className="flex items-center gap-3 px-8 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:grayscale transition-all"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                    Previous
                                </button>
                                <button
                                    onClick={() => {
                                        if (activeQuestionIdx < currentSectionQuestions.length - 1) {
                                            setActiveQuestionIdx(prev => prev + 1);
                                        } else {
                                            if (confirm(`Do you want to finish ${sections.find(s => s.id === activeSectionId)?.name} and proceed? You won't be able to return to this section.`)) {
                                                handleFinishSection(activeSectionId!);
                                            }
                                        }
                                    }}
                                    className="flex items-center gap-3 px-10 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl active:scale-95"
                                >
                                    {activeQuestionIdx < currentSectionQuestions.length - 1 ? 'Save & Next' : 'Finish Section'}
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 font-black uppercase tracking-widest">
                            No questions selected...
                        </div>
                    )}
                </div>

                {/* Right Sidebar - Palette */}
                <div className="w-96 bg-white border-l border-slate-200 flex flex-col shadow-inner">
                    <div className="p-8 border-b border-slate-50">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Question Navigator</h4>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-indigo-600 rounded-sm" />
                                <span className="text-[9px] font-black text-slate-500 uppercase">Answered</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-slate-100 border border-slate-200 rounded-sm" />
                                <span className="text-[9px] font-black text-slate-500 uppercase">Pending</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <div className="grid grid-cols-4 gap-4">
                            {currentSectionQuestions.map((q, idx) => {
                                const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '';
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => setActiveQuestionIdx(idx)}
                                        className={`w-full aspect-square rounded-xl flex items-center justify-center text-xs font-black border-2 transition-all ${activeQuestionIdx === idx ? 'scale-110 shadow-lg border-slate-900 bg-slate-900 text-white' :
                                            isAnswered ? 'bg-indigo-50 border-indigo-200 text-indigo-600' :
                                                'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                                            }`}
                                    >
                                        {idx + 1}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Overall Progress</span>
                                <span className="text-xs font-black text-slate-900">
                                    {Math.round((Object.keys(answers).length / questions.length) * 100)}%
                                </span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-600 transition-all duration-1000"
                                    style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isTimeUpModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-xl p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-12 text-center">
                            <div className="w-24 h-24 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                                <Clock className="w-12 h-12" />
                            </div>
                            <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Time Exhausted</h2>
                            <p className="text-slate-500 font-medium leading-relaxed mb-10 px-4">
                                The allocated duration for this session has reached zero. {exam?.allow_continue_after_time_up ? 'You may continue your effort, but a late submission flag will be appended.' : 'The system will now securely transmit your current responses.'}
                            </p>

                            <div className="flex flex-col gap-4">
                                {exam?.allow_continue_after_time_up && (
                                    <button
                                        onClick={() => setIsTimeUpModalOpen(false)}
                                        className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-xl active:scale-95"
                                    >
                                        Continue Effort (Mark Lated)
                                    </button>
                                )}
                                <button
                                    onClick={() => finalizeAttempt(attemptId!)}
                                    className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95"
                                >
                                    Finish & Submit Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
