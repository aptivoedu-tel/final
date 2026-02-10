'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { AuthService } from '@/lib/services/authService';
import {
    Clock, ChevronLeft, ChevronRight, X, AlertCircle,
    CheckCircle, Flag, Info, Maximize2, ZoomIn, Search, Layers, GraduationCap, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { useLoading } from '@/lib/context/LoadingContext';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';


interface Exam {
    id: number;
    name: string;
    exam_type: string;
    total_duration: number;
    allow_continue_after_time_up: boolean;
    auto_submit: boolean;
    negative_marking?: number;
    start_time?: string;
    end_time?: string;
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
    const { setLoading: setGlobalLoading } = useLoading();

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
    const [showNavMatrix, setShowNavMatrix] = useState(false);

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
            setGlobalLoading(true, 'Initializing Exam Session...');
            await loadExamData(u.id);
        };

        init();
    }, []);

    const loadExamData = async (userId: string) => {
        try {
            const { data: ex, error: exError } = await supabase.from('university_exams').select('*').eq('id', Number(examId)).single();
            if (exError) throw new Error(`Fetch Exam Error: ${exError.message} (${exError.details || exError.hint || exError.code})`);
            if (!ex) throw new Error('Exam not found');
            setExam(ex);

            const { data: sects, error: sectsError } = await supabase.from('exam_sections').select('*').eq('exam_id', Number(examId)).order('order_index');
            if (sectsError) throw new Error(`Fetch Sections Error: ${sectsError.message}`);
            setSections(sects || []);
            const firstSect = sects?.[0];
            setActiveSectionId(firstSect?.id || null);
            if (firstSect?.section_duration) {
                setSectionTimeLeft(firstSect.section_duration * 60);
            }

            const { data: qs, error: qsError } = await supabase.from('exam_questions').select('*').in('section_id', (sects || []).map(s => s.id)).order('order_index');
            if (qsError) throw new Error(`Fetch Questions Error: ${qsError.message}`);
            setQuestions(qs || []);

            // Fetch any linked passages
            const pIds = (qs || []).map(q => q.passage_id).filter(Boolean);
            if (pIds.length > 0) {
                const { data: ps, error: psError } = await supabase.from('passages').select('*').in('id', pIds);
                if (psError) console.error('Error fetching passages:', psError); // Non-critical
                const pMap: Record<number, Passage> = {};
                ps?.forEach(p => pMap[p.id] = p);
                setPassages(pMap);
            }

            await handleAttemptSession(userId, ex);
            setGlobalLoading(false);
        } catch (err: any) {
            console.error('Exam initialization failed:', err);
            toast.error(`Session Error: ${err.message || JSON.stringify(err)}`);
            setGlobalLoading(false);
        }
    };


    const handleAttemptSession = async (userId: string, ex: Exam) => {
        // Time Window Check
        const now = new Date();
        if (ex.start_time && new Date(ex.start_time) > now) {
            toast.error("This exam has not started yet.");
            throw new Error(`Exam starts at ${new Date(ex.start_time).toLocaleString()}`);
        }

        const { data: existing, error: existingError } = await supabase
            .from('exam_attempts')
            .select('*')
            .eq('student_id', userId)
            .eq('exam_id', Number(ex.id))
            .maybeSingle();

        if (existingError) {
            console.error("[AttemptSession] Fetch error:", existingError);
            throw existingError;
        }

        // Check End Time compliance
        if (ex.end_time && new Date(ex.end_time) < now) {
            // Exam window has passed
            if (!existing || existing.status === 'completed') {
                throw new Error(`Exam ended at ${new Date(ex.end_time).toLocaleString()}`);
            }
            // If in_progress, allow them to continue/finish
        }

        if (existing && existing.status === 'in_progress') {
            setAttemptId(existing.id);
            const { data: ans } = await supabase.from('exam_answers').select('*').eq('attempt_id', existing.id);
            const ansMap: any = {};
            ans?.forEach(a => ansMap[a.question_id] = a.answer);
            setAnswers(ansMap);

            const startTimeStr = existing.start_time || existing.created_at;
            const startTime = new Date(startTimeStr).getTime();
            const currentTime = new Date().getTime();
            const elapsed = Math.floor((currentTime - startTime) / 1000);
            const totalSecs = (ex.total_duration || 1) * 60;
            const remaining = totalSecs - elapsed;

            if (remaining <= 0 && !ex.allow_continue_after_time_up) {
                await finalizeAttempt(existing.id);
            } else {
                setTimeLeft(remaining > 0 ? remaining : 0);
            }
        } else if (existing && existing.status === 'completed') {
            setAttemptId(existing.id);
            setResults({ score: existing.score, total: existing.total_marks });
            setStatus('completed');

            const { data: ans } = await supabase.from('exam_answers').select('*').eq('attempt_id', existing.id);
            const ansMap: any = {};
            ans?.forEach(a => ansMap[a.question_id] = a.answer);
            setAnswers(ansMap);
            setTimeLeft(0);
        } else {
            const { data: newAtt, error } = await supabase
                .from('exam_attempts')
                .insert([{
                    student_id: userId,
                    exam_id: Number(ex.id),
                    status: 'in_progress',
                    start_time: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) {
                console.error("[AttemptSession] Create failed:", error);
                throw new Error(`Sync Error: ${error.message}`);
            }
            setAttemptId(newAtt.id);
            setTimeLeft((ex.total_duration || 1) * 60);
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
        setGlobalLoading(true, 'Calculating Results & Finalizing Session...');

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
            setTimeout(() => setGlobalLoading(false), 1500);
        }
    };



    if (status === 'completed') {

        const scorePercentage = results ? Math.round((results.score / results.total) * 100) : 0;
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col p-8 md:p-12 overflow-y-auto custom-scrollbar">
                <div className="max-w-5xl mx-auto w-full">
                    <div className="bg-white rounded-[3rem] p-12 shadow-2xl border border-slate-100 mb-12 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                            <div className="text-center md:text-left">
                                <h1 className="text-[10px] font-black text-teal-600 uppercase tracking-[0.3em] mb-4">Official Result Summary</h1>
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
                                        stroke="#0d9488"
                                        strokeWidth="12"
                                        strokeDasharray={`${(scorePercentage * 527) / 100} 527`}
                                        strokeLinecap="round"
                                        className="transition-all duration-[2s] ease-out"
                                    />
                                </svg>
                                <span className="text-5xl font-black text-teal-600 relative">{scorePercentage}%</span>
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
                                                    {q.options?.map((opt: any, optIdx: number) => {
                                                        const normalizedOpt = typeof opt === 'string'
                                                            ? { id: (optIdx + 1).toString(), text: opt }
                                                            : opt;
                                                        const isSelected = studentAns?.toString() === normalizedOpt.id?.toString();
                                                        const isCorrectOpt = q.correct_answer?.toString() === normalizedOpt.id?.toString();

                                                        let style = 'bg-slate-50 border-slate-50 text-slate-600';
                                                        if (isCorrectOpt) style = 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold';
                                                        else if (isSelected && !isCorrectOpt) style = 'bg-rose-50 border-rose-200 text-rose-700 font-bold';

                                                        return (
                                                            <div key={optIdx} className={`p-5 rounded-2xl border text-sm flex items-center gap-4 ${style}`}>
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border-2 ${isCorrectOpt ? 'bg-emerald-600 border-emerald-600 text-white' : isSelected ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                                                                    {String.fromCharCode(65 + optIdx)}
                                                                </div>
                                                                <span>{normalizedOpt.text}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                {q.explanation && (
                                                    <div className="mt-8 p-8 bg-teal-50/50 rounded-3xl border border-teal-100 flex gap-5">
                                                        <div className="w-10 h-10 bg-teal-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg">
                                                            <Info className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-1">Conceptual Clarification</p>
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
        <div className="h-screen flex flex-col bg-[#f8fafc] overflow-hidden select-none font-sans">
            {/* Top Navigation / Status Bar - SLEEK DARK THEME */}
            <div className="bg-[#0f172a] text-white px-3 md:px-10 h-16 lg:h-20 flex items-center justify-between shadow-2xl z-40 relative gap-2">
                <div className="absolute bottom-0 left-0 h-[0.5px] bg-gradient-to-r from-transparent via-teal-500/30 to-transparent w-full" />

                <div className="flex items-center gap-2 lg:gap-10 overflow-hidden">
                    <div className="flex items-center gap-2 lg:gap-5 lg:pr-8 lg:border-r lg:border-slate-800 shrink-0">
                        <div className="w-8 h-8 lg:w-12 lg:h-12 bg-teal-600 rounded-lg lg:rounded-2xl flex items-center justify-center shadow-lg shadow-teal-900/40 border border-teal-500/30 shrink-0">
                            <GraduationCap className="w-4 h-4 lg:w-6 lg:h-6 text-white" />
                        </div>
                        <div className="min-w-0 max-w-[80px] sm:max-w-none">
                            <h1 className="text-[10px] lg:text-sm font-black uppercase tracking-widest text-slate-100 truncate">
                                {exam?.name === 'testing' ? 'University Exam' : exam?.name || 'Exam'}
                            </h1>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="w-1 h-1 bg-teal-500 rounded-full animate-pulse" />
                                <p className="text-[8px] lg:text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Live</p>
                            </div>
                        </div>
                    </div>

                    {/* Section Switcher - Scrollable horizontal on mobile */}
                    <div className="flex items-center gap-1 lg:gap-1.5 bg-slate-900/50 p-1 rounded-xl border border-slate-800 overflow-x-auto no-scrollbar max-w-[100px] sm:max-w-none">
                        {sections.map(s => {
                            const isLocked = completedSectionIds.includes(s.id);
                            const isActive = activeSectionId === s.id;
                            return (
                                <button
                                    key={s.id}
                                    disabled={isLocked}
                                    onClick={() => {
                                        setActiveSectionId(s.id);
                                        setActiveQuestionIdx(0);
                                    }}
                                    className={`
                                        px-3 lg:px-6 py-1.5 lg:py-2 rounded-lg lg:rounded-xl text-[8px] lg:text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden group whitespace-nowrap
                                        ${isActive
                                            ? 'bg-white text-slate-900 shadow-xl'
                                            : isLocked
                                                ? 'text-slate-600 cursor-not-allowed opacity-50'
                                                : 'text-slate-500 hover:text-white hover:bg-white/5'
                                        }
                                    `}
                                >
                                    <span className="relative z-10 flex items-center gap-1">
                                        {isActive && <div className="w-1 h-1 bg-teal-600 rounded-full sm:hidden" />}
                                        {s.name}
                                        {isLocked && <span className="text-[8px]">🔒</span>}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center gap-2 lg:gap-6 shrink-0">
                    {/* Timer */}
                    <div className={`flex items-center gap-2 lg:gap-3 px-3 lg:px-5 py-1.5 lg:py-2.5 rounded-lg lg:rounded-2xl border transition-all ${timeLeft < 300 ? 'bg-rose-500/10 border-rose-500/50 text-rose-500' : 'bg-slate-900 border-slate-800 text-teal-400'}`}>
                        <Clock className={`w-3.5 h-3.5 lg:w-5 lg:h-5 ${timeLeft < 300 ? 'animate-pulse' : ''}`} />
                        <span className="text-sm lg:text-xl font-black font-mono tracking-wider">{formatTime(timeLeft)}</span>
                    </div>

                    <button
                        onClick={() => {
                            if (confirm('Finish and submit your exam? This cannot be undone.')) finalizeAttempt(attemptId!);
                        }}
                        className="px-4 lg:px-8 py-2 lg:py-4 bg-teal-600 text-white rounded-lg lg:rounded-2xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 transition-all shadow-lg active:scale-95 shrink-0"
                    >
                        Finalize
                    </button>

                    {/* Mobile Menu Toggle for Nav Matrix */}
                    <button
                        onClick={() => setShowNavMatrix(prev => !prev)}
                        className="lg:hidden p-2 bg-slate-800 rounded-lg text-white"
                    >
                        <Layers className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Main Content Area - Clean Workspace */}
                <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar relative bg-[#fcfdfe] flex flex-col">
                    {activeQuestion ? (
                        <div className="w-full mx-auto my-auto py-10 px-4">
                            <div className="flex items-center gap-4 mb-8 lg:mb-10">
                                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-slate-900 text-white rounded-xl lg:rounded-2xl flex items-center justify-center font-black text-lg lg:text-xl shadow-lg shrink-0">
                                    {activeQuestionIdx + 1}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-[9px] lg:text-[10px] font-black text-teal-600 uppercase tracking-widest flex flex-wrap items-center gap-2">
                                        <span>Question Workspace</span>
                                        <span className="w-1 h-1 bg-teal-200 rounded-full hidden sm:inline" />
                                        <span className="bg-teal-50 px-2 py-0.5 rounded text-teal-700">{sections.find(s => s.id === activeSectionId)?.name}</span>
                                    </h4>
                                    <p className="text-[10px] lg:text-xs font-bold text-slate-400 mt-0.5 text-wrap">{activeQuestion.marks} Mark(s) • Correct Option Required</p>
                                </div>
                            </div>

                            <div className="space-y-8 lg:space-y-10">
                                <div className="prose prose-slate max-w-none">
                                    <div className="text-xl lg:text-3xl font-bold text-slate-900 leading-snug tracking-tight">
                                        <MarkdownRenderer content={activeQuestion.question_text} />
                                    </div>
                                </div>

                                {activeQuestion.image_url && (
                                    <div className={`relative rounded-3xl lg:rounded-[3rem] overflow-hidden border-4 border-white shadow-2xl transition-all duration-500 ${isZoomed ? 'scale-100 z-50 fixed inset-0 lg:inset-10 bg-white' : 'w-full max-w-lg'}`}>
                                        <img
                                            src={activeQuestion.image_url}
                                            alt="Figure"
                                            className={`w-full h-auto cursor-zoom-in rounded-3xl lg:rounded-[2.5rem] ${isZoomed ? 'h-full object-contain' : ''}`}
                                            onClick={() => setIsZoomed(!isZoomed)}
                                        />
                                        <button
                                            onClick={() => setIsZoomed(!isZoomed)}
                                            className="absolute top-4 right-4 lg:top-6 lg:right-6 p-3 lg:p-4 bg-white/90 backdrop-blur rounded-xl lg:rounded-2xl shadow-xl text-slate-900"
                                        >
                                            {isZoomed ? <X className="w-5 h-5 lg:w-6 lg:h-6" /> : <ZoomIn className="w-5 h-5 lg:w-6 lg:h-6" />}
                                        </button>
                                    </div>
                                )}

                                {/* Options & Response Area */}
                                <div className="space-y-6 lg:space-y-10">
                                    {(activeQuestion.question_type === 'mcq_single' || activeQuestion.question_type === 'mcq_multiple') && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                                            {activeQuestion.options?.map((opt: any, optIdx: number) => {
                                                const normalizedOpt = typeof opt === 'string'
                                                    ? { id: (optIdx + 1).toString(), text: opt }
                                                    : opt;

                                                const isSelected = activeQuestion.question_type === 'mcq_single'
                                                    ? (answers[activeQuestion.id] !== undefined && answers[activeQuestion.id]?.toString() === normalizedOpt.id?.toString())
                                                    : (answers[activeQuestion.id] || []).map((id: any) => id?.toString()).includes(normalizedOpt.id?.toString());

                                                return (
                                                    <button
                                                        key={optIdx}
                                                        onClick={() => {
                                                            if (activeQuestion.question_type === 'mcq_single') {
                                                                handleAnswer(activeQuestion.id, normalizedOpt.id);
                                                            } else {
                                                                const current = answers[activeQuestion.id] || [];
                                                                const next = current.includes(normalizedOpt.id)
                                                                    ? current.filter((i: any) => i !== normalizedOpt.id)
                                                                    : [...current, normalizedOpt.id];
                                                                handleAnswer(activeQuestion.id, next);
                                                            }
                                                        }}
                                                        className={`p-5 lg:p-7 rounded-2xl lg:rounded-[2.5rem] border-2 text-left transition-all flex items-center gap-4 lg:gap-6 group ${isSelected ? 'bg-teal-600 border-teal-600 text-white shadow-2xl shadow-teal-100' : 'bg-white border-slate-100 hover:border-teal-200 hover:bg-teal-50/30'}`}
                                                    >
                                                        <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-xl lg:rounded-2xl border-2 flex items-center justify-center font-black text-xs lg:text-sm transition-all ${isSelected ? 'bg-white text-teal-600 border-white shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-200 group-hover:bg-white group-hover:text-teal-600 group-hover:border-teal-600'}`}>
                                                            {String.fromCharCode(65 + optIdx)}
                                                        </div>
                                                        <div className="text-sm lg:text-base font-semibold">
                                                            <MarkdownRenderer content={normalizedOpt.text} />
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {activeQuestion.question_type === 'true_false' && (
                                        <div className="flex flex-col sm:flex-row gap-4 lg:gap-6">
                                            {['true', 'false'].map((val) => (
                                                <button
                                                    key={val}
                                                    onClick={() => handleAnswer(activeQuestion.id, val)}
                                                    className={`flex-1 py-6 lg:py-8 rounded-2xl lg:rounded-[2.5rem] border-2 font-black text-xs lg:text-sm uppercase tracking-widest transition-all ${answers[activeQuestion.id] === val ? 'bg-teal-600 border-teal-600 text-white shadow-2xl shadow-teal-200' : 'bg-white border-slate-100 hover:border-teal-200'}`}
                                                >
                                                    {val}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {activeQuestion.question_type === 'numerical' && (
                                        <div className="max-w-md">
                                            <label className="block text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Numerical Response</label>
                                            <input
                                                type="text"
                                                className="w-full p-6 lg:p-10 bg-white border-2 border-slate-100 rounded-2xl lg:rounded-[3rem] outline-none focus:border-teal-600 focus:ring-[8px] lg:focus:ring-[12px] focus:ring-teal-600/5 font-black text-2xl lg:text-4xl text-slate-900 shadow-sm transition-all"
                                                placeholder="0.00"
                                                value={answers[activeQuestion.id] || ''}
                                                onChange={(e) => handleAnswer(activeQuestion.id, e.target.value)}
                                            />
                                        </div>
                                    )}

                                    {(activeQuestion.question_type === 'essay' || activeQuestion.question_type === 'short_answer') && (
                                        <div className="space-y-4">
                                            <label className="block text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                                                {activeQuestion.question_type === 'essay' ? 'Essay / Long Answer' : 'Short Answer Response'}
                                            </label>
                                            <textarea
                                                className={`w-full p-6 lg:p-8 bg-white border-2 border-slate-100 rounded-2xl lg:rounded-[2.5rem] outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 font-bold text-base lg:text-lg text-slate-700 shadow-sm leading-relaxed ${activeQuestion.question_type === 'essay' ? 'min-h-[300px] lg:min-h-[400px]' : 'min-h-[150px] lg:min-h-[200px]'}`}
                                                placeholder="Begin typing your response here..."
                                                value={answers[activeQuestion.id] || ''}
                                                onChange={(e) => handleAnswer(activeQuestion.id, e.target.value)}
                                            />
                                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-4">
                                                <div className="bg-slate-900 text-white px-6 py-2 rounded-full text-[9px] lg:text-[10px] font-black uppercase tracking-widest shadow-lg">
                                                    Word Count: {(answers[activeQuestion.id] || '').trim() ? (answers[activeQuestion.id] || '').trim().split(/\s+/).length : 0}
                                                </div>
                                                <p className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress saved automatically</p>
                                            </div>
                                        </div>
                                    )}

                                    {activeQuestion.question_type === 'fill_blank' && (
                                        <div className="max-w-xl">
                                            <label className="block text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Missing Words</label>
                                            <input
                                                type="text"
                                                className="w-full p-6 lg:p-8 bg-white border-2 border-slate-100 rounded-2xl lg:rounded-[2.5rem] outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 font-black text-lg lg:text-xl text-slate-900 shadow-sm transition-all"
                                                placeholder="Enter the missing content..."
                                                value={answers[activeQuestion.id] || ''}
                                                onChange={(e) => handleAnswer(activeQuestion.id, e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Navigation Controls */}
                            <div className="max-w-4xl mx-auto mt-12 lg:mt-20 flex flex-col sm:flex-row justify-between items-center gap-6 border-t border-slate-200 pt-8 lg:pt-10 px-4">
                                <button
                                    disabled={activeQuestionIdx === 0}
                                    onClick={() => setActiveQuestionIdx(prev => prev - 1)}
                                    className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-white border border-slate-200 rounded-2xl text-[10px] lg:text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:grayscale transition-all"
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
                                    className="w-full sm:w-auto flex items-center justify-center gap-4 px-10 lg:px-12 py-4 lg:py-5 bg-[#0f172a] text-white rounded-2xl lg:rounded-[2rem] text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] hover:bg-teal-600 transition-all shadow-2xl shadow-slate-200 active:scale-95 group"
                                >
                                    {activeQuestionIdx < currentSectionQuestions.length - 1 ? 'Save & Next' : 'Finish Section'}
                                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 font-black uppercase tracking-widest">
                            No questions selected...
                        </div>
                    )}
                </div>

                {/* Right Sidebar - Navigation Matrix (Responsive Drawer/Sidebar) */}
                <div className={`
                    w-full lg:w-[380px] bg-white border-t lg:border-t-0 lg:border-l border-slate-100 flex flex-col z-50 
                    fixed inset-x-0 bottom-0 lg:relative lg:translate-y-0 transition-transform duration-300 ease-in-out
                    ${showNavMatrix ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
                    lg:flex max-h-[70vh] lg:max-h-none overflow-hidden shadow-2xl lg:shadow-none
                `}>
                    <div className="p-4 lg:p-10 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                        <div className="flex flex-col">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Navigation Matrix</h4>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 bg-teal-600 rounded-full" />
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Logged</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 bg-slate-100 border border-slate-300 rounded-full" />
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Pending</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowNavMatrix(false)}
                            className="lg:hidden p-2 text-slate-400 hover:text-slate-900"
                        >
                            <ChevronDown className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar">
                        <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-5 gap-2 lg:gap-3">
                            {currentSectionQuestions.map((q, idx) => {
                                const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '';
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => {
                                            setActiveQuestionIdx(idx);
                                            if (window.innerWidth < 1024) setShowNavMatrix(false);
                                        }}
                                        className={`w-full aspect-square rounded-xl lg:rounded-2xl flex items-center justify-center text-[10px] font-black border-2 transition-all relative
                                            ${activeQuestionIdx === idx
                                                ? 'scale-110 shadow-2xl z-10 border-slate-900 bg-slate-900 text-white'
                                                : isAnswered
                                                    ? 'bg-teal-50 border-teal-100 text-teal-700 hover:border-teal-300'
                                                    : 'bg-white border-slate-50 text-slate-400 hover:bg-slate-50 hover:border-slate-200'
                                            }`}
                                    >
                                        {idx + 1}
                                        {isAnswered && activeQuestionIdx !== idx && (
                                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-teal-500 rounded-full border-2 border-white" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-4 lg:p-10 bg-slate-50/50 border-t border-slate-100">
                        <div className="p-4 lg:p-8 bg-white rounded-2xl lg:rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                            <div className="flex items-center justify-between mb-2 lg:mb-4">
                                <span className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">Overall Progress</span>
                                <span className="text-sm lg:text-xl font-black text-teal-600">
                                    {questions.length > 0 ? Math.round((Object.keys(answers).length / questions.length) * 100) : 0}%
                                </span>
                            </div>
                            <div className="w-full h-1.5 lg:h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-teal-600 rounded-full transition-all duration-1000"
                                    style={{ width: `${questions.length > 0 ? (Object.keys(answers).length / questions.length) * 100 : 0}%` }}
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
                                        className="w-full py-5 bg-teal-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-teal-700 transition-all shadow-xl active:scale-95"
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
