'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ChevronLeft, RotateCcw, ArrowRight,
    Trophy, Clock, Target, CheckCircle2, XCircle, HelpingHand,
    Sparkles, BookOpen, Brain, BookOpenText,
    Timer, ChevronRight, HelpCircle, Send, Play, Layout, AlertCircle
} from 'lucide-react';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';
import { AuthService } from '@/lib/services/authService';
import { PracticeService, MCQ } from '@/lib/services/practiceService';
import { toast } from 'sonner';
import { useLoading } from '@/lib/context/LoadingContext';


export default function PracticeSessionPage() {
    const router = useRouter();
    const params = useParams();
    const uniId = parseInt(params.uniId as string);
    const subtopicId = parseInt(params.subtopicId as string);
    const { setLoading: setGlobalLoading } = useLoading();

    const [questions, setQuestions] = useState<MCQ[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [isCompleted, setIsCompleted] = useState(false);
    const [startTime] = useState(new Date());
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [session, setSession] = useState<any>(null);
    const [subtopicName, setSubtopicName] = useState('');
    const [results, setResults] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [submittedAnswer, setSubmittedAnswer] = useState<Record<number, boolean>>({});
    const [isCorrect, setIsCorrect] = useState<Record<number, boolean>>({});

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const initialized = useRef(false);

    const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const initSession = async () => {
            setGlobalLoading(true, 'Initializing Practice Session...');
            try {
                console.log('Practicing Subtopic:', subtopicId, 'Uni:', uniId);
                const currentUser = AuthService.getCurrentUser() || await AuthService.syncSession();
                if (!currentUser) {
                    console.error('No user found for practice session');
                    router.push('/login');
                    return;
                }
                setUser(currentUser);

                // Fetch subtopic info from MongoDB
                const stRes = await fetch(`/api/mongo/content?type=subtopics&id=${subtopicId}`);
                const stData = await stRes.json();
                const subtopic = stData.subtopics?.[0];
                setSubtopicName(subtopic?.name || 'Subtopic');

                // Check for existing active session
                const activeRecord = await PracticeService.getActiveSession(currentUser.id, { subtopicId, universityId: uniId });
                let finalSession = activeRecord.session;
                let finalMcqs = activeRecord.mcqs;

                if (finalSession && finalMcqs && finalMcqs.length > 0) {
                    // Resume session
                    const priorAttempts = activeRecord.attempts || [];
                    const newAnswers: Record<number, string> = {};
                    const newSubmitted: Record<number, boolean> = {};
                    const newIsCorrect: Record<number, boolean> = {};

                    priorAttempts.forEach((att: any) => {
                        const qIndex = finalMcqs.findIndex((m: any) => m.id === att.mcq_id);
                        if (qIndex !== -1) {
                            newAnswers[qIndex] = att.selected_option;
                            newSubmitted[qIndex] = true;
                            newIsCorrect[qIndex] = att.is_correct;
                        }
                    });

                    setQuestions(finalMcqs);
                    setAnswers(newAnswers);
                    setSubmittedAnswer(newSubmitted);
                    setIsCorrect(newIsCorrect);
                    setTimeElapsed(finalSession.time_spent_seconds || 0);

                    // Skip right to next unanswered
                    const nextIndex = priorAttempts.length;
                    setCurrentIndex(Math.min(nextIndex, finalMcqs.length - 1));

                    setSession(finalSession);
                    toast.success('Resumed previous session');
                } else {
                    try {
                        // 1. Generate Questions
                        const mcqs = await PracticeService.generatePracticeSession(
                            subtopicId,
                            uniId,
                            0, // subjectId will be derived in service
                            currentUser.id
                        );

                        if (!mcqs || mcqs.length === 0) {
                            toast.error('No practice questions available for this subtopic yet.');
                            console.warn('Redirecting back - zero questions in subtopic pool');
                            router.push(`/university/${uniId}`);
                            return;
                        }

                        // 2. Create Session in DB
                        const { session: startedSession, error: createError } = await PracticeService.createSession(
                            currentUser.id,
                            subtopicId,
                            uniId,
                            'practice',
                            null,
                            mcqs.map((m: any) => m.id)
                        );

                        if (createError || !startedSession) {
                            toast.error(createError || 'Failed to create practice session');
                            router.push(`/university/${uniId}`);
                            return;
                        }

                        setSession(startedSession);
                        setQuestions(mcqs);
                    } catch (apiErr: any) {
                        console.error('Session creation failed:', apiErr);
                        toast.error('Could not initialize session: ' + (apiErr.message || 'Server error'));
                        router.push(`/university/${uniId}`);
                        return;
                    }
                }

                setLastInteractionTime(Date.now());

                // Start Timer
                timerRef.current = setInterval(() => {
                    setTimeElapsed(prev => prev + 1);
                }, 1000);

            } catch (error: any) {
                console.error('Practice session initialization fatal error:', error);
                toast.error(error.message || 'Failed to start practice session.');
                router.push(`/university/${uniId}`);
            } finally {
                setGlobalLoading(false);
            }
        };

        if (subtopicId && uniId) {
            initSession();
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [subtopicId, uniId]);

    const handleSelectOption = (option: string) => {
        if (isCompleted) return;
        setAnswers({ ...answers, [currentIndex]: option });
    };

    const nextQuestion = () => {
        setLastInteractionTime(Date.now());
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            finalizeSession();
        }
    };

    const prevQuestion = () => {
        setLastInteractionTime(Date.now());
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const finalizeSession = async () => {
        if (isCompleted || !session) return;

        setIsCompleted(true);
        if (timerRef.current) clearInterval(timerRef.current);

        let correct = 0;
        let wrong = 0;
        let skipped = 0;

        questions.forEach((q, idx) => {
            const answer = answers[idx];
            if (!answer) skipped++;
            else if (answer === q.correct_option) correct++;
            else wrong++;
        });

        const { success, error } = await PracticeService.completeSession(
            session.id,
            user.id,
            questions.length,
            correct,
            wrong,
            skipped,
            timeElapsed
        );

        if (success) {
            setResults({
                correct,
                wrong,
                skipped,
                score: Math.round((correct / questions.length) * 100),
                time: timeElapsed
            });
            toast.success('Session completed!');
        } else {
            toast.error(error || 'Failed to save session');
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };


    if (!isCompleted && questions.length === 0) return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (isCompleted && results) {

        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 animate-scale-in">
                    <div className="bg-gradient-to-br from-slate-900 to-teal-950 p-12 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <div className="relative z-10">
                            <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-white/20">
                                <Trophy className="w-12 h-12 text-teal-300" />
                            </div>
                            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Session Complete!</h1>
                            <p className="text-teal-400 font-bold uppercase tracking-widest text-xs">{subtopicName}</p>
                        </div>
                    </div>

                    <div className="p-12">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center transition-transform hover:scale-105">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Score</p>
                                <p className="text-3xl font-black text-teal-600">{results.score}%</p>
                            </div>
                            <div className="bg-green-50 p-6 rounded-3xl border border-emerald-100 text-center transition-transform hover:scale-105">
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Correct</p>
                                <p className="text-3xl font-black text-emerald-600">{results.correct}</p>
                            </div>
                            <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 text-center transition-transform hover:scale-105">
                                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Wrong</p>
                                <p className="text-3xl font-black text-rose-600">{results.wrong}</p>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center transition-transform hover:scale-105">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Time</p>
                                <p className="text-3xl font-black text-slate-900">{formatTime(results.time)}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full py-5 bg-teal-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-teal-100 hover:bg-teal-700 transition-all active:scale-98 flex items-center justify-center gap-3 animate-pulse hover:animate-none"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Practice More Questions
                            </button>
                            <button
                                onClick={() => router.push(`/university/${uniId}`)}
                                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-slate-100 hover:bg-slate-800 transition-all active:scale-98 flex items-center justify-center gap-3"
                            >
                                <ArrowRight className="w-4 h-4" />
                                Return to Curriculum
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const currentMCQ = questions[currentIndex];
    const progress = ((currentIndex + 1) / questions.length) * 100;

    // Determine the longest option length to conditionally arrange the grid
    const maxOptionLength = Math.max(
        (currentMCQ?.option_a || '').length,
        (currentMCQ?.option_b || '').length,
        (currentMCQ?.option_c || '').length,
        (currentMCQ?.option_d || '').length
    );
    const optionsGridClass = maxOptionLength > 60 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2';
    const showExplanation = submittedAnswer[currentIndex] && !!currentMCQ.explanation;

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
            {/* Header */}
            <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-teal-600 hover:border-teal-600 transition-all"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-sm font-black text-slate-900 tracking-tight">{subtopicName}</h2>
                        <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest">Question {currentIndex + 1} of {questions.length}</p>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="hidden sm:flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                        <Timer className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-black text-slate-700 font-mono">{formatTime(timeElapsed)}</span>
                    </div>
                    <button
                        onClick={() => finalizeSession()}
                        className="btn btn-primary h-10 px-6 text-[10px]"
                    >
                        End Session
                    </button>
                </div>
            </header>

            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-slate-100">
                <div
                    className="h-full bg-teal-600 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(13,148,136,0.3)]"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <main className="flex-1 w-full mx-auto p-4 lg:p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden flex justify-center">
                <div className="w-full max-w-5xl transition-all duration-500">
                    {/* Main Column: Question, Options & Explanation */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[400px] w-full transition-all duration-500">
                        <div className="p-6 sm:p-10 flex-1">
                            {/* Question */}
                            <div className="mb-12">
                                <span className="text-[10px] font-black text-teal-500 uppercase tracking-[0.2em] mb-4 block">Question</span>
                                <div className="text-xl sm:text-2xl font-bold text-slate-900 leading-relaxed">
                                    <MarkdownRenderer content={currentMCQ.question} />
                                </div>
                                {currentMCQ.question_image_url && (
                                    <div className="mt-8 rounded-2xl overflow-hidden border border-slate-100 shadow-sm max-w-lg">
                                        <img src={currentMCQ.question_image_url} alt="Question" className="w-full h-auto" />
                                    </div>
                                )}
                            </div>

                            {/* Options */}
                            <div className={`grid gap-4 ${optionsGridClass}`}>
                                {[
                                    { key: 'A', text: currentMCQ.option_a },
                                    { key: 'B', text: currentMCQ.option_b },
                                    { key: 'C', text: currentMCQ.option_c },
                                    { key: 'D', text: currentMCQ.option_d },
                                ].map((option) => {
                                    const isSubmitted = submittedAnswer[currentIndex];
                                    const isSelected = answers[currentIndex] === option.key;
                                    const isCorrectOpt = option.key === currentMCQ.correct_option;
                                    const showCorrect = isSubmitted && isCorrectOpt;
                                    const showWrong = isSubmitted && isSelected && !isCorrectOpt;

                                    return (
                                        <button
                                            key={option.key}
                                            onClick={() => handleSelectOption(option.key)}
                                            disabled={isSubmitted}
                                            className={`group flex items-center p-6 rounded-2xl border-2 transition-all active:scale-[0.99] text-left ${showCorrect
                                                ? 'bg-emerald-50 border-emerald-500 shadow-md shadow-emerald-100'
                                                : showWrong
                                                    ? 'bg-rose-50 border-rose-500 shadow-md shadow-rose-100'
                                                    : isSelected
                                                        ? 'bg-teal-50 border-teal-500 shadow-md shadow-teal-100'
                                                        : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                                } ${isSubmitted ? 'cursor-default' : ''}`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-all ${showCorrect
                                                ? 'bg-emerald-600 text-white'
                                                : showWrong
                                                    ? 'bg-rose-600 text-white'
                                                    : isSelected
                                                        ? 'bg-teal-600 text-white'
                                                        : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-600'
                                                }`}>
                                                {showCorrect ? (
                                                    <CheckCircle2 className="w-5 h-5" />
                                                ) : showWrong ? (
                                                    <XCircle className="w-5 h-5" />
                                                ) : (
                                                    option.key
                                                )}
                                            </div>
                                            <div className={`ml-6 text-sm font-bold ${isSelected ? 'text-teal-900' : 'text-slate-600'}`}>
                                                <MarkdownRenderer content={option.text} />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            {/* Explanation */}
                            {showExplanation && (
                                <div className="mt-12 bg-slate-50 rounded-[2rem] border border-slate-100 p-8 sm:p-10 animate-fade-in">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center shrink-0">
                                            <HelpCircle className="w-6 h-6 text-teal-600" />
                                        </div>
                                        <h4 className="text-sm font-black text-teal-600 uppercase tracking-widest">Explanation</h4>
                                    </div>
                                    <div className="text-base text-slate-700 leading-relaxed font-medium">
                                        <MarkdownRenderer content={currentMCQ.explanation || ''} />
                                    </div>
                                    {currentMCQ.explanation_url && (
                                        <div className="mt-6 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                                            <img src={currentMCQ.explanation_url} alt="Explanation" className="w-full h-auto" />
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>

                        {/* Navigation Footer */}
                        <div className="p-6 sm:p-12 bg-slate-50/50 border-t border-slate-100 flex flex-col gap-6">

                            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={prevQuestion}
                                        disabled={currentIndex === 0}
                                        className="flex items-center justify-center w-12 h-12 rounded-2xl border border-slate-200 bg-white text-slate-400 hover:text-teal-600 hover:border-teal-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm group"
                                    >
                                        <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                                    </button>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
                                        Item {currentIndex + 1} / {questions.length}
                                    </span>
                                    <button
                                        onClick={nextQuestion}
                                        className="flex items-center justify-center w-12 h-12 rounded-2xl border border-slate-200 bg-white text-slate-400 hover:text-teal-600 hover:border-teal-600 transition-all shadow-sm group"
                                    >
                                        <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>

                                <div className="flex gap-3 w-full sm:w-auto">
                                    {!submittedAnswer[currentIndex] ? (
                                        <button
                                            onClick={async () => {
                                                if (answers[currentIndex]) {
                                                    const currentMCQ = questions[currentIndex];
                                                    const selectedOption = answers[currentIndex];
                                                    const timeSpent = Math.round((Date.now() - lastInteractionTime) / 1000);

                                                    setGlobalLoading(true, 'Checking answer...');
                                                    try {
                                                        const result = await PracticeService.submitAttempt(
                                                            session.id,
                                                            currentMCQ.id,
                                                            user.id,
                                                            selectedOption as any,
                                                            timeSpent
                                                        );

                                                        setSubmittedAnswer(prev => ({ ...prev, [currentIndex]: true }));
                                                        setIsCorrect(prev => ({ ...prev, [currentIndex]: result.isCorrect }));
                                                        setLastInteractionTime(Date.now());
                                                    } finally {
                                                        setGlobalLoading(false);
                                                    }
                                                }
                                            }}
                                            disabled={!answers[currentIndex]}
                                            className={`flex-1 sm:flex-none px-8 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center gap-3 ${answers[currentIndex]
                                                ? 'bg-teal-600 text-white shadow-xl shadow-teal-100 hover:bg-teal-700 active:scale-95'
                                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                }`}
                                        >
                                            Check Answer
                                            <HelpCircle className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                if (currentIndex === questions.length - 1) {
                                                    finalizeSession();
                                                } else {
                                                    nextQuestion();
                                                }
                                            }}
                                            className="flex-1 sm:flex-none px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-3"
                                        >
                                            {currentIndex === questions.length - 1 ? 'Finish Session' : 'Next Question'}
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
