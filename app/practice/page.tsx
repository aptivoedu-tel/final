'use client';

import React, { useEffect, useState } from 'react';
import { Play, Target, Trophy, TrendingUp, Clock, Award } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { PracticeService } from '@/lib/services/practiceService';
import { ContentService } from '@/lib/services/contentService';

export default function PracticePage() {
    const [user, setUser] = useState<any>(null);
    const [recentSessions, setRecentSessions] = useState<any[]>([]);
    const [weaknesses, setWeaknesses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const currentUser = AuthService.getCurrentUser();
        if (!currentUser || currentUser.role !== 'student') {
            window.location.href = '/login';
            return;
        }

        setUser(currentUser);
        loadData(currentUser.id);
    }, []);

    const loadData = async (userId: string) => {
        try {
            const [sessions, weakTopics, subjectsData] = await Promise.all([
                PracticeService.getStudentPracticeHistory(userId, 5),
                PracticeService.detectWeaknesses(userId),
                ContentService.getAllSubjects()
            ]);

            setRecentSessions(sessions);
            setWeaknesses(weakTopics);
            setSubjects(subjectsData);
        } catch (error) {
            console.error('Error loading practice data:', error);
        } finally {
            setLoading(false);
        }
    };

    const startQuickPractice = () => {
        alert('Starting quick practice session...');
    };

    const startMockTest = () => {
        alert('Starting mock test...');
    };

    const reviewWeakness = (subtopicId: number) => {
        alert(`Reviewing weakness: ${subtopicId}`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Sidebar userRole="student" />
            <Header
                userName={user?.full_name || 'Student'}
                userEmail={user?.email || ''}
            />

            <main className="ml-64 mt-16 p-8">
                {/* Header */}
                <div className="mb-8 animate-fade-in">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Practice Hub</h1>
                    <p className="text-lg text-gray-600">Sharpen your skills with targeted practice</p>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <button
                        onClick={startQuickPractice}
                        className="glass-surface p-8 text-left hover:shadow-xl transition-all hover:-translate-y-1 group animate-slide-in"
                    >
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Play className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Quick Practice</h3>
                        <p className="text-sm text-gray-600">Start a 10-question practice session</p>
                    </button>

                    <button
                        onClick={startMockTest}
                        className="glass-surface p-8 text-left hover:shadow-xl transition-all hover:-translate-y-1 group animate-slide-in"
                        style={{ animationDelay: '0.1s' }}
                    >
                        <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Trophy className="w-8 h-8 text-secondary" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Mock Test</h3>
                        <p className="text-sm text-gray-600">Take a full-length practice exam</p>
                    </button>

                    <div
                        className="glass-surface p-8 animate-slide-in"
                        style={{ animationDelay: '0.2s' }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <Award className="w-8 h-8 text-orange-500" />
                            <span className="text-2xl font-bold text-gray-900">
                                {recentSessions.length > 0
                                    ? Math.round(recentSessions[0].score_percentage || 0)
                                    : 0}%
                            </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Last Score</h3>
                        <p className="text-sm text-gray-600">
                            {recentSessions.length > 0 ? 'Keep it up!' : 'Start practicing!'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Sessions */}
                    <div className="lg:col-span-2">
                        <div className="glass-surface p-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Sessions</h2>

                            {recentSessions.length === 0 ? (
                                <div className="text-center py-12">
                                    <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">No practice sessions yet</p>
                                    <button onClick={startQuickPractice} className="btn btn-primary mt-4">
                                        Start Your First Session
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {recentSessions.map((session, index) => (
                                        <div
                                            key={session.id}
                                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${(session.score_percentage || 0) >= 80
                                                        ? 'bg-green-100'
                                                        : (session.score_percentage || 0) >= 60
                                                            ? 'bg-yellow-100'
                                                            : 'bg-red-100'
                                                    }`}>
                                                    <span className={`text-lg font-bold ${(session.score_percentage || 0) >= 80
                                                            ? 'text-green-600'
                                                            : (session.score_percentage || 0) >= 60
                                                                ? 'text-yellow-600'
                                                                : 'text-red-600'
                                                        }`}>
                                                        {Math.round(session.score_percentage || 0)}%
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">
                                                        {session.session_type === 'practice' ? 'Practice Session' : 'Mock Test'}
                                                    </p>
                                                    <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                                                        <span>{session.total_questions} questions</span>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {Math.round(session.time_spent_seconds / 60)} min
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-medium text-gray-700">
                                                    {session.correct_answers}/{session.total_questions} correct
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {new Date(session.completed_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Weak Topics */}
                    <div className="lg:col-span-1">
                        <div className="glass-surface p-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                            <h3 className="text-xl font-bold text-gray-900 mb-6">Weak Topics</h3>

                            {weaknesses.length === 0 ? (
                                <div className="text-center py-8">
                                    <TrendingUp className="w-12 h-12 text-green-500 mx-auto mb-3" />
                                    <p className="text-sm text-gray-600">Great! No weaknesses detected</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {weaknesses.slice(0, 5).map((weakness, index) => (
                                        <div
                                            key={index}
                                            className="p-4 bg-red-50 border border-red-100 rounded-lg"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <h4 className="font-semibold text-gray-900 text-sm">
                                                    {weakness.subtopic_name}
                                                </h4>
                                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${weakness.weakness_level === 'critical'
                                                        ? 'bg-red-200 text-red-700'
                                                        : weakness.weakness_level === 'high'
                                                            ? 'bg-orange-200 text-orange-700'
                                                            : 'bg-yellow-200 text-yellow-700'
                                                    }`}>
                                                    {weakness.weakness_level}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-600 mb-3">
                                                Avg: {Math.round(weakness.avg_score)}% • {weakness.total_attempts} attempts
                                            </p>
                                            <button
                                                onClick={() => reviewWeakness(weakness.subtopic_id)}
                                                className="text-xs btn btn-secondary w-full py-1.5"
                                            >
                                                Practice Now
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
