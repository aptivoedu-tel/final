'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, BookOpen, ChevronRight, Search } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { ContentService } from '@/lib/services/contentService';
import { useUI } from '@/lib/context/UIContext';

export default function ContentManagementPage() {
    const [user, setUser] = useState<any>(null);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
    const [topics, setTopics] = useState<any[]>([]);
    const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
    const [subtopics, setSubtopics] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState<'subject' | 'topic' | 'subtopic'>('subject');
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        sequence: 1
    });
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const { isSidebarCollapsed } = useUI();

    useEffect(() => {
        const currentUser = AuthService.getCurrentUser();
        if (!currentUser || currentUser.role === 'student') {
            window.location.href = '/dashboard';
            return;
        }

        setUser(currentUser);
        loadSubjects();
    }, []);

    const loadSubjects = async () => {
        const data = await ContentService.getAllSubjects();
        setSubjects(data);
        setLoading(false);
    };

    const loadTopics = async (subjectId: number) => {
        const data = await ContentService.getTopicsBySubject(subjectId);
        setTopics(data);
        setSubtopics([]);
        setSelectedTopic(null);
    };

    const loadSubtopics = async (topicId: number) => {
        const data = await ContentService.getSubtopicsByTopic(topicId);
        setSubtopics(data);
    };

    const handleSubjectClick = (subjectId: number) => {
        setSelectedSubject(subjectId);
        loadTopics(subjectId);
    };

    const handleTopicClick = (topicId: number) => {
        setSelectedTopic(topicId);
        loadSubtopics(topicId);
    };

    const openCreateModal = (type: 'subject' | 'topic' | 'subtopic') => {
        setModalType(type);
        setEditingItem(null);
        setFormData({ name: '', description: '', sequence: 1 });
        setShowModal(true);
    };

    const openEditModal = (type: 'subject' | 'topic' | 'subtopic', item: any) => {
        setModalType(type);
        setEditingItem(item);
        setFormData({
            name: item.name,
            description: item.description || '',
            sequence: item.display_order || item.sequence_order || 1
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            if (editingItem) {
                // UPDATE
                if (modalType === 'subject') {
                    await ContentService.updateSubject(editingItem.id, { name: formData.name, description: formData.description, display_order: formData.sequence });
                    await loadSubjects();
                } else if (modalType === 'topic') {
                    await ContentService.updateTopic(editingItem.id, { name: formData.name, description: formData.description, sequence_order: formData.sequence });
                    if (selectedSubject) await loadTopics(selectedSubject);
                } else if (modalType === 'subtopic') {
                    await ContentService.updateSubtopic(editingItem.id, { name: formData.name, sequence_order: formData.sequence });
                    if (selectedTopic) await loadSubtopics(selectedTopic);
                }
            } else {
                // CREATE
                if (modalType === 'subject') {
                    await ContentService.createSubject({ name: formData.name, description: formData.description, display_order: formData.sequence, is_active: true, color: null, icon: null });
                    await loadSubjects();
                } else if (modalType === 'topic' && selectedSubject) {
                    await ContentService.createTopic({ subject_id: selectedSubject, name: formData.name, description: formData.description, sequence_order: formData.sequence, is_active: true, difficulty_level: 'beginner', estimated_hours: null, prerequisites: null });
                    await loadTopics(selectedSubject);
                } else if (modalType === 'subtopic' && selectedTopic) {
                    await ContentService.createSubtopic({ topic_id: selectedTopic, name: formData.name, sequence_order: formData.sequence, is_active: true, content_markdown: '', estimated_minutes: null, video_url: null });
                    await loadSubtopics(selectedTopic);
                }
            }
            setShowModal(false);
            setEditingItem(null);
        } catch (error) {
            console.error('Error saving content:', error);
            alert('Failed to save content');
        }
    };

    const handleDelete = async (type: 'subject' | 'topic' | 'subtopic', id: number) => {
        if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

        try {
            if (type === 'subject') {
                await ContentService.deleteSubject(id);
                await loadSubjects();
                setSelectedSubject(null);
                setTopics([]);
            } else if (type === 'topic') {
                await ContentService.deleteTopic(id);
                if (selectedSubject) await loadTopics(selectedSubject);
                setSelectedTopic(null);
                setSubtopics([]);
            } else if (type === 'subtopic') {
                await ContentService.deleteSubtopic(id);
                if (selectedTopic) await loadSubtopics(selectedTopic);
            }
        } catch (error) {
            console.error(`Error deleting ${type}:`, error);
            alert(`Failed to delete ${type}`);
        }
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
            <Sidebar userRole={user?.role || 'institution_admin'} />
            <Header
                userName={user?.full_name || 'Admin'}
                userEmail={user?.email || ''}
            />

            <main className={`${isSidebarCollapsed ? 'ml-28' : 'ml-80'} mt-16 p-8 transition-all duration-300`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-8 animate-fade-in">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Content Management</h1>
                        <p className="text-lg text-gray-600">Manage subjects, topics, and subtopics</p>
                    </div>
                    <button
                        onClick={() => openCreateModal('subject')}
                        className="btn btn-primary"
                    >
                        <Plus className="w-4 h-4" />
                        New Subject
                    </button>
                </div>

                {/* Search */}
                <div className="glass-surface p-4 mb-6 animate-slide-in">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search content..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input pl-12"
                        />
                    </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Subjects */}
                    <div className="glass-surface p-6 animate-slide-in">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Subjects</h2>
                            <span className="text-sm text-gray-500">{subjects.length}</span>
                        </div>
                        <div className="space-y-2 max-h-[600px] overflow-y-auto">
                            {subjects.map((subject) => (
                                <div
                                    key={subject.id}
                                    className={`p-3 rounded-lg cursor-pointer transition-all ${selectedSubject === subject.id
                                        ? 'bg-primary text-white'
                                        : 'hover:bg-gray-100'
                                        }`}
                                    onClick={() => handleSubjectClick(subject.id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="w-4 h-4" />
                                            <span className="font-medium text-sm">{subject.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEditModal('subject', subject);
                                                }}
                                                className="p-1 hover:bg-emerald-100 rounded"
                                            >
                                                <Edit className="w-3 h-3 text-emerald-500" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete('subject', subject.id);
                                                }}
                                                className="p-1 hover:bg-red-100 rounded"
                                            >
                                                <Trash2 className="w-3 h-3 text-red-500" />
                                            </button>
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Topics */}
                    <div className="glass-surface p-6 animate-slide-in" style={{ animationDelay: '0.1s' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Topics</h2>
                            {selectedSubject && (
                                <button
                                    onClick={() => openCreateModal('topic')}
                                    className="text-sm btn btn-secondary py-1 px-3"
                                >
                                    <Plus className="w-3 h-3" />
                                    Add
                                </button>
                            )}
                        </div>
                        {!selectedSubject ? (
                            <p className="text-sm text-gray-500 text-center py-12">
                                Select a subject to view topics
                            </p>
                        ) : topics.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-12">
                                No topics yet
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                {topics.map((topic) => (
                                    <div
                                        key={topic.id}
                                        className={`p-3 rounded-lg cursor-pointer transition-all ${selectedTopic === topic.id
                                            ? 'bg-secondary text-white'
                                            : 'hover:bg-gray-100'
                                            }`}
                                        onClick={() => handleTopicClick(topic.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-sm">{topic.name}</span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditModal('topic', topic);
                                                    }}
                                                    className="p-1 hover:bg-emerald-100 rounded"
                                                >
                                                    <Edit className="w-3 h-3 text-emerald-500" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete('topic', topic.id);
                                                    }}
                                                    className="p-1 hover:bg-red-100 rounded"
                                                >
                                                    <Trash2 className="w-3 h-3 text-red-500" />
                                                </button>
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Subtopics */}
                    <div className="glass-surface p-6 animate-slide-in" style={{ animationDelay: '0.2s' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Subtopics</h2>
                            {selectedTopic && (
                                <button
                                    onClick={() => openCreateModal('subtopic')}
                                    className="text-sm btn btn-secondary py-1 px-3"
                                >
                                    <Plus className="w-3 h-3" />
                                    Add
                                </button>
                            )}
                        </div>
                        {!selectedTopic ? (
                            <p className="text-sm text-gray-500 text-center py-12">
                                Select a topic to view subtopics
                            </p>
                        ) : subtopics.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-12">
                                No subtopics yet
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                {subtopics.map((subtopic) => (
                                    <div
                                        key={subtopic.id}
                                        className="p-3 rounded-lg hover:bg-gray-100 transition-all"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-sm text-gray-900">{subtopic.name}</span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditModal('subtopic', subtopic);
                                                    }}
                                                    className="p-1 hover:bg-emerald-100 rounded"
                                                >
                                                    <Edit className="w-3 h-3 text-emerald-500" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete('subtopic', subtopic.id);
                                                    }}
                                                    className="p-1 hover:bg-red-100 rounded"
                                                >
                                                    <Trash2 className="w-3 h-3 text-red-500" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="glass-surface p-8 max-w-md w-full animate-scale-in">
                        <h3 className="text-2xl font-bold text-gray-900 mb-6">
                            {editingItem ? 'Edit' : 'Create New'} {modalType.charAt(0).toUpperCase() + modalType.slice(1)}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input"
                                    placeholder={`Enter ${modalType} name`}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="input min-h-[100px]"
                                    placeholder="Optional description"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Sequence</label>
                                <input
                                    type="number"
                                    value={formData.sequence}
                                    onChange={(e) => setFormData({ ...formData, sequence: parseInt(e.target.value) })}
                                    className="input"
                                    min="1"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowModal(false)}
                                className="btn btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="btn btn-primary flex-1"
                                disabled={!formData.name}
                            >
                                {editingItem ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
