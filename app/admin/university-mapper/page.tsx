'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { Save, CheckCircle, AlertCircle, RefreshCw, ChevronRight, ChevronDown, ChevronUp, Layers, BookOpen, FileText } from 'lucide-react';
import { useUI } from '@/lib/context/UIContext';

type HierarchyNode = {
    id: number;
    name: string;
    type: 'subject' | 'topic' | 'subtopic';
    children?: HierarchyNode[];
    isSelected?: boolean;
    expanded?: boolean; // For UI collapsing
};

export default function UniversityContentMapperPage() {
    const [loading, setLoading] = useState(true);
    const [universities, setUniversities] = useState<any[]>([]);
    const [selectedUniId, setSelectedUniId] = useState<number | null>(null);
    const [institutions, setInstitutions] = useState<any[]>([]);
    const [selectedInstId, setSelectedInstId] = useState<number | 'none'>('none');
    const [globalSessionLimit, setGlobalSessionLimit] = useState(10);
    const [globalDifficultyLevel, setGlobalDifficultyLevel] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
    const [hierarchy, setHierarchy] = useState<HierarchyNode[]>([]);
    const [saving, setSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const { isSidebarCollapsed } = useUI();

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Fetch Universities & Institutions
                const { data: unis } = await supabase.from('universities').select('*').eq('is_active', true).order('name');
                const { data: insts } = await supabase.from('institutions').select('*').order('name');
                setUniversities(unis || []);
                setInstitutions(insts || []);

                // Fetch Full Hierarchy
                const { data: subjects } = await supabase.from('subjects').select('*').eq('is_active', true).order('name');
                const { data: topics } = await supabase.from('topics').select('*').eq('is_active', true).order('name');
                const { data: subtopics } = await supabase.from('subtopics').select('*').eq('is_active', true).order('name');

                if (subjects && topics && subtopics) {
                    const tree: HierarchyNode[] = subjects.map((sub: any) => ({
                        id: sub.id,
                        name: sub.name,
                        type: 'subject',
                        expanded: true,
                        isSelected: false,
                        children: topics
                            .filter((t: any) => t.subject_id === sub.id)
                            .map((t: any) => ({
                                id: t.id,
                                name: t.name,
                                type: 'topic',
                                expanded: false,
                                isSelected: false,
                                children: subtopics
                                    .filter((st: any) => st.topic_id === t.id)
                                    .map((st: any) => ({
                                        id: st.id,
                                        name: st.name,
                                        type: 'subtopic',
                                        isSelected: false
                                    }))
                            }))
                    }));
                    setHierarchy(tree);
                }
            } catch (error) {
                console.error("Error loading data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Load mappings when university is selected
    useEffect(() => {
        if (!selectedUniId) return;

        const loadMappings = async () => {
            setLoading(true);
            try {
                let query = supabase
                    .from('university_content_access')
                    .select('subject_id, topic_id, subtopic_id, session_limit, difficulty_level')
                    .eq('university_id', selectedUniId)
                    .eq('is_active', true);

                if (selectedInstId === 'none') {
                    query = query.is('institution_id', null);
                } else {
                    query = query.eq('institution_id', selectedInstId);
                }

                const { data: mappings } = await query;

                if (mappings) {
                    const selectedSubtopics = new Set(mappings.filter(m => m.subtopic_id).map(m => m.subtopic_id));
                    if (mappings.length > 0 && mappings[0].session_limit) {
                        setGlobalSessionLimit(mappings[0].session_limit);
                    }
                    if (mappings.length > 0 && mappings[0].difficulty_level) {
                        setGlobalDifficultyLevel(mappings[0].difficulty_level as any);
                    }

                    setHierarchy(prev => prev.map(sub => {
                        const subTopics = sub.children || [];

                        const updatedTopics = subTopics.map(topic => {
                            const subSubtopics = topic.children || [];

                            // Check if subtopics are selected
                            const updatedSubtopics = subSubtopics.map(st => ({
                                ...st,
                                isSelected: selectedSubtopics.has(st.id)
                            }));

                            // Auto-select topic if ANY subtopic is selected (Visual only? OR logic?)
                            // Better: check if topic is implicitly selected.
                            // Let's rely on the explicit selection state.
                            const isTopicSelected = updatedSubtopics.some(st => st.isSelected);

                            return {
                                ...topic,
                                isSelected: isTopicSelected,
                                children: updatedSubtopics
                            };
                        });

                        const isSubjectSelected = updatedTopics.some(t => t.isSelected);

                        return {
                            ...sub,
                            isSelected: isSubjectSelected,
                            children: updatedTopics
                        };
                    }));
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadMappings();
    }, [selectedUniId, selectedInstId]);

    const toggleNode = (nodeType: string, nodeId: number) => {
        setHierarchy(prev => {
            const clone = [...prev];
            if (nodeType === 'subject') {
                const idx = clone.findIndex(n => n.id === nodeId);
                if (idx > -1) clone[idx] = { ...clone[idx], expanded: !clone[idx].expanded };
            } else if (nodeType === 'topic') {
                clone.forEach((sub, sIdx) => {
                    const tIdx = sub.children?.findIndex(t => t.id === nodeId);
                    if (tIdx !== undefined && tIdx > -1 && sub.children) {
                        sub.children[tIdx] = { ...sub.children[tIdx], expanded: !sub.children[tIdx].expanded };
                    }
                });
            }
            return clone;
        });
    }

    const handleSelection = (type: 'subject' | 'topic' | 'subtopic', id: number, parentId?: number, grandParentId?: number) => {
        setHierarchy(prev => {
            const newHierarchy = JSON.parse(JSON.stringify(prev)); // Deep clone simple

            if (type === 'subject') {
                const sub = newHierarchy.find((s: any) => s.id === id);
                if (sub) {
                    const newState = !sub.isSelected;
                    sub.isSelected = newState;
                    // Cascade to all children
                    sub.children?.forEach((topic: any) => {
                        topic.isSelected = newState;
                        topic.children?.forEach((st: any) => st.isSelected = newState);
                    });
                }
            } else if (type === 'topic') {
                const sub = newHierarchy.find((s: any) => s.id === parentId);
                if (sub) {
                    const topic = sub.children?.find((t: any) => t.id === id);
                    if (topic) {
                        const newState = !topic.isSelected;
                        topic.isSelected = newState;
                        // Cascade to subtopics
                        topic.children?.forEach((st: any) => st.isSelected = newState);

                        // Update parent Subject based on children
                        sub.isSelected = sub.children?.some((t: any) => t.isSelected);
                    }
                }
            } else if (type === 'subtopic') {
                // Find path: Subject(grandParent) -> Topic(parent) -> Subtopic(id)
                const sub = newHierarchy.find((s: any) => s.id === grandParentId);
                if (sub) {
                    const topic = sub.children?.find((t: any) => t.id === parentId);
                    if (topic) {
                        const st = topic.children?.find((s: any) => s.id === id);
                        if (st) {
                            st.isSelected = !st.isSelected;

                            // Update Topic parent
                            topic.isSelected = topic.children?.some((child: any) => child.isSelected);
                            // Update Subject parent
                            sub.isSelected = sub.children?.some((child: any) => child.isSelected);
                        }
                    }
                }
            }
            return newHierarchy;
        });
    };

    const handleSave = async () => {
        if (!selectedUniId) return;
        setSaving(true);
        setStatusMsg(null);

        try {
            // 1. Delete existing mappings for this specific scope
            let deleteQuery = supabase
                .from('university_content_access')
                .delete()
                .eq('university_id', selectedUniId);

            if (selectedInstId === 'none') {
                deleteQuery = deleteQuery.is('institution_id', null);
            } else {
                deleteQuery = deleteQuery.eq('institution_id', selectedInstId);
            }

            await deleteQuery;

            // 2. Prepare new rows
            const rows: any[] = [];

            hierarchy.forEach(subject => {
                subject.children?.forEach(topic => {
                    topic.children?.forEach(subtopic => {
                        if (subtopic.isSelected) {
                            rows.push({
                                university_id: selectedUniId,
                                institution_id: selectedInstId === 'none' ? null : selectedInstId,
                                subject_id: subject.id,
                                topic_id: topic.id,
                                subtopic_id: subtopic.id,
                                is_active: true,
                                session_limit: globalSessionLimit,
                                difficulty_level: globalDifficultyLevel
                            });
                        }
                    });

                    // Fallback: If topic is selected but NO subtopics? 
                    // Usually we want subtopics. If generic topic mapping is needed, we can add it.
                    // But for now, let's assume subtopic granularity is key.
                    if (topic.isSelected && (!topic.children || topic.children.length === 0)) {
                        // Map topic without subtopic (for topics with no subtopics yet)
                        rows.push({
                            university_id: selectedUniId,
                            institution_id: selectedInstId === 'none' ? null : selectedInstId,
                            subject_id: subject.id,
                            topic_id: topic.id,
                            subtopic_id: null,
                            is_active: true,
                            session_limit: globalSessionLimit,
                            difficulty_level: globalDifficultyLevel
                        });
                    }
                });
            });

            if (rows.length > 0) {
                // Batch insert (supabase limits batch size, let's chunk if huge, but 1000 is usually fine)
                const { error } = await supabase.from('university_content_access').insert(rows);
                if (error) throw error;
            }

            setStatusMsg({ type: 'success', text: `Saved ${rows.length} content mappings successfully!` });
        } catch (e: any) {
            console.error(e);
            setStatusMsg({ type: 'error', text: `Failed to save: ${e.message}` });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="super_admin" />
            <div className="flex-1 flex flex-col transition-all duration-300">
                <Header userName="Admin" userEmail="admin@system.com" />

                <main className={`${isSidebarCollapsed ? 'ml-20' : 'ml-72'} mt-16 p-8 transition-all duration-300`}>
                    <div className="max-w-4xl mx-auto">
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-slate-900">University Content Mapper</h1>
                            <p className="text-slate-500 mt-2">Assign granular content permissions to Universities.</p>
                        </div>

                        {/* Selector */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Select University</label>
                                <select
                                    value={selectedUniId || ''}
                                    onChange={(e) => setSelectedUniId(parseInt(e.target.value))}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">-- Choose a University --</option>
                                    {universities.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Select Institution (Override)</label>
                                <select
                                    value={selectedInstId}
                                    onChange={(e) => setSelectedInstId(e.target.value === 'none' ? 'none' : parseInt(e.target.value))}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="none">Global Default (No Institution)</option>
                                    {institutions.map(inst => (
                                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {selectedUniId && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-gray-50/50">
                                    <div className="flex items-center gap-2">
                                        <h2 className="font-bold text-slate-800">Content Hierarchy</h2>
                                        {selectedInstId !== 'none' && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-black uppercase">Institution Specific</span>}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Limit:</span>
                                            <input
                                                type="number"
                                                value={globalSessionLimit}
                                                onChange={(e) => setGlobalSessionLimit(parseInt(e.target.value) || 10)}
                                                className="w-12 bg-transparent outline-none text-center font-bold text-indigo-600"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Difficulty:</span>
                                            <select
                                                value={globalDifficultyLevel}
                                                onChange={(e) => setGlobalDifficultyLevel(e.target.value as any)}
                                                className="bg-transparent outline-none font-bold text-indigo-600 text-xs"
                                            >
                                                <option value="all">All Levels</option>
                                                <option value="easy">Basic Only</option>
                                                <option value="medium">Intermediate Only</option>
                                                <option value="hard">Advanced Only</option>
                                            </select>
                                        </div>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                        >
                                            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Save Changes
                                        </button>
                                    </div>
                                </div>

                                {statusMsg && (
                                    <div className={`p-4 ${statusMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'} flex items-center gap-2 border-b border-gray-100`}>
                                        {statusMsg.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                        {statusMsg.text}
                                    </div>
                                )}

                                <div className="p-6">
                                    {hierarchy.map(subject => (
                                        <div key={subject.id} className="mb-4 border border-gray-100 rounded-xl overflow-hidden">
                                            {/* Subject Row */}
                                            <div className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={subject.isSelected}
                                                        onChange={() => handleSelection('subject', subject.id)}
                                                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                                    />
                                                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleNode('subject', subject.id)}>
                                                        <Layers className="w-4 h-4 text-slate-400" />
                                                        <span className="font-bold text-slate-800">{subject.name}</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => toggleNode('subject', subject.id)}>
                                                    {subject.expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                                </button>
                                            </div>

                                            {/* Topics List */}
                                            {subject.expanded && (
                                                <div className="border-t border-gray-100 bg-white">
                                                    {subject.children?.map(topic => (
                                                        <div key={topic.id} className="ml-8 border-l-2 border-gray-100">
                                                            <div className="flex items-center gap-3 p-3 hover:bg-indigo-50/30 transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={topic.isSelected}
                                                                    onChange={() => handleSelection('topic', topic.id, subject.id)}
                                                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                                                />
                                                                <div className="flex-1 flex items-center justify-between cursor-pointer" onClick={() => toggleNode('topic', topic.id)}>
                                                                    <div className="flex items-center gap-2">
                                                                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                                                                        <span className="text-sm font-bold text-slate-700">{topic.name}</span>
                                                                    </div>
                                                                    {topic.children && topic.children.length > 0 && (
                                                                        topic.expanded ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Subtopics List */}
                                                            {topic.expanded && (
                                                                <div className="ml-8 mb-2 space-y-1">
                                                                    {topic.children?.map(subtopic => (
                                                                        <label key={subtopic.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={subtopic.isSelected}
                                                                                onChange={() => handleSelection('subtopic', subtopic.id, topic.id, subject.id)}
                                                                                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                                                            />
                                                                            <FileText className="w-3 h-3 text-slate-300" />
                                                                            <span className="text-sm text-slate-600">{subtopic.name}</span>
                                                                        </label>
                                                                    ))}
                                                                    {(!topic.children || topic.children.length === 0) && (
                                                                        <div className="text-xs italic text-slate-400 pl-9 py-1">No lessons available</div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {(!subject.children || subject.children.length === 0) && (
                                                        <div className="p-4 text-sm text-slate-400">No topics in this subject.</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {hierarchy.length === 0 && !loading && (
                                        <div className="text-center text-slate-400 py-10">No content found. Please add content in Hierarchy Manager.</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {!selectedUniId && (
                            <div className="text-center py-20 text-slate-400">
                                <ChevronDown className="w-10 h-10 mx-auto mb-4 text-gray-300" />
                                <p>Select a university to start mapping content.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
