'use client';

import React from 'react';
import {
    Save, FileText, Eye, ChevronDown,
    Bold, Italic, List, Heading1, Heading2, Quote, Code, Link as LinkIcon,
    Table as TableIcon, Image as ImageIcon, Minus, Braces
} from 'lucide-react';
import { useUI } from '@/lib/context/UIContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
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

        let newText = text;
        let newCursorPos = start;

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

        newText = beforeSelection + before + selection + after + afterSelection;
        setContent(newText);

        // Restore focus and cursor
        setTimeout(() => {
            textarea.focus();
            if (selection.length > 0) {
                textarea.setSelectionRange(start + before.length, end + before.length);
            } else {
                textarea.setSelectionRange(start + before.length, start + before.length);
            }
        }, 0);
    };

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
        if (data) {
            setSubtopics(data);
        } else {
            setSubtopics([]);
        }
    };

    React.useEffect(() => {
        if (selectedSubtopic) {
            loadContent(selectedSubtopic);
        } else {
            setContent('');
        }
    }, [selectedSubtopic]);

    const loadContent = async (subId: string) => {
        setLoading(true);
        if (subId === 'no_subtopic') {
            const { data } = await supabase
                .from('subtopics')
                .select('content_markdown')
                .eq('topic_id', selectedTopic)
                .eq('name', 'General')
                .single();

            setContent(data?.content_markdown || '');
        } else {
            const { data } = await supabase
                .from('subtopics')
                .select('content_markdown')
                .eq('id', parseInt(subId))
                .single();

            setContent(data?.content_markdown || '');
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!selectedTopic) {
            alert('Please select a topic first.');
            return;
        }

        setSaving(true);
        let targetSubtopicId = selectedSubtopic;

        // If "No Subtopic" selected, handle "General" subtopic
        if (selectedSubtopic === 'no_subtopic') {
            // Check if "General" already exists
            const { data: existing } = await supabase
                .from('subtopics')
                .select('id')
                .eq('topic_id', selectedTopic)
                .eq('name', 'General')
                .single();

            if (existing) {
                targetSubtopicId = existing.id.toString();
            } else {
                // Create "General" subtopic
                const { data: created, error: createErr } = await supabase
                    .from('subtopics')
                    .insert({ topic_id: parseInt(selectedTopic), name: 'General' })
                    .select('id')
                    .single();

                if (createErr) {
                    alert('Failed to create general subtopic: ' + createErr.message);
                    setSaving(false);
                    return;
                }
                targetSubtopicId = created.id.toString();
                // Refresh list
                loadSubtopics(parseInt(selectedTopic));
            }
        }

        if (!targetSubtopicId) {
            alert('Target subtopic not found.');
            setSaving(false);
            return;
        }

        const { error } = await supabase
            .from('subtopics')
            .update({ content_markdown: content })
            .eq('id', parseInt(targetSubtopicId));

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
                                disabled={saving || !selectedTopic || (!selectedSubtopic && selectedSubtopic !== 'no_subtopic')}
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
                                    <option value="no_subtopic" className="text-indigo-600 font-black italic">-- NO SUBTOPIC (Topic Level) --</option>
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
                                <p className="text-slate-400 font-medium">Please select a topic or subtopic above to start editing content</p>
                            </div>
                        )}

                        {/* Markdown Input */}
                        {(viewMode === 'edit' || viewMode === 'split') && (
                            <div className={`flex flex-col border-r border-gray-200 ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
                                <div className="px-4 py-2 border-b border-gray-100 bg-white flex items-center gap-1 overflow-x-auto no-scrollbar">
                                    <button onClick={() => insertFormat('bold')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600" title="Bold">
                                        <Bold className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => insertFormat('italic')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600" title="Italic">
                                        <Italic className="w-4 h-4" />
                                    </button>
                                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                    <button onClick={() => insertFormat('h1')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600" title="Heading 1">
                                        <Heading1 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => insertFormat('h2')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600" title="Heading 2">
                                        <Heading2 className="w-4 h-4" />
                                    </button>
                                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                    <button onClick={() => insertFormat('ul')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600" title="Bullet List">
                                        <List className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => insertFormat('quote')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600" title="Quote">
                                        <Quote className="w-4 h-4" />
                                    </button>
                                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                    <button onClick={() => insertFormat('code')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600" title="Inline Code">
                                        <Code className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => insertFormat('link')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600" title="Link">
                                        <LinkIcon className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => insertFormat('table')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600" title="Table">
                                        <TableIcon className="w-4 h-4" />
                                    </button>
                                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                    <button onClick={() => insertFormat('math')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600 font-serif italic font-bold" title="Math Formula">
                                        Σ
                                    </button>
                                    <button onClick={() => insertFormat('mathblock')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600 font-bold" title="Math Block">
                                        <div className="flex text-[10px] font-bold">$$</div>
                                    </button>
                                </div>
                                <textarea
                                    ref={textareaRef}
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    disabled={!selectedTopic && !selectedSubtopic}
                                    className="flex-1 w-full p-6 resize-none focus:outline-none font-mono text-sm text-slate-800 leading-relaxed custom-scrollbar disabled:bg-gray-50/30"
                                    spellCheck={false}
                                    placeholder={`Start typing your content here...

Tips:
- Use # for headers
- **bold**, _italic_
- - bullet list
- $E=mc^2$ for inline math
- $$ x^2 $$ for block math`}
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
                                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar prose prose-slate max-w-none 
                                    prose-headings:font-black prose-headings:text-slate-900 prose-headings:tracking-tight prose-headings:mt-10 prose-headings:mb-6
                                    prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl 
                                    prose-p:text-slate-700 prose-p:leading-[2.2] prose-p:mb-8
                                    prose-ul:my-8 prose-li:text-slate-700 prose-li:my-3 prose-li:leading-loose
                                    prose-strong:text-slate-900 prose-strong:font-bold
                                    prose-code:bg-slate-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:text-indigo-600
                                    prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-2xl prose-pre:p-8
                                    prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50 prose-blockquote:p-6 prose-blockquote:rounded-r-2xl prose-blockquote:my-10
                                    [&_.katex-display]:flex [&_.katex-display]:justify-center [&_.katex-display]:my-10 [&_.katex-display]:overflow-x-auto [&_.katex-display]:py-4
                                ">
                                    {content ? (
                                        <ReactMarkdown
                                            remarkPlugins={[remarkMath, remarkGfm]}
                                            rehypePlugins={[rehypeKatex]}
                                        >
                                            {content}
                                        </ReactMarkdown>
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
