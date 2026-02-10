'use client';

import React, { useEffect, useState } from 'react';
import { BookOpen, Clock, Target, CheckCircle, Plus, Search } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { ContentService } from '@/lib/services/contentService';

export default function CoursesPage() {
    const [user, setUser] = useState<any>(null);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
    const [topics, setTopics] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const currentUser = AuthService.getCurrentUser();
        if (!currentUser || currentUser.role !== 'student') {
            window.location.href = '/login';
            return;
        }

        setUser(currentUser);
        loadSubjects();
    }, []);

    const loadSubjects = async () => {
        const data = await ContentService.getAllSubjects();
        setSubjects(data);
        if (data.length > 0) {
            setSelectedSubject(data[0].id);
            loadTopics(data[0].id);
        }
        setLoading(false);
    };

    const loadTopics = async (subjectId: number) => {
        const data = await ContentService.getTopicsBySubject(subjectId);
        setTopics(data);
    };

    const handleSubjectChange = (subjectId: number) => {
        setSelectedSubject(subjectId);
        loadTopics(subjectId);
    };

    const enrollInTopic = async (topicId: number) => {
        // Implementation for enrollment
        alert('Enrolling in topic...');
    };

    const filteredTopics = topics.filter(topic =>
        topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        topic.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">My Courses</h1>
                    <p className="text-lg text-gray-600">Explore and enroll in topics to start learning</p>
                </div>

                {/* Search Bar */}
                <div className="glass-surface p-4 mb-6 animate-slide-in">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search topics..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input pl-12"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Subject Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="glass-surface p-6 animate-slide-in">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subjects</h3>
                            <div className="space-y-2">
                                {subjects.map((subject) => (
                                    <button
                                        key={subject.id}
                                        onClick={() => handleSubjectChange(subject.id)}
                                        className={`w-full text-left px-4 py-3 rounded-lg transition-all ${selectedSubject === subject.id
                                                ? 'bg-primary text-white'
                                                : 'hover:bg-gray-100 text-gray-700'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: subject.color || '#88D1B1' }}
                                            />
                                            <span className="font-medium text-sm">{subject.name}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Topics Grid */}
                    <div className="lg:col-span-3">
                        {filteredTopics.length === 0 ? (
                            <div className="glass-surface p-12 text-center animate-scale-in">
                                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">No topics found for this subject</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {filteredTopics.map((topic, index) => (
                                    <div
                                        key={topic.id}
                                        className="glass-surface p-6 hover:shadow-xl transition-all hover:-translate-y-1 animate-scale-in"
                                        style={{ animationDelay: `${index * 0.05}s` }}
                                    >
                                        {/* Topic Header */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-gray-900 mb-2">
                                                    {topic.name}
                                                </h3>
                                                {topic.description && (
                                                    <p className="text-sm text-gray-600 line-clamp-2">
                                                        {topic.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Topic Stats */}
                                        <div className="flex items-center gap-4 mb-4">
                                            {topic.estimated_hours && (
                                                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                    <Clock className="w-4 h-4" />
                                                    <span>{topic.estimated_hours}h</span>
                                                </div>
                                            )}
                                            {topic.difficulty_level && (
                                                <span
                                                    className={`px-2 py-1 rounded-full text-xs font-medium ${topic.difficulty_level === 'beginner'
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : topic.difficulty_level === 'advanced'
                                                                ? 'bg-red-100 text-red-700'
                                                                : 'bg-yellow-100 text-yellow-700'
                                                        }`}
                                                >
                                                    {topic.difficulty_level}
                                                </span>
                                            )}
                                        </div>

                                        {/* Progress Bar (if enrolled) */}
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs text-gray-500">Progress</span>
                                                <span className="text-xs font-semibold text-gray-700">0%</span>
                                            </div>
                                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary transition-all"
                                                    style={{ width: '0%' }}
                                                />
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <button
                                            onClick={() => enrollInTopic(topic.id)}
                                            className="btn btn-primary w-full"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Enroll Now
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
