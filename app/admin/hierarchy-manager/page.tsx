'use client';

import React, { useState, useEffect } from 'react';
import { Plus, ChevronRight, ChevronDown, Edit2, Trash2, GripVertical, Layers, Hash, FileText, X, AlertTriangle } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useUI } from '@/lib/context/UIContext';
import { AuthService } from '@/lib/services/authService';
import { supabase } from '@/lib/supabase/client';
import {
    DndContext,
    DragOverlay,
    useDraggable,
    useDroppable,
    DragEndEvent,
    DragStartEvent,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragOverEvent
} from '@dnd-kit/core';
import { createPortal } from 'react-dom';

// Data Types
type HierarchyItem = {
    id: string; // s-1, t-3, st-5
    dbId: number;
    type: 'subject' | 'topic' | 'subtopic';
    title: string;
    children?: HierarchyItem[];
    expanded?: boolean;
};

// --- DND Helper Components ---

const DraggableItem = ({ item, level, children, onExpand, onDelete }: {
    item: HierarchyItem,
    level: number,
    children?: React.ReactNode,
    onExpand: (id: string) => void,
    onDelete: (item: HierarchyItem) => void
}) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: item.id,
        data: item
    });

    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: item.id,
        data: item
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999,
    } : undefined;

    return (
        <div ref={setDroppableRef} className="select-none">
            <div
                ref={setNodeRef}
                {...attributes}
                className={`
                    group flex items-center gap-3 py-3 px-4 border-b border-gray-100 bg-white transition-colors
                    ${isDragging ? 'opacity-50 shadow-xl ring-2 ring-indigo-500 rounded-lg relative z-50' : ''}
                    ${isOver && !isDragging ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-gray-50'}
                    ${level === 0 ? 'border-l-4 border-l-transparent hover:border-l-indigo-500' : ''}
                `}
                style={{ paddingLeft: `${level * 24 + 16}px`, ...style }}
            >
                {/* Drag Handle */}
                <div {...listeners} className="cursor-grab p-1">
                    <GripVertical className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100" />
                </div>

                {/* Expand Toggle */}
                <button
                    onClick={(e) => { e.stopPropagation(); onExpand(item.id); }}
                    className={`p-1 rounded hover:bg-gray-200 text-gray-400 ${(!item.children || item.children.length === 0) && item.type !== 'subject' ? 'invisible' : ''}`}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    {item.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                {/* Icon */}
                <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                    ${item.type === 'subject' ? 'bg-purple-100 text-purple-600' :
                        item.type === 'topic' ? 'bg-blue-50 text-blue-500' :
                            'bg-gray-100 text-gray-500'}
                `}>
                    {item.type === 'subject' && <Layers className="w-4 h-4" />}
                    {item.type === 'topic' && <Hash className="w-4 h-4" />}
                    {item.type === 'subtopic' && <FileText className="w-4 h-4" />}
                </div>

                {/* Content */}
                <div className="flex-1 font-medium text-slate-700 truncate">
                    {item.title}
                    {item.type === 'topic' && <span className="ml-2 text-xs text-gray-400 font-normal">(Topic)</span>}
                    {item.type === 'subtopic' && <span className="ml-2 text-xs text-gray-400 font-normal">(Subtopic)</span>}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Recursively render children */}
            {item.expanded && children && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
};

// --- Main Page Component ---

export default function HierarchyManagerPage() {
    const [user, setUser] = useState<any>(null);
    const [data, setData] = useState<HierarchyItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeDragItem, setActiveDragItem] = useState<HierarchyItem | null>(null);
    const [mounted, setMounted] = useState(false);
    const { isSidebarCollapsed } = useUI();

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addType, setAddType] = useState<'subject' | 'topic' | 'subtopic'>('subject');
    const [inputList, setInputList] = useState<string[]>(['']);
    const [parentId, setParentId] = useState<number | null>(null);

    // Sensors
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

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
                expanded: true,
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

    useEffect(() => {
        setMounted(true);
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
        setInputList(['']);
        setParentId(null);
        setIsAddModalOpen(true);
    };

    const handleSave = async () => {
        const validItems = inputList.filter(item => item.trim() !== '');
        if (validItems.length === 0) return;

        try {
            setLoading(true);
            for (const item of validItems) {
                if (addType === 'subject') {
                    const { error } = await supabase.from('subjects').insert({ name: item });
                    if (error) throw error;
                } else if (addType === 'topic') {
                    if (!parentId) return;
                    const { error } = await supabase.from('topics').insert({ name: item, subject_id: parentId });
                    if (error) throw error;
                } else if (addType === 'subtopic') {
                    if (!parentId) return;
                    const { error } = await supabase.from('subtopics').insert({ name: item, topic_id: parentId });
                    if (error) throw error;
                }
            }
            setIsAddModalOpen(false);
            loadHierarchy();
        } catch (e: any) {
            console.error(e);
            alert(`Error adding item: ${e.message || e}`);
            setLoading(false);
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

    // --- Drag and Drop Logic ---

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const item = findItem(active.id as string, data);
        setActiveDragItem(item || null);
    };

    const findItem = (id: string, items: HierarchyItem[]): HierarchyItem | undefined => {
        for (const item of items) {
            if (item.id === id) return item;
            if (item.children) {
                const found = findItem(id, item.children);
                if (found) return found;
            }
        }
        return undefined;
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragItem(null);

        if (!over) return;

        const activeItem = active.data.current as HierarchyItem;
        const overItem = over.data.current as HierarchyItem;

        if (!activeItem || !overItem || activeItem.id === overItem.id) return;

        // Logic for Handling Drops
        try {
            let success = false;

            // Case 1: Topic -> Subject (Reparent Topic to new Subject)
            if (activeItem.type === 'topic' && overItem.type === 'subject') {
                const confirmMove = confirm(`Move topic "${activeItem.title}" to subject "${overItem.title}"?`);
                if (!confirmMove) return;

                const { error } = await supabase.from('topics').update({ subject_id: overItem.dbId }).eq('id', activeItem.dbId);
                if (error) throw error;
                success = true;
            }

            // Case 2: Subtopic -> Topic (Reparent Subtopic to new Topic)
            if (activeItem.type === 'subtopic' && overItem.type === 'topic') {
                const confirmMove = confirm(`Move subtopic "${activeItem.title}" to topic "${overItem.title}"?`);
                if (!confirmMove) return;

                const { error } = await supabase.from('subtopics').update({ topic_id: overItem.dbId }).eq('id', activeItem.dbId);
                if (error) throw error;
                success = true;
            }

            // Case 3: Topic -> Topic (Convert Topic to Subtopic)
            if (activeItem.type === 'topic' && overItem.type === 'topic') {
                // Check if topic has children - if so, warn or prevent
                if (activeItem.children && activeItem.children.length > 0) {
                    alert(`Cannot convert topic "${activeItem.title}" to subtopic because it has its own subtopics. Please delete or move them first.`);
                    return;
                }

                const confirmConvert = confirm(`Convert topic "${activeItem.title}" to a Subtopic of "${overItem.title}"? \n\nThis will change its type (Topic -> Subtopic).`);
                if (!confirmConvert) return;

                // 1. Delete from topics
                await supabase.from('topics').delete().eq('id', activeItem.dbId);
                // 2. Insert into subtopics
                const { error } = await supabase.from('subtopics').insert({
                    name: activeItem.title,
                    topic_id: overItem.dbId
                });
                if (error) throw error;
                success = true;
            }

            // Case 4: Subtopic -> Subject (Convert Subtopic to Topic)
            if (activeItem.type === 'subtopic' && overItem.type === 'subject') {
                const confirmConvert = confirm(`Convert subtopic "${activeItem.title}" to a Topic under "${overItem.title}"? \n\nThis will change its type (Subtopic -> Topic).`);
                if (!confirmConvert) return;

                // 1. Delete from subtopics
                await supabase.from('subtopics').delete().eq('id', activeItem.dbId);
                // 2. Insert into topics
                const { error } = await supabase.from('topics').insert({
                    name: activeItem.title,
                    subject_id: overItem.dbId
                });
                if (error) throw error;
                success = true;
            }

            if (success) {
                loadHierarchy();
            }

        } catch (error: any) {
            console.error("Drag operation failed:", error);
            alert(`Operation failed: ${error.message}`);
        }
    };

    const renderTree = (items: HierarchyItem[], level = 0) => {
        return items.map((item) => (
            <div key={item.id}>
                <DraggableItem
                    item={item}
                    level={level}
                    onExpand={handleExpandCallback}
                    onDelete={handleDelete}
                >
                    {item.children && renderTree(item.children, level + 1)}
                </DraggableItem>
            </div>
        ));
    };

    if (!mounted) return null;

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="min-h-screen bg-gray-50 font-sans">
                <Sidebar userRole="super_admin" />
                <Header userName={user?.full_name || 'Admin'} userEmail={user?.email || 'admin@aptivo.edu'} />

                <main className={`${isSidebarCollapsed ? 'ml-28' : 'ml-80'} mt-16 p-4 lg:p-8 relative transition-all duration-300`}>
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">Hierarchy Manager</h1>
                        <p className="text-slate-500">Drag items to reorder or change hierarchy. Convert Topics ↔ Subtopics by dragging them.</p>
                    </div>

                    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px] flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-white sticky top-0 z-10">
                            <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-orange-400" />
                                Drag items to organize structure
                            </div>
                            <div className="flex gap-2 flex-wrap">
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

                        <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider flex justify-between">
                            <span>Structure</span>
                            <span>Actions</span>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
                            {loading ? <div className="p-8 text-center text-slate-400">Loading...</div> : renderTree(data)}
                        </div>
                    </div>

                    {/* Drag Overlay for smooth visuals */}
                    {createPortal(
                        <DragOverlay>
                            {activeDragItem ? (
                                <div className="p-4 bg-white shadow-2xl rounded-lg border-2 border-indigo-500 w-[300px] flex items-center gap-3 opacity-90 cursor-grabbing">
                                    <GripVertical className="w-4 h-4 text-indigo-500" />
                                    <span className="font-bold text-slate-800">{activeDragItem.title}</span>
                                </div>
                            ) : null}
                        </DragOverlay>,
                        document.body
                    )}

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
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Names</label>
                                        <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                            {inputList.map((item, index) => (
                                                <div key={index} className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={item}
                                                        onChange={(e) => {
                                                            const newList = [...inputList];
                                                            newList[index] = e.target.value;
                                                            setInputList(newList);
                                                        }}
                                                        className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none"
                                                        placeholder={`Enter ${addType} name`}
                                                        autoFocus={index === inputList.length - 1}
                                                    />
                                                    {inputList.length > 1 && (
                                                        <button
                                                            onClick={() => {
                                                                const newList = inputList.filter((_, i) => i !== index);
                                                                setInputList(newList);
                                                            }}
                                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => setInputList([...inputList, ''])}
                                            className="mt-3 flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add Another
                                        </button>
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
                                                {data.filter(i => i.type === 'subject').map(s => (
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
                                                {data.filter(i => i.type === 'subject').map(s => (
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
        </DndContext>
    );
}
