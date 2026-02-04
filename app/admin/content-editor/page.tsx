'use client';

import React from 'react';
import { Save, FileText, Eye, ChevronDown } from 'lucide-react';
import { useUI } from '@/lib/context/UIContext';
import ReactMarkdown from 'react-markdown';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { supabase } from '@/lib/supabase/client';

export default function ContentEditorPage() {
    const [user, setUser] = React.useState<any>(null);
    const [viewMode, setViewMode] = React.useState<'edit' | 'split' | 'preview'>('split');
    const [content, setContent] = React.useState<string>('');
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const { isSidebarCollapsed } = useUI();

    // Hierarchy State
    const [subjects, setSubjects] = React.useState<any[]>([]);
    const [topics, setTopics] = React.useState<any[]>([]);
    const [subtopics, setSubtopics] = React.useState<any[]>([]);

    const [selectedSubject, setSelectedSubject] = React.useState<string>('');
    const [selectedTopic, setSelectedTopic] = React.useState<string>('');
    const [selectedSubtopic, setSelectedSubtopic] = React.useState<string>('');

    React.useEffect(() => {
        const currentUser = AuthService.getCurrentUser();
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('aptivo_user') : null;
        if (currentUser) setUser(currentUser);
        else if (storedUser) setUser(JSON.parse(storedUser));

        loadSubjects();
    }, []);

    const loadSubjects = async () => {
        const { data } = await supabase.from('subjects').select('id, name').order('name');
        if (data) setSubjects(data);
    };

    React.useEffect(() => {
        if (selectedSubject) {
            loadTopics(parseInt(selectedSubject));
            setTopics([]);
            setSubtopics([]);
            setSelectedTopic('');
            setSelectedSubtopic('');
            setContent('');
        }
    }, [selectedSubject]);

    const loadTopics = async (subjectId: number) => {
        const { data } = await supabase.from('topics').select('id, name').eq('subject_id', subjectId).order('name');
        if (data) setTopics(data);
    };

    React.useEffect(() => {
        if (selectedTopic) {
            loadSubtopics(parseInt(selectedTopic));
            setSubtopics([]);
            setSelectedSubtopic('');
            setContent('');
        }
    }, [selectedTopic]);

    const loadSubtopics = async (topicId: number) => {
        const { data } = await supabase.from('subtopics').select('id, name').eq('topic_id', topicId).order('name');
        if (data) setSubtopics(data);
    };

    React.useEffect(() => {
        if (selectedSubtopic) {
            loadContent(parseInt(selectedSubtopic));
        } else {
            setContent('');
        }
    }, [selectedSubtopic]);

    const loadContent = async (subtopicId: number) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('subtopics')
            .select('content_markdown')
            .eq('id', subtopicId)
            .single();

        if (data) {
            setContent(data.content_markdown || '');
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!selectedSubtopic) {
            alert('Please select a subtopic first.');
            return;
        }

        setSaving(true);
        const { error } = await supabase
            .from('subtopics')
            .update({ content_markdown: content })
            .eq('id', parseInt(selectedSubtopic));

        if (error) {
            alert('Failed to save: ' + error.message);
        } else {
            alert('Content saved successfully!');
        }
        setSaving(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="super_admin" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name || 'Admin'} userEmail={user?.email || 'admin@aptivo.edu'} />

                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8 flex flex-col min-h-0">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 flex-shrink-0">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Markdown Content Editor</h1>
                            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Create and edit educational content with full Markdown and LaTeX support.</p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                            {/* View Filters */}
                            <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm overflow-x-auto">
                                <button
                                    onClick={() => setViewMode('edit')}
                                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'edit' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => setViewMode('split')}
                                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'split' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Split
                                </button>
                                <button
                                    onClick={() => setViewMode('preview')}
                                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'preview' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Preview
                                </button>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={saving || !selectedSubtopic}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-black uppercase tracking-wider text-[11px] rounded-xl hover:bg-slate-900 transition-all shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50"
                            >
                                <Save className={`${saving ? 'animate-spin' : 'w-4 h-4'}`} />
                                {saving ? 'Saving...' : 'Save Content'}
                            </button>
                        </div>
                    </div>

                    <div className="mb-6 flex-shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Subject</label>
                            <div className="relative">
                                <select
                                    value={selectedSubject}
                                    onChange={(e) => setSelectedSubject(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl appearance-none text-slate-800 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                                >
                                    <option value="">Select Subject</option>
                                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Topic</label>
                            <div className="relative">
                                <select
                                    value={selectedTopic}
                                    onChange={(e) => setSelectedTopic(e.target.value)}
                                    disabled={!selectedSubject}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl appearance-none text-slate-800 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm disabled:opacity-50"
                                >
                                    <option value="">Select Topic</option>
                                    {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Subtopic</label>
                            <div className="relative">
                                <select
                                    value={selectedSubtopic}
                                    onChange={(e) => setSelectedSubtopic(e.target.value)}
                                    disabled={!selectedTopic}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl appearance-none text-slate-800 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm disabled:opacity-50"
                                >
                                    <option value="">Select Subtopic</option>
                                    {subtopics.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Editor Area */}
                    <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex relative">
                        {loading && (
                            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-[2px]">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                            </div>
                        )}

                        {!selectedSubtopic && !loading && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50/10">
                                <p className="text-slate-400 font-medium">Please select a subtopic above to start editing content</p>
                            </div>
                        )}

                        {/* Markdown Input */}
                        {(viewMode === 'edit' || viewMode === 'split') && (
                            <div className={`flex flex-col border-r border-gray-200 ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
                                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <FileText className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Markdown Editor</span>
                                    </div>
                                </div>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    disabled={!selectedSubtopic}
                                    className="flex-1 w-full p-6 resize-none focus:outline-none font-mono text-sm text-slate-800 leading-relaxed custom-scrollbar disabled:bg-gray-50/30"
                                    spellCheck={false}
                                    placeholder="Start typing your content here..."
                                />
                            </div>
                        )}

                        {/* Live Preview */}
                        {(viewMode === 'preview' || viewMode === 'split') && (
                            <div className={`flex flex-col bg-white ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
                                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Eye className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Live Preview</span>
                                    </div>
                                </div>
                                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar prose prose-slate max-w-none">
                                    {content ? (
                                        <ReactMarkdown>{content}</ReactMarkdown>
                                    ) : (
                                        <p className="text-slate-300 italic">Preview will appear here</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Info */}
                    <div className="mt-4 flex justify-between items-center text-xs text-slate-400 px-2 flex-shrink-0">
                        <div className="flex gap-4">
                            <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Markdown Supported</span>
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> Real-time Preview</span>
                        </div>
                        <span className="font-mono">{content.length} characters</span>
                    </div>
                </main>
            </div>
        </div>
    );
}
