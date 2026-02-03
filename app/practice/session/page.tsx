'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { PracticeService, MCQ } from '@/lib/services/practiceService';
import { AuthService } from '@/lib/services/authService';
import { ChevronRight, Clock, CheckCircle2, XCircle, AlertCircle, Play, ArrowRight, Trophy } from 'lucide-react';
import { shuffleArray } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function PracticeSessionPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const subtopicId = searchParams.get('subtopic');
    const universityId = searchParams.get('university');
    const topicId = searchParams.get('topic');

    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [questions, setQuestions] = useState<MCQ[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [results, setResults] = useState<{
        correct: number;
        wrong: number;
        total: number;
        timeSpent: number;
    } | null>(null);

    const [shuffledOptions, setShuffledOptions] = useState<{ label: string, content: string }[]>([]);

    const [timer, setTimer] = useState(0);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        const init = async () => {
            const u = AuthService.getCurrentUser();
            if (!u) {
                router.push('/login');
                return;
            }
            setUser(u);

            if (subtopicId) {
                await startSession(u.id);
            } else {
                router.push('/practice');
            }
        };
        init();
    }, [subtopicId]);

    // Timer logic
    useEffect(() => {
        let interval: any;
        if (!loading && !isComplete && !results) {
            interval = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [loading, isComplete, results]);

    useEffect(() => {
        if (questions[currentIndex]) {
            const q = questions[currentIndex];
            const opts = [
                { label: 'A', content: q.option_a },
                { label: 'B', content: q.option_b },
                { label: 'C', content: q.option_c },
                { label: 'D', content: q.option_d }
            ];
            setShuffledOptions(shuffleArray(opts));
        }
    }, [currentIndex, questions]);

    const startSession = async (studentId: string) => {
        try {
            // 1. Create session in DB
            const { session, error } = await PracticeService.createSession(
                studentId,
                parseInt(subtopicId!),
                universityId ? parseInt(universityId) : null
            );

            if (error) throw new Error(error);
            setSessionId(session!.id);

            // 2. Fetch questions using specific rules
            // We need subjectId for rules. Let's fetch topic first.
            const { data: topic } = await supabase
                .from('topics')
                .select('subject_id')
                .eq('id', topicId!)
                .single();

            const mcqs = await PracticeService.generatePracticeSession(
                parseInt(subtopicId!),
                universityId ? parseInt(universityId) : null,
                topic?.subject_id || 0,
                studentId
            );

            if (mcqs.length === 0) {
                throw new Error("No questions available for this lesson yet.");
            }

            setQuestions(mcqs);
            setLoading(false);
        } catch (e: any) {
            alert(e.message);
            router.push('/university');
        }
    };

    const handleSubmitAnswer = async () => {
        if (!selectedOption || isSubmitted) return;

        setIsSubmitted(true);
        const currentQuestion = questions[currentIndex];

        // Record attempt
        await PracticeService.submitAttempt(
            sessionId!,
            currentQuestion.id,
            user.id,
            selectedOption as any,
            0 // Simplified timing per question for now
        );

        // Auto move to next after 2 seconds or let user click next
    };

    const handleNextQuestion = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
            setIsSubmitted(false);
        } else {
            finishSession();
        }
    };

    const finishSession = async () => {
        setIsComplete(true);

        // Fetch all attempts for this session to calculate score
        const { data: attempts } = await supabase
            .from('mcq_attempts')
            .select('*')
            .eq('practice_session_id', sessionId!);

        const correct = attempts?.filter(a => a.is_correct).length || 0;
        const total = questions.length;

        await PracticeService.completeSession(
            sessionId!,
            user.id,
            total,
            correct,
            total - correct,
            0,
            timer
        );

        setResults({
            correct,
            wrong: total - correct,
            total,
            timeSpent: timer
        });
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-indigo-300 font-bold tracking-widest uppercase text-xs">Generating Intelligent Session</p>
            </div>
        </div>
    );

    if (results) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-white rounded-[3rem] p-10 text-center shadow-2xl overflow-hidden relative"
            >
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trophy className="w-12 h-12 text-indigo-600" />
                </div>

                <h2 className="text-3xl font-black text-slate-900 mb-2">Practice Complete!</h2>
                <p className="text-slate-500 font-medium mb-8">You've mastered another session.</p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Accuracy</span>
                        <span className="text-2xl font-black text-indigo-600">{Math.round((results.correct / results.total) * 100)}%</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Time</span>
                        <span className="text-2xl font-black text-indigo-600">{Math.floor(results.timeSpent / 60)}m {results.timeSpent % 60}s</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => router.push('/university')}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                        RETURN TO LIBRARY
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-50 transition-all"
                    >
                        PRACTICE AGAIN
                    </button>
                </div>
            </motion.div>
        </div>
    );

    const q = questions[currentIndex];

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col font-sans">
            {/* Session Header */}
            <div className="px-8 py-6 flex items-center justify-between border-b border-white/5 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <button onClick={() => router.back()} className="text-white/50 hover:text-white transition-colors">
                        <XCircle className="w-6 h-6" />
                    </button>
                    <div className="h-8 w-px bg-white/10" />
                    <div>
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-0.5">Performance Session</span>
                        <h2 className="text-lg font-bold text-white leading-none">Question {currentIndex + 1} of {questions.length}</h2>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 text-white font-mono text-sm">
                        <Clock className="w-4 h-4 text-indigo-400" />
                        {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-white/5 w-full">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                />
            </div>

            {/* Question Area */}
            <main className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
                <div className="max-w-3xl w-full">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] shadow-2xl backdrop-blur-sm">
                                <h3 className="text-2xl md:text-3xl font-bold text-white leading-snug">
                                    {q.question}
                                </h3>

                                {q.question_image_url && (
                                    <div className="mt-8 rounded-2xl overflow-hidden border border-white/10">
                                        <img src={q.question_image_url} alt="Question Context" className="w-full object-cover" />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {shuffledOptions.map((optObj) => {
                                    const opt = optObj.label;
                                    const isChoice = selectedOption === opt;
                                    const isCorrect = q.correct_option === opt;

                                    let borderColor = "border-white/10";
                                    let bgColor = "bg-white/5";
                                    let textColor = "text-white/70";

                                    if (isSubmitted) {
                                        if (isCorrect) {
                                            borderColor = "border-green-500";
                                            bgColor = "bg-green-500/10";
                                            textColor = "text-green-400";
                                        } else if (isChoice) {
                                            borderColor = "border-red-500";
                                            bgColor = "bg-red-500/10";
                                            textColor = "text-red-400";
                                        }
                                    } else if (isChoice) {
                                        borderColor = "border-indigo-500";
                                        bgColor = "bg-indigo-500/10";
                                        textColor = "text-indigo-400";
                                    }

                                    return (
                                        <button
                                            key={opt}
                                            disabled={isSubmitted}
                                            onClick={() => setSelectedOption(opt)}
                                            className={`group relative flex items-center gap-4 p-6 rounded-[2rem] border-2 text-left transition-all ${borderColor} ${bgColor} ${!isSubmitted && 'hover:border-white/30 hover:bg-white/10'}`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-colors ${isChoice || (isSubmitted && isCorrect) ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/40'}`}>
                                                {opt}
                                            </div>
                                            <span className={`text-lg font-bold transition-colors ${textColor}`}>
                                                {optObj.content}
                                            </span>

                                            {isSubmitted && isCorrect && <CheckCircle2 className="w-6 h-6 text-green-500 ml-auto" />}
                                            {isSubmitted && isChoice && !isCorrect && <XCircle className="w-6 h-6 text-red-500 ml-auto" />}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Feedback & Actions */}
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8">
                                <div className="flex-1">
                                    <AnimatePresence>
                                        {isSubmitted && q.explanation && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-2xl flex gap-4 items-start"
                                            >
                                                <AlertCircle className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <p className="text-indigo-200/70 text-sm leading-relaxed">
                                                        <span className="font-black text-indigo-300 mr-2 uppercase tracking-tighter text-[10px]">Explanation:</span>
                                                        {q.explanation}
                                                    </p>
                                                    {q.explanation_url && (
                                                        <div className="mt-4 rounded-xl overflow-hidden border border-white/10 max-w-sm">
                                                            <img src={q.explanation_url} alt="Explanation Context" className="w-full object-cover" />
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {!isSubmitted ? (
                                    <button
                                        disabled={!selectedOption}
                                        onClick={handleSubmitAnswer}
                                        className="w-full md:w-auto px-12 py-5 bg-indigo-600 text-white rounded-[2rem] font-black tracking-widest uppercase hover:bg-indigo-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-xl shadow-indigo-500/20"
                                    >
                                        Submit Answer
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleNextQuestion}
                                        className="w-full md:w-auto px-12 py-5 bg-white text-slate-900 rounded-[2rem] font-black tracking-widest uppercase hover:bg-gray-100 transition-all flex items-center justify-center gap-3 group"
                                    >
                                        {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Session'}
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* Session Navigation */}
            <div className="p-8 flex justify-center border-t border-white/5">
                <div className="flex gap-2">
                    {questions.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-1.5 rounded-full transition-all ${idx === currentIndex ? 'w-8 bg-indigo-500' : 'w-2 bg-white/10'}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
