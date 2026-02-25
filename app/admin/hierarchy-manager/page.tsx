'use client';

import React, { useState, useEffect } from 'react';
import { Plus, ChevronRight, ChevronDown, Edit2, Trash2, GripVertical, Layers, Hash, FileText, X, AlertTriangle } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useUI } from '@/lib/context/UIContext';
import { useLoading } from '@/lib/context/LoadingContext';
import { AuthService } from '@/lib/services/authService';
// Supabase removed — using MongoDB API via fetch
// import { supabase } from '@/lib/supabase/client';
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

const DraggableItem = ({ item, level, children, onExpand, onDelete, onAddChild }: {
    item: HierarchyItem,
    level: number,
    children?: React.ReactNode,
    onExpand: (id: string) => void,
    onDelete: (item: HierarchyItem) => void,
    onAddChild: (item: HierarchyItem) => void
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
                    ${isDragging ? 'opacity-50 shadow-xl ring-2 ring-teal-500 rounded-lg relative z-50' : ''}
                    ${isOver && !isDragging ? 'bg-teal-50 border-teal-200' : 'hover:bg-gray-50'}
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
                        item.type === 'topic' ? 'bg-emerald-50 text-emerald-500' :
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
                    {item.type !== 'subtopic' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddChild(item); }}
                            className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                            title={`Add ${item.type === 'subject' ? 'Topic' : 'Subtopic'}`}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    )}
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
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
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
        setGlobalLoading(true, 'Architecting Content Hierarchy...');
        try {
            const [subRes, topRes, stRes] = await Promise.all([
                fetch('/api/mongo/content?type=subjects').then(r => r.json()),
                fetch('/api/mongo/content?type=topics').then(r => r.json()),
                fetch('/api/mongo/content?type=subtopics').then(r => r.json()),
            ]);

            const subjects = subRes.subjects || [];
            const topics = topRes.topics || [];
            const subtopics = stRes.subtopics || [];

            const tree: HierarchyItem[] = subjects.map((s: any) => ({
                id: `s-${s.id}`,
                dbId: s.id,
                type: 'subject',
                title: s.name,
                expanded: false,
                children: topics.filter((t: any) => t.subject_id === s.id).map((t: any) => ({
                    id: `t-${t.id}`,
                    dbId: t.id,
                    type: 'topic',
                    title: t.name,
                    expanded: false,
                    children: subtopics.filter((st: any) => st.topic_id === t.id).map((st: any) => ({
                        id: `st-${st.id}`,
                        dbId: st.id,
                        type: 'subtopic',
                        title: st.name
                    })) || []
                })) || []
            }));
            setData(tree);
        } catch (err) {
            console.error('Error loading hierarchy:', err);
        } finally {
            setGlobalLoading(false);
        }
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
        return items.map((item: HierarchyItem) => {
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

    const handleAddChild = (item: HierarchyItem) => {
        const nextType = item.type === 'subject' ? 'topic' : 'subtopic';
        setAddType(nextType);
        setInputList(['']);
        setParentId(item.dbId);
        setIsAddModalOpen(true);
    };

    const handleSave = async () => {
        const validItems = inputList.filter((item: string) => item.trim() !== '');
        if (validItems.length === 0) return;

        try {
            setGlobalLoading(true, 'Committing structural changes...');
            for (const item of validItems) {
                const res = await fetch('/api/mongo/content', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: addType,
                        name: item,
                        subject_id: addType === 'topic' ? parentId : undefined,
                        topic_id: addType === 'subtopic' ? parentId : undefined
                    })
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || `Failed to add ${addType}`);
                }
            }
            setIsAddModalOpen(false);
            loadHierarchy();
        } catch (e: any) {
            console.error(e);
            alert(`Error adding item: ${e.message || e}`);
            setGlobalLoading(false);
        }
    };

    const handleDelete = async (item: HierarchyItem) => {
        if (!confirm(`Are you sure you want to delete ${item.title}? This will delete all children as well.`)) return;

        try {
            const res = await fetch(`/api/mongo/content?id=${item.dbId}&type=${item.type}`, {
                method: 'DELETE'
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Delete failed');
            }

            loadHierarchy();
        } catch (e: any) {
            console.error(e);
            alert(`Failed to delete: ${e.message}`);
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
            // Helper for updates
            const updateItem = async (id: number, type: string, updates: any) => {
                const res = await fetch('/api/mongo/content', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, type, ...updates })
                });
                if (!res.ok) throw new Error('Update failed');
            };

            // Case 1: Topic -> Subject (Reparent Topic to new Subject)
            if (activeItem.type === 'topic' && overItem.type === 'subject') {
                const confirmMove = confirm(`Move topic "${activeItem.title}" to subject "${overItem.title}"?`);
                if (!confirmMove) return;

                await updateItem(activeItem.dbId, 'topic', { subject_id: overItem.dbId });
                success = true;
            }

            // Case 2: Subtopic -> Topic (Reparent Subtopic to new Topic)
            if (activeItem.type === 'subtopic' && overItem.type === 'topic') {
                const confirmMove = confirm(`Move subtopic "${activeItem.title}" to topic "${overItem.title}"?`);
                if (!confirmMove) return;

                await updateItem(activeItem.dbId, 'subtopic', { topic_id: overItem.dbId });
                success = true;
            }

            // Case 3: Topic -> Topic (Convert Topic to Subtopic)
            if (activeItem.type === 'topic' && overItem.type === 'topic') {
                if (activeItem.children && activeItem.children.length > 0) {
                    alert(`Cannot convert topic "${activeItem.title}" to subtopic because it has its own subtopics. Please delete or move them first.`);
                    return;
                }

                const confirmConvert = confirm(`Convert topic "${activeItem.title}" to a Subtopic of "${overItem.title}"? \n\nThis will change its type (Topic -> Subtopic).`);
                if (!confirmConvert) return;

                // 1. Delete
                await fetch(`/api/mongo/content?id=${activeItem.dbId}&type=topic`, { method: 'DELETE' });
                // 2. Insert
                await fetch('/api/mongo/content', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'subtopic', name: activeItem.title, topic_id: overItem.dbId })
                });
                success = true;
            }

            // Case 4: Subtopic -> Subject (Convert Subtopic to Topic)
            if (activeItem.type === 'subtopic' && overItem.type === 'subject') {
                const confirmConvert = confirm(`Convert subtopic "${activeItem.title}" to a Topic under "${overItem.title}"? \n\nThis will change its type (Subtopic -> Topic).`);
                if (!confirmConvert) return;

                // 1. Delete
                await fetch(`/api/mongo/content?id=${activeItem.dbId}&type=subtopic`, { method: 'DELETE' });
                // 2. Insert
                await fetch('/api/mongo/content', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'topic', name: activeItem.title, subject_id: overItem.dbId })
                });
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
                    onAddChild={handleAddChild}
                >
                    {item.children && renderTree(item.children, level + 1)}
                </DraggableItem>
            </div>
        ));
    };

    if (loading) return null;

    if (!mounted) return null;

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="min-h-screen bg-gray-50 flex font-sans">
                <Sidebar userRole="super_admin" />
                <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                    <Header userName={user?.full_name || 'Admin'} userEmail={user?.email || 'admin@aptivo.edu'} />

                    <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8">
                        <div className="mb-8">
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Hierarchy Manager</h1>
                            <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium italic">Drag items to reorder or change hierarchy. Convert Topics ↔ Subtopics by dragging them.</p>
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px] flex flex-col">
                            <div className="p-6 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-center gap-4 bg-white sticky top-0 z-10">
                                <div className="text-xs font-bold text-slate-400 flex items-center gap-2 uppercase tracking-widest">
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                    Interactive Structure Mode
                                </div>
                                <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
                                    <button
                                        onClick={() => openAddModal('subject')}
                                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-[11px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-900 transition-all shadow-lg shadow-teal-100 active:scale-95"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Subject
                                    </button>
                                    <button
                                        onClick={() => openAddModal('topic')}
                                        disabled={data.length === 0}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 border border-slate-200 text-[11px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-100 transition-all disabled:opacity-50 active:scale-95"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Topic
                                    </button>
                                    <button
                                        onClick={() => openAddModal('subtopic')}
                                        disabled={data.length === 0}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 border border-slate-200 text-[11px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-100 transition-all disabled:opacity-50 active:scale-95"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Subtopic
                                    </button>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between">
                                <span>Content Tree Structure</span>
                                <span className="hidden sm:inline">Contextual Actions</span>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
                                {loading ? <div className="p-8 text-center text-slate-400">Loading...</div> : renderTree(data)}
                            </div>
                        </div>

                        {/* Drag Overlay for smooth visuals */}
                        {createPortal(
                            <DragOverlay>
                                {activeDragItem ? (
                                    <div className="p-4 bg-white shadow-2xl rounded-lg border-2 border-teal-500 w-[300px] flex items-center gap-3 opacity-90 cursor-grabbing">
                                        <GripVertical className="w-4 h-4 text-teal-500" />
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
                                                {inputList.map((item: string, index: number) => (
                                                    <div key={index} className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={item}
                                                            onChange={(e) => {
                                                                const newList = [...inputList];
                                                                newList[index] = e.target.value;
                                                                setInputList(newList);
                                                            }}
                                                            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-teal-100 focus:border-teal-500 outline-none"
                                                            placeholder={`Enter ${addType} name`}
                                                            autoFocus={index === inputList.length - 1}
                                                        />
                                                        {inputList.length > 1 && (
                                                            <button
                                                                onClick={() => {
                                                                    const newList = inputList.filter((_: string, i: number) => i !== index);
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
                                                className="mt-3 flex items-center gap-2 text-sm font-bold text-teal-600 hover:text-teal-800"
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
                                                    value={parentId || ''}
                                                >
                                                    <option value="" disabled>Select Subject</option>
                                                    {data.filter((i: HierarchyItem) => i.type === 'subject').map((s: HierarchyItem) => (
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
                                                    value={parentId || ''}
                                                >
                                                    <option value="" disabled>Select Topic</option>
                                                    {data.filter((i: HierarchyItem) => i.type === 'subject').map((s: HierarchyItem) => (
                                                        <optgroup key={s.dbId} label={s.title}>
                                                            {s.children?.map((t: HierarchyItem) => (
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
                                        <button onClick={handleSave} className="px-4 py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700">Save</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </DndContext>
    );
}
