'use client';

import React, { useEffect, useState } from 'react';
import {
    Plus, ChevronRight, ChevronDown,
    Layers, Hash, FileText,
    Search, RefreshCw, BookOpen,
    Eye, Edit3
} from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { supabase } from '@/lib/supabase/client';
import ReactMarkdown from 'react-markdown';
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
    const [selectedSubtopic, setSelectedSubtopic] = useState<HierarchyItem | null>(null);

    // Content Editor Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

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

                // Update selectedSubtopic if it exists
                if (selectedSubtopic) {
                    const flatSubtopics: any[] = [];
                    tree.forEach(s => s.children?.forEach(t => t.children?.forEach(st => flatSubtopics.push(st))));
                    const updated = flatSubtopics.find(st => st.dbId === selectedSubtopic.dbId);
                    if (updated) setSelectedSubtopic(updated);
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
        if (!selectedSubtopic) return;
        setEditContent(selectedSubtopic.content || '');
        setIsEditModalOpen(true);
    };

    const handleSaveContent = async () => {
        if (!selectedSubtopic) return;
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('subtopics')
                .update({ content_markdown: editContent })
                .eq('id', selectedSubtopic.dbId);

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
                        ${selectedSubtopic?.id === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-transparent text-slate-400'}
                    `}
                    style={{ paddingLeft: `${level * 16 + 16}px` }}
                    onClick={() => {
                        if (item.type === 'subtopic') {
                            setSelectedSubtopic(item);
                        } else {
                            handleExpandCallback(item.id);
                        }
                    }}
                >
                    {/* Expand Toggle */}
                    <div className={`p-1 rounded ${selectedSubtopic?.id === item.id ? 'text-white' : 'text-slate-500'} ${!item.children || item.children.length === 0 ? 'invisible' : ''}`}>
                        {item.expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </div>

                    {/* Icon */}
                    <div className={`
                        w-6 h-6 rounded flex items-center justify-center
                        ${selectedSubtopic?.id === item.id ? 'bg-white/20 text-white' :
                            item.type === 'subject' ? 'bg-purple-500/10 text-purple-400' :
                                item.type === 'topic' ? 'bg-blue-500/10 text-blue-400' :
                                    'bg-emerald-500/10 text-emerald-400 text-emerald-400'}
                    `}>
                        {item.type === 'subject' && <Layers className="w-3 h-3" />}
                        {item.type === 'topic' && <Hash className="w-3 h-3" />}
                        {item.type === 'subtopic' && <FileText className="w-3 h-3" />}
                    </div>

                    {/* Content */}
                    <div className={`flex-1 text-xs font-bold truncate ${selectedSubtopic?.id === item.id ? 'text-white' : 'text-slate-300'}`}>
                        {item.title}
                    </div>

                    {item.type === 'subtopic' && (
                        <Eye className={`w-3 h-3 transition-opacity ${selectedSubtopic?.id === item.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`} />
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
        <div className="min-h-screen bg-background font-sans text-foreground">
            <Sidebar userRole="super_admin" />
            <Header userName={user?.full_name || 'Super Admin'} userEmail={user?.email} />

            <main className={`${isSidebarCollapsed ? 'ml-28' : 'ml-80'} mt-16 p-8 h-[calc(100vh-64px)] flex flex-col transition-all duration-300 relative z-10`}>
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-primary tracking-tight">Global Content Library</h1>
                        <p className="text-slate-500 dark:text-primary-dark/70 font-medium">Platform-wide overview of educational material and structure.</p>
                    </div>
                    <div className="flex gap-4">
                        <Link
                            href="/admin/hierarchy-manager"
                            className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-surface text-slate-700 dark:text-primary font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-surface-hover transition-all border border-slate-200 dark:border-border"
                        >
                            <Plus className="w-4 h-4" />
                            Manage Hierarchy
                        </Link>
                    </div>
                </div>

                <div className="flex-1 flex gap-8 min-h-0">
                    {/* Left: Global Hierarchy Sidebar */}
                    <div className="w-80 flex flex-col bg-white dark:bg-surface rounded-3xl border border-slate-200 dark:border-border shadow-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-border bg-slate-50/50 dark:bg-surface-hover/30">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Filter global tree..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-surface border border-slate-100 dark:border-border rounded-xl text-xs text-slate-900 dark:text-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {loading ? (
                                <div className="p-8 text-center text-slate-500">
                                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 opacity-20" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Loading Ecosystem Tree...</p>
                                </div>
                            ) : data.length > 0 ? (
                                renderTree(data)
                            ) : (
                                <div className="p-8 text-center text-slate-500">
                                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-10" />
                                    <p className="text-xs font-bold uppercase tracking-widest">No Content Found</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Content Viewer */}
                    <div className="flex-1 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                        {selectedSubtopic ? (
                            <>
                                <div className="p-6 border-b border-gray-100 bg-white flex justify-between items-center shadow-sm">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                Master Content Entry
                                            </span>
                                        </div>
                                        <h2 className="text-xl font-black text-slate-900">{selectedSubtopic.title}</h2>
                                    </div>
                                    <button
                                        onClick={handleOpenEditor}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 font-bold rounded-lg hover:bg-indigo-100 transition-colors text-xs"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        Edit Content
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-12 bg-white prose prose-slate max-w-none prose-headings:font-black prose-p:text-slate-600 prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:rounded-2xl custom-scrollbar">
                                    {selectedSubtopic.content ? (
                                        <ReactMarkdown>{selectedSubtopic.content}</ReactMarkdown>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                            <FileText className="w-16 h-16 text-slate-200 mb-4" />
                                            <p className="text-slate-400 font-medium italic">Empty content node.</p>
                                        </div>
                                    )}
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
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedSubtopic?.title}</p>
                                </div>
                                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-hidden flex bg-slate-50">
                                {/* Editor */}
                                <div className="flex-1 flex flex-col border-r border-gray-100">
                                    <div className="px-4 py-2 bg-white border-b border-gray-100 text-[10px] font-black uppercase text-slate-400">Markdown Source</div>
                                    <textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="flex-1 p-8 bg-transparent text-slate-800 font-mono text-sm outline-none resize-none custom-scrollbar leading-relaxed"
                                        placeholder="Enter educational content in markdown format..."
                                        spellCheck={false}
                                    />
                                </div>

                                {/* Preview */}
                                <div className="flex-1 flex flex-col bg-white">
                                    <div className="px-4 py-2 bg-slate-50 border-b border-gray-100 text-[10px] font-black uppercase text-slate-400">Live Preview</div>
                                    <div className="flex-1 p-8 overflow-y-auto prose prose-slate max-w-none custom-scrollbar">
                                        <ReactMarkdown>{editContent || '*No content to preview*'}</ReactMarkdown>
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
    );
}
