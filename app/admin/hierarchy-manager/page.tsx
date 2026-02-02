'use client';

import React, { useState } from 'react';
import { Plus, ChevronRight, ChevronDown, Edit2, Trash2, GripVertical, Layers, Hash, FileText, Save, X } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { supabase } from '@/lib/supabase/client';

// Data Type
type HierarchyItem = {
    id: string;
    dbId: number;
    type: 'subject' | 'topic' | 'subtopic';
    title: string;
    children?: HierarchyItem[];
    expanded?: boolean;
};

export default function HierarchyManagerPage() {
    const [user, setUser] = useState<any>(null);
    const [data, setData] = useState<HierarchyItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addType, setAddType] = useState<'subject' | 'topic' | 'subtopic'>('subject');
    const [newItemName, setNewItemName] = useState('');
    const [parentId, setParentId] = useState<number | null>(null);

    const loadHierarchy = async () => {
        setLoading(true);
        const { data: subjects } = await supabase.from('subjects').select('*').order('id');
        const { data: topics } = await supabase.from('topics').select('*').order('id');
        const { data: subtopics } = await supabase.from('subtopics').select('*').order('id');

        if (subjects) {
            const tree: HierarchyItem[] = subjects.map((s: any) => ({
                id: `s-${s.id}`,
                dbId: s.id,
                type: 'subject',
                title: s.name,
                expanded: true, // Auto expand for visibility
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
                        title: st.name
                    })) || []
                })) || []
            }));
            setData(tree);
        }
        setLoading(false);
    };

    React.useEffect(() => {
        const currentUser = AuthService.getCurrentUser();
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('aptivo_user') : null;
        if (currentUser) setUser(currentUser);
        else if (storedUser) setUser(JSON.parse(storedUser));

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

    const openAddModal = (type: 'subject' | 'topic' | 'subtopic') => {
        setAddType(type);
        setNewItemName('');
        setParentId(null);
        setIsAddModalOpen(true);
    };

    const handleSave = async () => {
        if (!newItemName) return;
        try {
            if (addType === 'subject') {
                const { error } = await supabase.from('subjects').insert({ name: newItemName });
                if (error) throw error;
            } else if (addType === 'topic') {
                if (!parentId) return;
                const { error } = await supabase.from('topics').insert({ name: newItemName, subject_id: parentId });
                if (error) throw error;
            } else if (addType === 'subtopic') {
                if (!parentId) return;
                const { error } = await supabase.from('subtopics').insert({ name: newItemName, topic_id: parentId });
                if (error) throw error;
            }
            setIsAddModalOpen(false);
            loadHierarchy();
        } catch (e: any) {
            console.error(e);
            alert(`Error adding item: ${e.message || e}`);
        }
    };

    const handleDelete = async (item: HierarchyItem) => {
        if (!confirm(`Are you sure you want to delete ${item.title}? This will delete all children as well.`)) return;

        let table = '';
        if (item.type === 'subject') table = 'subjects';
        if (item.type === 'topic') table = 'topics';
        if (item.type === 'subtopic') table = 'subtopics';

        const { error } = await supabase.from(table).delete().eq('id', item.dbId);

        if (error) {
            alert(`Failed to delete: ${error.message}`);
        } else {
            loadHierarchy();
        }
    };

    const renderTree = (items: HierarchyItem[], level = 0) => {
        return items.map((item) => (
            <div key={item.id} className="select-none">
                <div
                    className={`
                        group flex items-center gap-3 py-3 px-4 border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors
                        ${level === 0 ? 'border-l-4 border-l-transparent hover:border-l-indigo-500' : ''}
                    `}
                    style={{ paddingLeft: `${level * 24 + 16}px` }}
                >
                    {/* Drag Handle */}
                    <GripVertical className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 cursor-grab" />

                    {/* Expand Toggle */}
                    <button
                        onClick={() => handleExpandCallback(item.id)}
                        className={`p-1 rounded hover:bg-gray-200 text-gray-400 ${!item.children ? 'invisible' : ''}`}
                    >
                        {item.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    {/* Icon */}
                    <div className={`
                        w-8 h-8 rounded-lg flex items-center justify-center
                        ${item.type === 'subject' ? 'bg-purple-100 text-purple-600' :
                            item.type === 'topic' ? 'bg-blue-50 text-blue-500' :
                                'bg-gray-100 text-gray-500'}
                    `}>
                        {item.type === 'subject' && <Layers className="w-4 h-4" />}
                        {item.type === 'topic' && <Hash className="w-4 h-4" />}
                        {item.type === 'subtopic' && <FileText className="w-4 h-4" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 font-medium text-slate-700">
                        {item.title}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleDelete(item)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Recursively render children */}
                {item.expanded && item.children && (
                    <div className="animate-fade-in">
                        {renderTree(item.children, level + 1)}
                    </div>
                )}
            </div>
        ));
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <Sidebar userRole="super_admin" />
            <Header userName={user?.full_name || 'Admin'} userEmail={user?.email || 'admin@aptivo.edu'} />

            <main className="ml-64 mt-16 p-8 relative">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Hierarchy Manager</h1>
                    <p className="text-slate-500">Manage the Subject → Topic → Subtopic structure with drag-and-drop sequencing</p>
                </div>

                {/* Content Card */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px] flex flex-col">

                    {/* Toolbar */}
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                        <div className="text-sm font-medium text-slate-500">
                            Manage Content Structure
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => openAddModal('subject')}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                            >
                                <Plus className="w-4 h-4" />
                                Add Subject
                            </button>
                            <button
                                onClick={() => openAddModal('topic')}
                                disabled={data.length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-gray-200 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                <Plus className="w-4 h-4" />
                                Add Topic
                            </button>
                            <button
                                onClick={() => openAddModal('subtopic')}
                                disabled={data.length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-gray-200 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                <Plus className="w-4 h-4" />
                                Add Subtopic
                            </button>
                        </div>
                    </div>

                    {/* Drag to reorder label */}
                    <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Content Hierarchy
                    </div>

                    {/* Tree Container */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
                        {loading ? <div className="p-8 text-center text-slate-400">Loading...</div> : renderTree(data)}
                    </div>
                </div>

                {/* Add Modal */}
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-slate-800 capitalize">Add New {addType}</h3>
                                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                    <input
                                        type="text"
                                        value={newItemName}
                                        onChange={(e) => setNewItemName(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none"
                                        placeholder={`Enter ${addType} name`}
                                    />
                                </div>

                                {addType === 'topic' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Parent Subject</label>
                                        <select
                                            onChange={(e) => setParentId(parseInt(e.target.value))}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200"
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Select Subject</option>
                                            {data.map(s => (
                                                <option key={s.dbId} value={s.dbId}>{s.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {addType === 'subtopic' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Parent Topic</label>
                                        <select
                                            onChange={(e) => setParentId(parseInt(e.target.value))}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200"
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Select Topic</option>
                                            {data.map(s => (
                                                <optgroup key={s.dbId} label={s.title}>
                                                    {s.children?.map(t => (
                                                        <option key={t.dbId} value={t.dbId}>{t.title}</option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="p-6 bg-gray-50 flex justify-end gap-3">
                                <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-gray-200 rounded-lg">Cancel</button>
                                <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Save</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
