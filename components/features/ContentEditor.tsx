'use client';

import React from 'react';
import {
    Save, FileText, Eye, ChevronDown, BookOpen,
    Bold, Italic, List, Heading1, Heading2, Quote, Code, Link as LinkIcon,
    Table as TableIcon, Image as ImageIcon, Minus, Braces, AlertCircle,
    Plus, Search, ChevronRight
} from 'lucide-react';
import { AuthService } from '@/lib/services/authService';
// Removed Supabase import - using MongoDB API routes
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';
import { useSearchParams } from 'next/navigation';
import { useLoading } from '@/lib/context/LoadingContext';

export default function ContentEditor() {
    const searchParams = useSearchParams();
    const [user, setUser] = React.useState<any>(null);
    const [userRole, setUserRole] = React.useState<string>('student');
    const [viewMode, setViewMode] = React.useState<'edit' | 'split' | 'preview'>('preview');
    const [content, setContent] = React.useState<string>('');
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();

    const isReadOnly = userRole === 'institution_admin';

    // Update view mode if role is institution_admin
    React.useEffect(() => {
        if (isReadOnly) setViewMode('preview');
    }, [isReadOnly]);

    // Hierarchy State
    const [subjects, setSubjects] = React.useState<any[]>([]);
    const [topics, setTopics] = React.useState<any[]>([]);
    const [subtopics, setSubtopics] = React.useState<any[]>([]);

    const [selectedSubject, setSelectedSubject] = React.useState<string>('');
    const [selectedTopic, setSelectedTopic] = React.useState<string>('');
    const [selectedSubtopic, setSelectedSubtopic] = React.useState<string>('');

    // Editor Ref
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    // Text Insertion Helper
    const insertFormat = (type: string) => {
        if (!textareaRef.current) return;
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const beforeSelection = text.substring(0, start);
        const selection = text.substring(start, end);
        const afterSelection = text.substring(end);

        let before = '', after = '';

        switch (type) {
            case 'bold': before = '**'; after = '**'; break;
            case 'italic': before = '_'; after = '_'; break;
            case 'h1': before = '# '; after = ''; break;
            case 'h2': before = '## '; after = ''; break;
            case 'ul': before = '- '; after = ''; break;
            case 'ol': before = '1. '; after = ''; break;
            case 'quote': before = '> '; after = ''; break;
            case 'code': before = '`'; after = '`'; break;
            case 'codeblock': before = '```\n'; after = '\n```'; break;
            case 'link': before = '['; after = '](url)'; break;
            case 'image': before = '!['; after = '](url)'; break;
            case 'table':
                before = '\n| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |\n';
                after = '';
                break;
            case 'math': before = '$'; after = '$'; break;
            case 'mathblock': before = '\n$$\n'; after = '\n$$\n'; break;
        }

        const newText = beforeSelection + before + selection + after + afterSelection;
        setContent(newText);

        setTimeout(() => {
            textarea.focus();
            if (selection.length > 0) {
                textarea.setSelectionRange(start + before.length, end + before.length);
            } else {
                textarea.setSelectionRange(start + before.length, start + before.length);
            }
        }, 0);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
        }

        setGlobalLoading(true, 'Optimizing Media Asset...');
        try {
            // Use our MongoDB GridFS upload API
            const formData = new FormData();
            formData.append('file', file);
            formData.append('bucket', 'lessons');

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Upload failed');
            }

            const { publicUrl } = await res.json();

            if (textareaRef.current) {
                const textarea = textareaRef.current;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const text = textarea.value;
                const beforeSelection = text.substring(0, start);
                const afterSelection = text.substring(end);

                const imageMarkdown = `\n![Image Description](${publicUrl})\n`;
                const newText = beforeSelection + imageMarkdown + afterSelection;

                setContent(newText);

                setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(start + imageMarkdown.length, start + imageMarkdown.length);
                }, 0);
            }
        } catch (error: any) {
            alert('Error uploading image: ' + error.message);
        } finally {
            setGlobalLoading(false);
            if (e.target) e.target.value = '';
        }
    };

    React.useEffect(() => {
        const currentUser = AuthService.getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
            setUserRole(currentUser.role || 'student');
        }
        loadSubjects();
    }, []);

    // Handle deep links from Search Results
    React.useEffect(() => {
        const subId = searchParams.get('subject');
        const topId = searchParams.get('topic');
        const subtId = searchParams.get('subtopic');

        if (subtId) {
            const fetchHierarchy = async () => {
                const res = await fetch(`/api/mongo/content?type=subtopics&id=${subtId}`);
                const data = await res.json();
                const st = data.subtopics?.[0];

                if (st) {
                    // Get topic to find subject_id
                    const tRes = await fetch(`/api/mongo/content?type=topics&id=${st.topic_id}`);
                    const tData = await tRes.json();
                    const topic = tData.topics?.[0];

                    if (topic) {
                        setSelectedSubject(topic.subject_id.toString());
                        setSelectedTopic(st.topic_id.toString());
                        setSelectedSubtopic(st.id.toString());
                    }
                }
            };
            fetchHierarchy();
        } else if (topId) {
            const fetchHierarchy = async () => {
                const res = await fetch(`/api/mongo/content?type=topics&id=${topId}`);
                const data = await res.json();
                const t = data.topics?.[0];

                if (t) {
                    setSelectedSubject(t.subject_id.toString());
                    setSelectedTopic(t.id.toString());
                }
            };
            fetchHierarchy();
        } else if (subId) {
            setSelectedSubject(subId);
        }
    }, [searchParams]);

    const loadSubjects = async () => {
        const res = await fetch('/api/mongo/content?type=subjects');
        const data = await res.json();
        if (data.subjects) setSubjects(data.subjects);
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
        const res = await fetch(`/api/mongo/content?type=topics&subject_id=${subjectId}`);
        const data = await res.json();
        setTopics(data.topics || []);
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
        const res = await fetch(`/api/mongo/content?type=subtopics&topic_id=${topicId}`);
        const data = await res.json();
        setSubtopics(data.subtopics || []);
    };

    React.useEffect(() => {
        if (selectedSubtopic) {
            loadContent(selectedSubtopic);
        } else if (selectedTopic && selectedSubtopic === '') {
            setContent('');
        } else {
            setContent('');
        }
    }, [selectedSubtopic, selectedTopic]);

    const loadContent = async (subId: string) => {
        setGlobalLoading(true, 'Retrieving Intellectual Property...');
        try {
            if (subId === 'no_subtopic') {
                const res = await fetch(`/api/mongo/content?type=topics&id=${selectedTopic}`);
                const data = await res.json();
                const topic = data.topics?.[0];
                setContent(topic?.content_markdown || '');
            } else {
                const res = await fetch(`/api/mongo/content?type=subtopics&id=${subId}`);
                const data = await res.json();
                const subtopic = data.subtopics?.[0];
                setContent(subtopic?.content_markdown || '');
            }
        } finally {
            setGlobalLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedTopic) {
            alert('Please select a topic first.');
            return;
        }

        setGlobalLoading(true, 'Committing Changes to Repository...');
        try {
            let targetSubtopicId = selectedSubtopic;

            if (selectedSubtopic === 'no_subtopic') {
                const res = await fetch('/api/mongo/content/update', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: parseInt(selectedTopic),
                        type: 'topic',
                        content_markdown: content
                    })
                });
                if (!res.ok) throw new Error('Failed to save topic');
                alert('Topic content saved successfully!');
                return;
            }

            if (!targetSubtopicId) {
                alert('Target subtopic not found.');
                return;
            }

            const res = await fetch('/api/mongo/content/update', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: parseInt(targetSubtopicId),
                    type: 'subtopic',
                    content_markdown: content
                })
            });
            if (!res.ok) throw new Error('Failed to save subtopic');

            alert('Content saved successfully!');
        } catch (err: any) {
            console.error(err);
            alert('Save failed: ' + err.message);
        } finally {
            setGlobalLoading(false);
        }
    };

    if (isReadOnly) {
        return (
            <div className="flex-1 flex flex-col h-full space-y-8 animate-in fade-in duration-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Global Content Library</h1>
                        <p className="text-slate-500 font-medium mt-1">Platform-wide overview of educational material and structure.</p>
                    </div>
                </div>

                <div className="flex-1 flex gap-8 min-h-0">
                    <div className="w-80 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-slate-50">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    placeholder="Filter global tree..."
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {subjects.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => setSelectedSubject(s.id.toString())}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${selectedSubject === s.id.toString() ? 'bg-teal-50 text-teal-700' : 'hover:bg-slate-50 text-slate-500'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${selectedSubject === s.id.toString() ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-white transition-colors'}`}>
                                            <BookOpen className="w-4 h-4" />
                                        </div>
                                        <span className="font-bold text-sm tracking-tight">{s.name}</span>
                                    </div>
                                    <ChevronRight className={`w-4 h-4 transition-transform ${selectedSubject === s.id.toString() ? 'translate-x-0' : '-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0'}`} />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col relative">
                        {selectedSubtopic ? (
                            <div className="flex-1 overflow-y-auto custom-scrollbar pt-32 pb-12 px-12">
                                <div className="prose prose-slate max-w-none">
                                    <MarkdownRenderer content={content} />
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                <div className="w-32 h-32 bg-teal-50 rounded-full flex items-center justify-center mb-8 relative">
                                    <div className="absolute inset-0 bg-teal-100 rounded-full animate-ping opacity-20" />
                                    <BookOpen className="w-16 h-16 text-teal-300 relative z-10" />
                                </div>
                                <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-4">Audit Global Content</h2>
                                <p className="text-slate-500 font-medium max-w-md leading-relaxed">
                                    Browse the platform hierarchy to view published material across all subjects and topics. Select a subject from the left panel to begin.
                                </p>
                            </div>
                        )}

                        {selectedSubject && (
                            <div className="absolute inset-x-0 top-0 p-6 bg-white/95 backdrop-blur-md border-b border-slate-50 z-20 shadow-sm">
                                <div className="flex gap-4">
                                    <select
                                        value={selectedTopic}
                                        onChange={(e) => setSelectedTopic(e.target.value)}
                                        className="flex-1 px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black uppercase tracking-widest text-slate-900 focus:ring-2 focus:ring-teal-500/20"
                                    >
                                        <option value="">Select Topic</option>
                                        {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                    <select
                                        value={selectedSubtopic}
                                        onChange={(e) => setSelectedSubtopic(e.target.value)}
                                        disabled={!selectedTopic}
                                        className="flex-1 px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-black uppercase tracking-widest text-slate-900 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50"
                                    >
                                        <option value="">Select Subtopic</option>
                                        <option value="no_subtopic">-- Topic Overview --</option>
                                        {subtopics.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 h-full">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 flex-shrink-0">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Markdown Content Editor
                    </h1>
                    <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">
                        Create and edit educational content with full Markdown and LaTeX support.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                    <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm overflow-x-auto">
                        <button
                            onClick={() => setViewMode('edit')}
                            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'edit' ? 'bg-teal-600 text-white shadow-lg shadow-teal-100' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => setViewMode('split')}
                            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'split' ? 'bg-teal-600 text-white shadow-lg shadow-teal-100' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Split
                        </button>
                        <button
                            onClick={() => setViewMode('preview')}
                            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'preview' ? 'bg-teal-600 text-white shadow-lg shadow-teal-100' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Preview
                        </button>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={loading || !selectedTopic || (!selectedSubtopic && selectedSubtopic !== 'no_subtopic')}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-teal-600 text-white font-black uppercase tracking-wider text-[11px] rounded-xl hover:bg-slate-900 transition-all shadow-lg shadow-teal-100 active:scale-95 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        Save Content
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
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl appearance-none text-slate-800 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-sm"
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
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl appearance-none text-slate-800 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-sm disabled:opacity-50"
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
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl appearance-none text-slate-800 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-sm disabled:opacity-50"
                        >
                            <option value="">Select Subtopic</option>
                            <option value="no_subtopic" className="text-teal-600 font-black italic">-- NO SUBTOPIC (Topic Level) --</option>
                            {subtopics.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex relative">
                {!selectedSubtopic && !loading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50/10">
                        <p className="text-slate-400 font-medium">Please select a topic or subtopic above to start editing content</p>
                    </div>
                )}

                {(viewMode === 'edit' || viewMode === 'split') && (
                    <div className={`flex flex-col border-r border-gray-200 ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
                        <div className="px-4 py-2 border-b border-gray-100 bg-white flex items-center gap-1 overflow-x-auto no-scrollbar">
                            <button onClick={() => insertFormat('bold')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-teal-600" title="Bold">
                                <Bold className="w-4 h-4" />
                            </button>
                            <button onClick={() => insertFormat('italic')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-teal-600" title="Italic">
                                <Italic className="w-4 h-4" />
                            </button>
                            <div className="w-px h-4 bg-slate-200 mx-1"></div>
                            <button onClick={() => insertFormat('h1')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-teal-600" title="Heading 1">
                                <Heading1 className="w-4 h-4" />
                            </button>
                            <button onClick={() => insertFormat('h2')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-teal-600" title="Heading 2">
                                <Heading2 className="w-4 h-4" />
                            </button>
                            <div className="w-px h-4 bg-slate-200 mx-1"></div>
                            <button onClick={() => insertFormat('ul')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-teal-600" title="Bullet List">
                                <List className="w-4 h-4" />
                            </button>
                            <button onClick={() => insertFormat('quote')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-teal-600" title="Quote">
                                <Quote className="w-4 h-4" />
                            </button>
                            <div className="w-px h-4 bg-slate-200 mx-1"></div>
                            <button onClick={() => insertFormat('code')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-teal-600" title="Inline Code">
                                <Code className="w-4 h-4" />
                            </button>
                            <button onClick={() => insertFormat('link')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-teal-600" title="Link">
                                <LinkIcon className="w-4 h-4" />
                            </button>
                            <div className="relative group/upload">
                                <button
                                    onClick={() => document.getElementById('image-upload')?.click()}
                                    className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-teal-600 flex items-center gap-1"
                                    title="Upload Image"
                                >
                                    <ImageIcon className="w-4 h-4" />
                                </button>
                                <div className="absolute top-10 left-0 w-64 p-3 bg-slate-900 text-white rounded-xl text-[9px] font-bold opacity-0 group-hover/upload:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                                    <p className="text-teal-400 uppercase tracking-widest mb-1">✨ Image Resizing Pro-Tip</p>
                                    <p className="leading-relaxed">To resize, add a pipe and width after alt text: <br /><code className="text-emerald-400">![description|450](url)</code></p>
                                </div>
                                <input id="image-upload" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </div>
                            <button onClick={() => insertFormat('table')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-teal-600" title="Table">
                                <TableIcon className="w-4 h-4" />
                            </button>
                            <div className="w-px h-4 bg-slate-200 mx-1"></div>
                            <button onClick={() => insertFormat('math')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-teal-600 font-serif italic font-bold" title="Math Formula">Σ</button>
                            <button onClick={() => insertFormat('mathblock')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-teal-600 font-bold" title="Math Block"><div className="flex text-[10px] font-bold">$$</div></button>
                        </div>
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            disabled={loading || isReadOnly || (!selectedTopic && !selectedSubtopic)}
                            className="flex-1 w-full p-6 resize-none focus:outline-none font-mono text-sm text-slate-800 leading-relaxed custom-scrollbar disabled:bg-gray-50/10"
                            spellCheck={false}
                            placeholder="# Lesson Title..."
                        />
                    </div>
                )}

                {(viewMode === 'preview' || viewMode === 'split') && (
                    <div className={`flex flex-col bg-white ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
                        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Eye className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Live Preview</span>
                            </div>
                        </div>
                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar prose max-w-none">
                            {content ? (
                                <MarkdownRenderer content={content} />
                            ) : (
                                <p className="text-slate-300 italic">Preview will appear here</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-4 flex justify-between items-center text-xs text-slate-400 px-2 flex-shrink-0">
                <div className="flex gap-4">
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Markdown Supported</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> Real-time Preview</span>
                </div>
                <span className="font-mono">{content.length} characters</span>
            </div>
        </div >
    );
}
