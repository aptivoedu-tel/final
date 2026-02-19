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
    const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>({});
    const [visitedQuestions, setVisitedQuestions] = useState<Record<number, boolean>>({});

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
            console.log("[loadExamData] Starting fetch for Exam ID:", examId);
            const { data: ex, error: exError } = await supabase.from('university_exams').select('*').eq('id', Number(examId)).single();
            if (exError) {
                console.error("[loadExamData] Exam fetch error:", exError);
                throw new Error(`Fetch Exam Error: ${exError.message} (${exError.code})`);
            }
            if (!ex) throw new Error('Exam not found');
            setExam(ex);
            console.log("[loadExamData] Exam found:", ex.name);

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
            console.error('Exam initialization failed details:', {
                message: err.message,
                stack: err.stack,
                code: err.code,
                errorObject: err // For deep inspection in dev tools
            });
            toast.error(`Session Error: ${err.message || 'Unknown error'}`);
            setGlobalLoading(false);
        }
    };


    const handleAttemptSession = async (userId: string, ex: Exam) => {
        console.log("[AttemptSync] Initializing session check for Exam:", ex.name, "(ID:", ex.id, ")");
        console.log("[AttemptSync] total_duration:", ex.total_duration);

        // Time Window Check
        const now = new Date();
        if (ex.start_time && new Date(ex.start_time) > now) {
            console.warn("[AttemptSync] Exam not started yet. Starts at:", ex.start_time);
            toast.error("This exam has not started yet.");
            throw new Error(`Exam starts at ${new Date(ex.start_time).toLocaleString()}`);
        }

        console.log("[AttemptSync] Fetching existing attempt for Student:", userId);
        const { data: existing, error: existingError } = await supabase
            .from('exam_attempts')
            .select('*')
            .eq('student_id', userId)
            .eq('exam_id', Number(ex.id))
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (existingError) {
            console.error("[AttemptSync] Fetch error:", JSON.stringify(existingError, null, 2));
            throw new Error(`Attempt Sync Error: ${existingError.message}`);
        }

        console.log("[AttemptSync] Existing attempt result:", existing ? `Found (Status: ${existing.status})` : "None found");

        // Check End Time compliance
        if (ex.end_time && new Date(ex.end_time) < now) {
            const isFinishedOrEmpty = !existing || existing.status === 'completed';
            console.warn("[AttemptSync] Exam window passed. Finalized?", !isFinishedOrEmpty);
            if (isFinishedOrEmpty) {
                throw new Error(`Exam ended at ${new Date(ex.end_time).toLocaleString()}`);
            }
        }

        // Support both 'ongoing' and legacy 'in_progress' status
        const isOngoing = existing && (existing.status === 'ongoing' || existing.status === 'in_progress');

        if (isOngoing) {
            console.log("[AttemptSync] Resuming ongoing session:", existing.id);
            setAttemptId(existing.id);
            const { data: ans } = await supabase.from('exam_answers').select('*').eq('attempt_id', existing.id);
            const ansMap: any = {};
            ans?.forEach(a => ansMap[a.question_id] = a.answer);
            setAnswers(ansMap);

            const startTimeStr = existing.started_at || existing.created_at;
            const startTime = new Date(startTimeStr).getTime();
            const currentTime = new Date().getTime();
            const elapsed = Math.floor((currentTime - startTime) / 1000);
            const totalSecs = (ex.total_duration || 1) * 60;
            const remaining = totalSecs - elapsed;

            console.log("[AttemptSync] Calculation:", { totalSecs, elapsed, remaining });
            setTimeLeft(remaining > 0 ? remaining : 0);
        } else if (existing && existing.status === 'completed') {
            console.log("[AttemptSync] Viewing completed session:", existing.id);
            setAttemptId(existing.id);
            setResults({ score: existing.score, total: existing.total_marks });
            setStatus('completed');

            const { data: ans } = await supabase.from('exam_answers').select('*').eq('attempt_id', existing.id);
            const ansMap: any = {};
            ans?.forEach(a => ansMap[a.question_id] = a.answer);
            setAnswers(ansMap);
            setTimeLeft(0);
        } else {
            console.log("[AttemptSync] Creating fresh session...");
            const { data: newAtt, error } = await supabase
                .from('exam_attempts')
                .insert([{
                    student_id: userId,
                    exam_id: Number(ex.id),
                    status: 'ongoing',
                    started_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) {
                console.error("[AttemptSync] Creation failed:", JSON.stringify(error, null, 2));
                throw new Error(`Sync Error: ${error.message}`);
            }

            console.log("[AttemptSync] Fresh session created with ID:", newAtt.id);
            setAttemptId(newAtt.id);
            const initialTime = (ex.total_duration || 1) * 60;
            console.log("[AttemptSync] Setting initial time:", initialTime);
            setTimeLeft(initialTime);
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
        if (timeLeft < 0 || status === 'completed') return;

        console.log("[Timer] Starting/Restarting total timer at:", timeLeft);

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
    }, [timeLeft === -1, status, exam?.id, isTimeUpModalOpen]);
    // Optimization: timeLeft === -1 ensures it only starts once it's valid, 
    // but the ticking is handled by functional update so we don't need timeLeft in deps!

    const formatTime = (seconds: number) => {
        if (seconds < 0) return '--:--';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleAnswer = async (questionId: number, answer: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
        // Also ensure it's marked as visited when answered
        setVisitedQuestions(prev => ({ ...prev, [questionId]: true }));
        await supabase.from('exam_answers').upsert([{
            attempt_id: attemptId,
            question_id: questionId,
            answer: answer
        }], { onConflict: 'attempt_id, question_id' });
    };

    const toggleMarkForReview = (questionId: number) => {
        setMarkedForReview(prev => ({ ...prev, [questionId]: !prev[questionId] }));
    };

    useEffect(() => {
        if (activeQuestion) {
            setVisitedQuestions(prev => ({ ...prev, [activeQuestion.id]: true }));
        }
    }, [activeQuestion?.id]);

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
                completed_at: new Date().toISOString(),
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
        <div className="h-screen flex flex-col bg-white overflow-hidden font-sans text-slate-900">
            {/* TOP BAR */}
            <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-green-600 uppercase tracking-widest leading-none mb-1">
                            {exam?.name || 'University Exam'}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">LIVE</span>
                        </div>
                    </div>
                </div>

                {/* Section Selector Pills */}
                <div className="hidden md:flex items-center gap-2">
                    {sections.map((s) => {
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
                                className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isActive
                                    ? 'bg-green-600 text-white'
                                    : isLocked
                                        ? 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100'
                                        : 'bg-white text-slate-500 border border-slate-200 hover:border-green-600 hover:text-green-600'
                                    }`}
                            >
                                {s.name}
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-center gap-4">
                    <div className={`px-4 py-2 rounded-lg font-mono font-bold text-lg flex items-center gap-2 ${timeLeft < 300 ? 'bg-red-600 text-white animate-pulse' : 'bg-red-50 text-red-600 border border-red-100'
                        }`}>
                        <Clock className="w-4 h-4" />
                        {formatTime(timeLeft)}
                    </div>
                    <button
                        onClick={() => {
                            if (confirm('Are you sure you want to finalize and submit?')) finalizeAttempt(attemptId!);
                        }}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg text-[10px] font-black uppercase tracking-[0.2em] hover:bg-green-700 transition-all shadow-sm active:scale-95"
                    >
                        Finalize
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* LEFT: Question Area */}
                <main className="flex-1 overflow-y-auto custom-scrollbar bg-white flex flex-col">
                    {/* Mobile Section Selector - Horizontal Scroll */}
                    <div className="md:hidden flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-gray-100 overflow-x-auto no-scrollbar">
                        {sections.map((s) => (
                            <button
                                key={s.id}
                                disabled={completedSectionIds.includes(s.id)}
                                onClick={() => {
                                    setActiveSectionId(s.id);
                                    setActiveQuestionIdx(0);
                                }}
                                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeSectionId === s.id
                                    ? 'bg-green-600 text-white'
                                    : 'bg-white text-slate-500 border border-slate-200'
                                    }`}
                            >
                                {s.name}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-10 lg:py-16">
                        {activeQuestion ? (
                            <div className="space-y-10">
                                <div className="space-y-4">
                                    <div className="w-10 h-10 rounded-full border-2 border-green-600 text-green-600 flex items-center justify-center font-black text-sm">
                                        {activeQuestionIdx + 1}
                                    </div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {activeQuestion.marks} Mark(s) • Correct Option Required
                                    </div>
                                    <div className="prose prose-slate max-w-none">
                                        <div className="text-2xl lg:text-3xl font-black text-slate-900 leading-tight">
                                            <MarkdownRenderer content={activeQuestion.question_text} />
                                        </div>
                                    </div>
                                </div>

                                {activeQuestion.image_url && (
                                    <div className="rounded-xl overflow-hidden border border-gray-100 max-w-2xl bg-slate-50">
                                        <img
                                            src={activeQuestion.image_url}
                                            alt="Question Visualization"
                                            className="w-full h-auto object-contain cursor-zoom-in"
                                            onClick={() => setIsZoomed(!isZoomed)}
                                        />
                                    </div>
                                )}

                                {/* OPTIONS GRID */}
                                <div className={`grid gap-4 ${activeQuestion.question_type === 'numerical' || activeQuestion.question_type?.includes('essay')
                                    ? 'grid-cols-1'
                                    : 'grid-cols-1 md:grid-cols-2'
                                    }`}>
                                    {(activeQuestion.question_type === 'mcq_single' || activeQuestion.question_type === 'mcq_multiple') &&
                                        activeQuestion.options?.map((opt: any, optIdx: number) => {
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
                                                    className={`p-5 rounded-lg border text-left transition-all flex items-center gap-4 group ${isSelected
                                                        ? 'bg-green-50 border-green-600 shadow-sm'
                                                        : 'bg-white border-gray-200 hover:border-green-300'
                                                        }`}
                                                >
                                                    <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center font-black text-xs transition-colors ${isSelected ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-green-100 group-hover:text-green-600'
                                                        }`}>
                                                        {String.fromCharCode(65 + optIdx)}
                                                    </div>
                                                    <div className="text-sm font-bold text-slate-700">
                                                        <MarkdownRenderer content={normalizedOpt.text} />
                                                    </div>
                                                </button>
                                            );
                                        })
                                    }

                                    {activeQuestion.question_type === 'true_false' && ['true', 'false'].map((val) => (
                                        <button
                                            key={val}
                                            onClick={() => handleAnswer(activeQuestion.id, val)}
                                            className={`p-6 rounded-lg border font-black text-xs uppercase tracking-widest transition-all ${answers[activeQuestion.id] === val
                                                ? 'bg-green-50 border-green-600 text-green-700'
                                                : 'bg-white border-gray-200 hover:border-green-300'
                                                }`}
                                        >
                                            {val}
                                        </button>
                                    ))}

                                    {activeQuestion.question_type === 'numerical' && (
                                        <div className="max-w-md">
                                            <input
                                                type="text"
                                                className="w-full p-5 bg-white border border-gray-200 rounded-lg outline-none focus:border-green-600 font-bold text-2xl text-slate-900 transition-all"
                                                placeholder="Enter numerical answer..."
                                                value={answers[activeQuestion.id] || ''}
                                                onChange={(e) => handleAnswer(activeQuestion.id, e.target.value)}
                                            />
                                        </div>
                                    )}

                                    {(activeQuestion.question_type === 'essay' || activeQuestion.question_type === 'short_answer') && (
                                        <textarea
                                            className={`w-full p-5 bg-white border border-gray-200 rounded-lg outline-none focus:border-green-600 font-bold text-base text-slate-700 leading-relaxed min-h-[300px]`}
                                            placeholder="Write your response here..."
                                            value={answers[activeQuestion.id] || ''}
                                            onChange={(e) => handleAnswer(activeQuestion.id, e.target.value)}
                                        />
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-300 font-black uppercase tracking-widest">
                                Loading question...
                            </div>
                        )}
                    </div>

                    {/* BOTTOM BAR - STICKY */}
                    <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 z-40">
                        <button
                            disabled={activeQuestionIdx === 0 || !activeQuestion}
                            onClick={() => setActiveQuestionIdx(prev => prev - 1)}
                            className="px-6 py-2.5 bg-white border border-gray-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all flex items-center gap-2"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                        </button>

                        <button
                            disabled={!activeQuestion}
                            onClick={() => activeQuestion && toggleMarkForReview(activeQuestion.id)}
                            className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeQuestion && markedForReview[activeQuestion.id]
                                ? 'bg-orange-600 text-white'
                                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 disabled:opacity-50'
                                }`}
                        >
                            <Flag className="w-4 h-4" />
                            {activeQuestion && markedForReview[activeQuestion.id] ? 'Marked' : 'Mark for Review'}
                        </button>

                        <button
                            disabled={!activeQuestion}
                            onClick={() => {
                                if (!activeQuestion) return;
                                if (activeQuestionIdx < currentSectionQuestions.length - 1) {
                                    setActiveQuestionIdx(prev => prev + 1);
                                } else {
                                    if (confirm(`Finish ${sections.find(s => s.id === activeSectionId)?.name}? You will not be able to change answers in this section later.`)) {
                                        handleFinishSection(activeSectionId!);
                                    }
                                }
                            }}
                            className="px-8 py-2.5 bg-green-600 text-white rounded-lg text-[10px] font-black uppercase tracking-[0.2em] hover:bg-green-700 transition-all flex items-center gap-2 group disabled:opacity-50"
                        >
                            {activeQuestionIdx < currentSectionQuestions.length - 1 ? 'Save & Next' : 'Finish Section'}
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </div>
                </main>

                {/* RIGHT SIDEBAR: Navigation Matrix */}
                <aside className={`
                    w-[320px] bg-slate-50 border-l border-gray-200 overflow-y-auto hidden lg:flex flex-col p-8 custom-scrollbar
                `}>
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question Navigation</h3>
                        <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-slate-300" />
                        </div>
                    </div>

                    <div className="grid grid-cols-5 gap-2 pb-10">
                        {currentSectionQuestions.map((q, idx) => {
                            const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '' && answers[q.id] !== null;
                            const isMarked = markedForReview[q.id];
                            const isVisited = visitedQuestions[q.id];

                            let bgColor = 'bg-white text-slate-400 border-gray-200';
                            if (isAnswered) bgColor = 'bg-green-600 text-white border-green-600 shadow-sm';
                            else if (isMarked) bgColor = 'bg-orange-500 text-white border-orange-500 shadow-sm';
                            else if (isVisited) bgColor = 'bg-slate-100 text-slate-500 border-slate-200';

                            return (
                                <button
                                    key={q.id}
                                    onClick={() => setActiveQuestionIdx(idx)}
                                    className={`w-full aspect-square rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all relative ${bgColor} ${activeQuestionIdx === idx ? 'ring-2 ring-green-600 ring-offset-2 scale-110' : ''
                                        }`}
                                >
                                    {idx + 1}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-auto pt-8 border-t border-gray-200 space-y-4">
                        <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                            <span>Exam Progress</span>
                            <span className="text-green-600">
                                {questions.length > 0 ? Math.round((Object.keys(answers).length / questions.length) * 100) : 0}%
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-600 rounded-full transition-all duration-500"
                                style={{ width: `${questions.length > 0 ? (Object.keys(answers).length / questions.length) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                </aside>

                {/* Mobile Drawer Trigger for Navigation */}
                <button
                    onClick={() => setShowNavMatrix(true)}
                    className="lg:hidden fixed bottom-24 right-6 w-12 h-12 bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center z-50 animate-bounce active:scale-90"
                >
                    <Layers className="w-5 h-5" />
                </button>
            </div>

            {/* Mobile Navigation Matrix Drawer */}
            {showNavMatrix && (
                <div className="lg:hidden fixed inset-0 z-[100] flex flex-col">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowNavMatrix(false)} />
                    <div className="relative mt-auto bg-white rounded-t-[2rem] p-8 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Question</h3>
                            <button onClick={() => setShowNavMatrix(false)} className="p-2 bg-slate-100 rounded-full">
                                <X className="w-4 h-4 text-slate-600" />
                            </button>
                        </div>

                        <div className="grid grid-cols-6 gap-3 mb-10">
                            {currentSectionQuestions.map((q, idx) => {
                                const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '';
                                const isMarked = markedForReview[q.id];
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => {
                                            setActiveQuestionIdx(idx);
                                            setShowNavMatrix(false);
                                        }}
                                        className={`w-full aspect-square rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all ${isAnswered ? 'bg-green-600 text-white border-green-600' :
                                            isMarked ? 'bg-orange-500 text-white border-orange-500' :
                                                'bg-slate-50 text-slate-400 border-slate-200'
                                            } ${activeQuestionIdx === idx ? 'ring-2 ring-green-600 ring-offset-2' : ''}`}
                                    >
                                        {idx + 1}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ZOOM OVERLAY */}
            {isZoomed && activeQuestion?.image_url && (
                <div
                    className="fixed inset-0 z-[200] bg-slate-900/95 flex flex-col items-center justify-center p-4 lg:p-10"
                    onClick={() => setIsZoomed(false)}
                >
                    <button className="absolute top-8 right-8 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all">
                        <X className="w-6 h-6" />
                    </button>
                    <div className="w-full h-full flex items-center justify-center p-4">
                        <img
                            src={activeQuestion.image_url}
                            alt="Question Detailed"
                            className="max-w-full max-h-full object-contain cursor-zoom-out shadow-2xl"
                        />
                    </div>
                    <p className="mt-4 text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">Click anywhere to exit zoom</p>
                </div>
            )}

            {/* TIME UP MODAL */}
            {isTimeUpModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300 border border-red-100">
                        <div className="p-10 text-center">
                            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-8">
                                <Clock className="w-10 h-10" />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Time Exhausted</h2>
                            <p className="text-slate-500 font-bold text-sm leading-relaxed mb-8 px-4">
                                The exam duration has reached its limit. Your responses will now be automatically evaluated.
                            </p>
                            <button
                                onClick={() => finalizeAttempt(attemptId!)}
                                className="w-full py-4 bg-green-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-green-700 transition-all shadow-md active:scale-95"
                            >
                                Submit Exam Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
