'use client';

import React, { useEffect, useState } from 'react';
import {
    Plus, ChevronRight, ChevronDown,
    Layers, Hash, FileText,
    Search, RefreshCw, BookOpen,
    Eye, Edit3, Type, Bold, Italic,
    List, ListOrdered, Code, Terminal,
    Sigma, Heading2, Quote, Image as ImageIcon, Loader2
} from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { supabase } from '@/lib/supabase/client';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import Link from 'next/link';
import { toast } from 'sonner';
import { X, Save } from 'lucide-react';
import { useUI } from '@/lib/context/UIContext';

// Data Type
type HierarchyItem = {
    id: string;
    dbId: number;
    type: 'subject' | 'topic' | 'subtopic';
    title: string;
    children?: HierarchyItem[];
    expanded?: boolean;
    content?: string;
};

export default function SuperAdminContentLibraryPage() {
    const [user, setUser] = useState<any>(null);
    const [data, setData] = useState<HierarchyItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState<HierarchyItem | null>(null);

    // Content Editor Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isImageUploading, setIsImageUploading] = useState(false);


    // Editor Ref
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    // Text Insertion Helper
    const insertFormat = (type: string) => {
        if (!textareaRef.current) return;
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selected = text.substring(start, end);

        let before = '';
        let after = '';

        switch (type) {
            case 'bold': before = '**'; after = '**'; break;
            case 'italic': before = '*'; after = '*'; break;
            case 'h2': before = '\n## '; after = ''; break;
            case 'quote': before = '\n> '; after = ''; break;
            case 'bullet': before = '\n- '; after = ''; break;
            case 'number': before = '\n1. '; after = ''; break;
            case 'code': before = '`'; after = '`'; break;
            case 'codeblock': before = '\n```\n'; after = '\n```\n'; break;
            case 'math': before = '$'; after = '$'; break;
            case 'mathblock': before = '\n$$\n'; after = '\n$$\n'; break;
        }

        // If something was selected, wrap it. If not, insert placeholder if needed? 
        // For simplicity, just wrap/insert.
        const newText = text.substring(0, start) + before + selected + after + text.substring(end);
        setEditContent(newText);

        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + before.length + selected.length + after.length;
            // Or ideally put cursor inside?
            // textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
        }, 0);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file.');
            return;
        }

        setIsImageUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const filePath = `inline/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('lessons')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('lessons')
                .getPublicUrl(filePath);

            if (textareaRef.current) {
                const textarea = textareaRef.current;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const text = textarea.value;

                const imageMarkdown = `\n![Image Description](${publicUrl})\n`;
                const newText = text.substring(0, start) + imageMarkdown + text.substring(end);

                setEditContent(newText);

                setTimeout(() => {
                    textarea.focus();
                    textarea.setSelectionRange(start + imageMarkdown.length, start + imageMarkdown.length);
                }, 0);
            }
        } catch (error: any) {
            toast.error('Error uploading image: ' + error.message);
        } finally {
            setIsImageUploading(false);
            e.target.value = '';
        }
    };



    const loadHierarchy = async () => {
        setLoading(true);
        try {
            // Fetch all subjects, topics, subtopics for global view
            const { data: subjects } = await supabase.from('subjects').select('*').order('name');
            const { data: topics } = await supabase.from('topics').select('*').order('name');
            const { data: subtopics } = await supabase.from('subtopics').select('*').order('name');

            if (subjects) {
                const tree: HierarchyItem[] = subjects.map((s: any) => ({
                    id: `s-${s.id}`,
                    dbId: s.id,
                    type: 'subject',
                    title: s.name,
                    expanded: false,
                    children: topics?.filter((t: any) => t.subject_id === s.id).map((t: any) => ({
                        id: `t-${t.id}`,
                        dbId: t.id,
                        type: 'topic',
                        title: t.name,
                        content: t.content_markdown,
                        expanded: false,
                        children: subtopics?.filter((st: any) => st.topic_id === t.id).map((st: any) => ({
                            id: `st-${st.id}`,
                            dbId: st.id,
                            type: 'subtopic',
                            title: st.name,
                            content: st.content_markdown
                        })) || []
                    })) || []
                }));
                setData(tree);

                // Update selectedItem if it exists
                if (selectedItem) {
                    const findInItems = (items: HierarchyItem[]): HierarchyItem | null => {
                        for (const item of items) {
                            if (item.id === selectedItem.id) return item;
                            if (item.children) {
                                const found = findInItems(item.children);
                                if (found) return found;
                            }
                        }
                        return null;
                    };
                    const updated = findInItems(tree);
                    if (updated) setSelectedItem(updated);
                }
            }
        } catch (error) {
            console.error("Error loading library:", error);
            toast.error("Failed to load hierarchy");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEditor = () => {
        if (!selectedItem) return;
        const content = selectedItem.content || '';
        setEditContent(content);
        setIsEditModalOpen(true);
    };

    const handleSaveContent = async () => {
        if (!selectedItem) return;
        setIsSaving(true);
        try {
            const table = selectedItem.type === 'subtopic' ? 'subtopics' : 'topics';
            const { error } = await supabase
                .from(table)
                .update({ content_markdown: editContent })
                .eq('id', selectedItem.dbId);

            if (error) throw error;

            toast.success("Content saved successfully");
            setIsEditModalOpen(false);
            loadHierarchy();
        } catch (err: any) {
            console.error("Save error:", err);
            toast.error(err.message || "Failed to save content");
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        const currentUser = AuthService.getCurrentUser();
        if (currentUser) setUser(currentUser);
        loadHierarchy();
    }, []);

    const toggleExpand = (id: string, items: HierarchyItem[]): HierarchyItem[] => {
        return items.map(item => {
            if (item.id === id) {
                return { ...item, expanded: !item.expanded };
            }
            if (item.children) {
                return { ...item, children: toggleExpand(id, item.children) };
            }
            return item;
        });
    };

    const handleExpandCallback = (id: string) => {
        setData(toggleExpand(id, data));
    };

    const renderTree = (items: HierarchyItem[], level = 0) => {
        const filtered = items.filter(item =>
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.children && item.children.some(child => child.title.toLowerCase().includes(searchQuery.toLowerCase())))
        );

        return filtered.map((item) => (
            <div key={item.id} className="select-none">
                <div
                    className={`
                        group flex items-center gap-3 py-2.5 px-4 border-b border-slate-800/20 hover:bg-indigo-600/10 transition-all cursor-pointer
                        ${selectedItem?.id === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-transparent text-slate-400'}
                    `}
                    style={{ paddingLeft: `${level * 16 + 16}px` }}
                    onClick={() => {
                        if (item.type === 'subject' || item.type === 'topic') {
                            handleExpandCallback(item.id);
                        }

                        // Select if topic or subtopic
                        if (item.type === 'topic' || item.type === 'subtopic') {
                            setSelectedItem(item);
                        }
                    }}
                >
                    {/* Expand Toggle */}
                    <div className={`p-1 rounded ${selectedItem?.id === item.id ? 'text-white' : 'text-slate-500'} ${!item.children || item.children.length === 0 ? 'invisible' : ''}`}>
                        {item.expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </div>

                    {/* Icon */}
                    <div className={`
                        w-6 h-6 rounded flex items-center justify-center
                        ${selectedItem?.id === item.id ? 'bg-white/20 text-white' :
                            item.type === 'subject' ? 'bg-purple-500/10 text-purple-400' :
                                item.type === 'topic' ? 'bg-blue-500/10 text-blue-400' :
                                    'bg-emerald-500/10 text-emerald-400'}
                    `}>
                        {item.type === 'subject' && <Layers className="w-3 h-3" />}
                        {item.type === 'topic' && <Hash className="w-3 h-3" />}
                        {item.type === 'subtopic' && <FileText className="w-3 h-3" />}
                    </div>

                    {/* Content */}
                    <div className={`flex-1 text-xs font-bold truncate ${selectedItem?.id === item.id ? 'text-white' : 'text-slate-300'}`}>
                        {item.title}
                    </div>

                    {(item.type === 'subtopic' || item.type === 'topic') && (
                        <Eye className={`w-3 h-3 transition-opacity ${selectedItem?.id === item.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`} />
                    )}
                </div>

                {/* Recursively render children */}
                {item.expanded && item.children && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                        {renderTree(item.children, level + 1)}
                    </div>
                )}
            </div>
        ));
    };

    const { isSidebarCollapsed } = useUI();

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="super_admin" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name || 'Super Admin'} userEmail={user?.email} />

                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8 flex flex-col min-h-0">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Global Content Library</h1>
                            <p className="text-sm sm:text-base text-slate-500 font-medium">Platform-wide overview of educational material and structure.</p>
                        </div>
                        <Link
                            href="/admin/hierarchy-manager"
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-slate-700 font-black uppercase tracking-wider text-[11px] rounded-xl hover:bg-slate-50 transition-all border border-slate-200 shadow-sm active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            Structure
                        </Link>
                    </div>

                    <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0">
                        {/* Left: Global Hierarchy Sidebar */}
                        <div className="w-full lg:w-80 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[300px] lg:min-h-0">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Filter global tree..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-300"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {loading ? (
                                    <div className="p-8 text-center text-slate-400">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-200" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Loading ecosystem...</p>
                                    </div>
                                ) : data.length > 0 ? (
                                    renderTree(data)
                                ) : (
                                    <div className="p-8 text-center text-slate-400">
                                        <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-10" />
                                        <p className="text-xs font-bold uppercase tracking-widest">Repository Empty</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: Content Viewer */}
                        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[500px] lg:min-h-0">
                            {selectedItem ? (
                                <>
                                    <div className="p-6 border-b border-gray-100 bg-white flex justify-between items-center shadow-sm">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                    Master Content Entry
                                                </span>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                                    {selectedItem.type.replace('_', ' ')} / {selectedItem.title}
                                                </span>
                                            </div>
                                            <h2 className="text-xl font-black text-slate-900">{selectedItem.title}</h2>
                                        </div>
                                        <button
                                            onClick={handleOpenEditor}
                                            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white font-black uppercase tracking-wider text-[11px] rounded-xl hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                            Edit Content
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-12 bg-white custom-scrollbar">
                                        <div className="prose prose-slate prose-lg max-w-none 
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
                                            {selectedItem.content ? (
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkMath, remarkGfm]}
                                                    rehypePlugins={[rehypeKatex]}
                                                >
                                                    {selectedItem.content}
                                                </ReactMarkdown>
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                                    <FileText className="w-16 h-16 text-slate-200 mb-4" />
                                                    <p className="text-slate-400 font-medium italic">Empty content node.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white">
                                    <div className="w-32 h-32 bg-indigo-50 rounded-full flex items-center justify-center mb-10">
                                        <BookOpen className="w-16 h-16 text-indigo-600 opacity-20" />
                                    </div>
                                    <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Audit Global Content</h3>
                                    <p className="text-slate-500 max-w-sm font-medium leading-relaxed">
                                        Browse the platform hierarchy to view published material across all subjects and topics. Use the 'Launch Editor' to make direct modifications as needed.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content Editor Modal */}
                    {isEditModalOpen && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900">Edit Course Material</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedItem?.title}</p>
                                    </div>
                                    <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-hidden flex bg-slate-50">
                                    {/* Editor */}
                                    <div className="flex-1 flex flex-col border-r border-gray-100">
                                        <div className="px-4 py-2 bg-white border-b border-gray-100 flex items-center justify-between">
                                            {/* Toolbar */}
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => insertFormat('bold')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600" title="Bold">
                                                    <Bold className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => insertFormat('italic')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600" title="Italic">
                                                    <Italic className="w-3.5 h-3.5" />
                                                </button>
                                                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                                <button onClick={() => insertFormat('h2')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600" title="Heading">
                                                    <Heading2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => insertFormat('quote')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600" title="Quote">
                                                    <Quote className="w-3.5 h-3.5" />
                                                </button>
                                                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                                <button onClick={() => insertFormat('bullet')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600" title="Bullet List">
                                                    <List className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => insertFormat('number')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600" title="Numbered List">
                                                    <ListOrdered className="w-3.5 h-3.5" />
                                                </button>
                                                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                                <button onClick={() => insertFormat('code')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600" title="Inline Code">
                                                    <Terminal className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => insertFormat('codeblock')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600" title="Code Block">
                                                    <Code className="w-3.5 h-3.5" />
                                                </button>
                                                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                                <button onClick={() => insertFormat('math')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600" title="Inline Math">
                                                    <Sigma className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => insertFormat('mathblock')} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600" title="Math Block">
                                                    <div className="flex text-[10px] font-bold">$$</div>
                                                </button>
                                                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                                <div className="relative group/upload">
                                                    <button
                                                        onClick={() => document.getElementById('lib-image-upload')?.click()}
                                                        className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600 flex items-center gap-1"
                                                        title="Upload Image"
                                                        disabled={isImageUploading}
                                                    >
                                                        {isImageUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                                                    </button>
                                                    <input
                                                        id="lib-image-upload"
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/*"
                                                        onChange={handleImageUpload}
                                                    />
                                                </div>
                                            </div>

                                            <div className="px-3 py-1 bg-slate-100 rounded text-[9px] font-black uppercase text-indigo-600">
                                                Markdown
                                            </div>
                                        </div>
                                        <textarea
                                            ref={textareaRef}
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            className="flex-1 p-8 bg-slate-50 text-slate-900 font-mono text-[13px] outline-none resize-none custom-scrollbar leading-[1.8] tracking-wide"
                                            style={{
                                                lineHeight: '1.8',
                                                fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace"
                                            }}
                                            placeholder="Enter educational content in markdown format...

## Example Heading
Your content here...

Math: $E=mc^2$
"
                                            spellCheck={false}
                                        />
                                    </div>

                                    {/* Preview */}
                                    <div className="flex-1 flex flex-col bg-white">
                                        <div className="px-4 py-2 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase text-slate-400">Live Preview</span>
                                        </div>
                                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-white">
                                            <div className="prose prose-slate prose-lg max-w-none 
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
                                                {editContent ? (
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkMath, remarkGfm]}
                                                        rehypePlugins={[rehypeKatex]}
                                                    >
                                                        {editContent}
                                                    </ReactMarkdown>
                                                ) : (
                                                    <p className="text-slate-400 italic">No content to preview</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-white border-t border-gray-100 flex justify-end gap-4">
                                    <button
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveContent}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 text-sm disabled:opacity-50"
                                    >
                                        {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        {isSaving ? 'Processing...' : 'Sync Content'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
