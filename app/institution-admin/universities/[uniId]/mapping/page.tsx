'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { ChevronLeft, Save, CheckSquare, Square, ChevronRight, ChevronDown, BookOpen, Layers, Lightbulb, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useLoading } from '@/lib/context/LoadingContext';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useUI } from '@/lib/context/UIContext';
import { AuthService } from '@/lib/services/authService';

interface Subtopic {
    id: number;
    name: string;
    isSelected?: boolean;
}

interface Topic {
    id: number;
    name: string;
    subtopics: Subtopic[];
    isSelected?: boolean;
    expanded?: boolean;
}

interface Subject {
    id: number;
    name: string;
    topics: Topic[];
    isSelected?: boolean;
    expanded?: boolean;
}

export default function UniversityContentMapper() {
    const { uniId } = useParams();
    const router = useRouter();
    const { setLoading: setGlobalLoading, isLoading: initialLoading } = useLoading();
    const [loadingMappings, setLoadingMappings] = useState(false);
    const [saving, setSaving] = useState(false);
    const [university, setUniversity] = useState<any>(null);
    const [institutionId, setInstitutionId] = useState<number | null>(null);
    const [globalSessionLimit, setGlobalSessionLimit] = useState(10);
    const [user, setUser] = useState<any>(null);
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const { isSidebarCollapsed } = useUI();

    const [hierarchy, setHierarchy] = useState<Subject[]>([]);
    const [baseTree, setBaseTree] = useState<Subject[]>([]);

    useEffect(() => {
        loadInitialData();
    }, [uniId]);

    const loadInitialData = async () => {
        setGlobalLoading(true, 'Fetching Curriculum Mapping Structure...');
        try {
            const currentUser = AuthService.getCurrentUser();
            if (!currentUser) {
                router.push('/login');
                return;
            }
            setUser(currentUser);

            const { data: profile } = await supabase
                .from('users')
                .select('institution_id')
                .eq('id', currentUser.id)
                .single();

            const instId = profile?.institution_id;
            if (!instId) {
                toast.error("Institution link missing. Please contact Super Admin.");
                return;
            }
            setInstitutionId(instId);

            const { data: uni } = await supabase.from('universities').select('*').eq('id', uniId).single();
            setUniversity(uni);

            const { data: subjectsData } = await supabase
                .from('subjects')
                .select(`id, name, topics:topics(id, name, subtopics:subtopics(id, name))`)
                .order('name');

            if (subjectsData) {
                const tree = (subjectsData as any[]).map(s => ({
                    ...s,
                    topics: s.topics.map((t: any) => ({
                        ...t,
                        subtopics: t.subtopics || []
                    }))
                }));
                setBaseTree(tree);
                // Load actual mappings after base tree is set
                await fetchMappings(instId, tree);
            }
        } catch (error: any) {
            toast.error("Failed to load mapping data: " + error.message);
        } finally {
            setGlobalLoading(false);
        }
    };

    const fetchMappings = async (instId: number, tree: Subject[]) => {
        setLoadingMappings(true);
        try {
            const res = await fetch(`/api/content-mapper?university_id=${uniId}&institution_id=${instId}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);

            const mappings: any[] = json.data || [];
            const selectedSubtopicIds = new Set(mappings.filter(m => m.subtopic_id !== null).map(m => Number(m.subtopic_id)));
            const selectedTopicIds = new Set(mappings.filter(m => m.topic_id !== null).map(m => Number(m.topic_id)));

            if (mappings.length > 0 && mappings[0].session_limit) {
                setGlobalSessionLimit(mappings[0].session_limit);
            }

            const updatedHierarchy = tree.map(subject => {
                const topics = subject.topics.map(topic => {
                    const subtopics = topic.subtopics.map(st => ({
                        ...st,
                        isSelected: selectedSubtopicIds.has(st.id)
                    }));

                    const isTopicSelected = subtopics.length > 0
                        ? subtopics.some(st => st.isSelected)
                        : selectedTopicIds.has(topic.id);

                    return {
                        ...topic,
                        subtopics,
                        isSelected: isTopicSelected,
                        expanded: false
                    };
                });

                const isSubjectSelected = topics.some(t => t.isSelected);

                return {
                    ...subject,
                    topics,
                    isSelected: isSubjectSelected,
                    expanded: isSubjectSelected
                };
            });

            setHierarchy(updatedHierarchy);
        } catch (e: any) {
            console.error(e);
            toast.error("Failed to load existing mappings");
            setHierarchy(tree.map(s => ({ ...s, expanded: false })));
        } finally {
            setLoadingMappings(false);
        }
    };

    const handleSelection = (type: 'subject' | 'topic' | 'subtopic', id: number, parentId?: number, grandParentId?: number) => {
        setHierarchy(prev => {
            const newHierarchy = JSON.parse(JSON.stringify(prev)) as Subject[];

            if (type === 'subject') {
                const sub = newHierarchy.find(s => s.id === id);
                if (sub) {
                    const newState = !sub.isSelected;
                    sub.isSelected = newState;
                    sub.topics.forEach(topic => {
                        topic.isSelected = newState;
                        topic.subtopics.forEach(st => st.isSelected = newState);
                    });
                }
            } else if (type === 'topic') {
                const sub = newHierarchy.find(s => s.id === parentId);
                if (sub) {
                    const topic = sub.topics.find(t => t.id === id);
                    if (topic) {
                        const newState = !topic.isSelected;
                        topic.isSelected = newState;
                        topic.subtopics.forEach(st => st.isSelected = newState);
                        sub.isSelected = sub.topics.some(t => t.isSelected);
                    }
                }
            } else if (type === 'subtopic') {
                const sub = newHierarchy.find(s => s.id === grandParentId);
                const topic = sub?.topics.find(t => t.id === parentId);
                const st = topic?.subtopics.find(s => s.id === id);
                if (st && topic && sub) {
                    st.isSelected = !st.isSelected;
                    topic.isSelected = topic.subtopics.some(c => c.isSelected);
                    sub.isSelected = sub.topics.some(t => t.isSelected);
                }
            }
            return newHierarchy;
        });
    };

    const toggleNode = (type: 'subject' | 'topic', id: number) => {
        setHierarchy(prev => {
            const clone = [...prev];
            if (type === 'subject') {
                const node = clone.find(s => s.id === id);
                if (node) node.expanded = !node.expanded;
            } else {
                for (const sub of clone) {
                    const topic = sub.topics.find(t => t.id === id);
                    if (topic) { topic.expanded = !topic.expanded; break; }
                }
            }
            return clone;
        });
    };

    const handleSave = async () => {
        if (!institutionId || !uniId) return;
        setSaving(true);
        setStatusMsg(null);

        const rows: any[] = [];
        hierarchy.forEach(subject => {
            subject.topics.forEach(topic => {
                topic.subtopics.forEach(subtopic => {
                    if (subtopic.isSelected) {
                        rows.push({
                            university_id: parseInt(uniId as string),
                            institution_id: institutionId,
                            subject_id: subject.id,
                            topic_id: topic.id,
                            subtopic_id: subtopic.id,
                            is_active: true,
                            session_limit: globalSessionLimit
                        });
                    }
                });

                if (topic.isSelected && topic.subtopics.length === 0) {
                    rows.push({
                        university_id: parseInt(uniId as string),
                        institution_id: institutionId,
                        subject_id: subject.id,
                        topic_id: topic.id,
                        subtopic_id: null,
                        is_active: true,
                        session_limit: globalSessionLimit
                    });
                }
            });
        });

        try {
            const res = await fetch('/api/content-mapper', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    university_id: parseInt(uniId as string),
                    institution_id: institutionId,
                    rows
                })
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Save failed');

            setStatusMsg({ type: 'success', text: `Saved ${json.count} content mappings successfully!` });
            toast.success("Content map updated successfully!");
        } catch (error: any) {
            console.error(error);
            setStatusMsg({ type: 'error', text: "Failed to save mapping: " + error.message });
            toast.error("Failed to save mappings");
        } finally {
            setSaving(false);
        }
    };

    if (initialLoading) return null;

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="institution_admin" />
            <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header />

                <main className="pt-28 lg:pt-24 p-4 lg:p-8">
                    <div className="max-w-5xl mx-auto pb-20">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-8">
                            <button onClick={() => router.back()} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                <ChevronLeft className="w-5 h-5 text-slate-600" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Institution Content Mapping</h1>
                                <p className="text-sm font-medium text-slate-500 mt-1">Configure curriculum access for <span className="text-teal-600 font-bold">{university?.name}</span> students.</p>
                            </div>
                            <div className="md:ml-auto flex items-center gap-4 w-full md:w-auto">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-teal-600 text-white rounded-xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-teal-100 hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {saving ? 'Syncing...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-teal-600">
                                        <Layers className="w-5 h-5" />
                                    </div>
                                    <h2 className="font-black text-slate-900 text-sm uppercase tracking-widest leading-none">Curriculum Structure</h2>
                                </div>
                                <div className="flex items-center gap-4 bg-white px-5 py-2.5 rounded-xl border border-slate-200">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question Pool Limit</span>
                                    <input
                                        type="number"
                                        value={globalSessionLimit}
                                        onChange={(e) => setGlobalSessionLimit(parseInt(e.target.value) || 10)}
                                        className="w-12 bg-transparent outline-none text-center font-black text-teal-600 border-b border-teal-100 focus:border-teal-600 transition-colors"
                                    />
                                </div>
                            </div>

                            {statusMsg && (
                                <div className={`p-4 ${statusMsg.type === 'success' ? 'bg-green-50 text-emerald-700' : 'bg-red-50 text-red-700'} flex items-center gap-3 border-b border-slate-100 animate-fade-in`}>
                                    {statusMsg.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                                    <span className="text-xs font-bold">{statusMsg.text}</span>
                                </div>
                            )}

                            <div className="p-6">
                                {loadingMappings ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
                                        <RefreshCw className="w-10 h-10 animate-spin text-teal-500" />
                                        <span className="text-xs font-black uppercase tracking-widest">Hydrating state...</span>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {hierarchy.map(subject => (
                                            <div key={subject.id} className="border border-slate-100 rounded-2xl overflow-hidden transition-all hover:border-teal-200">
                                                <div className={`flex items-center justify-between p-4 group transition-colors ${subject.expanded ? 'bg-slate-50' : 'bg-white hover:bg-slate-50/50'}`}>
                                                    <div className="flex items-center gap-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={subject.isSelected || false}
                                                            onChange={() => handleSelection('subject', subject.id)}
                                                            className="w-5 h-5 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                                                        />
                                                        <div onClick={() => toggleNode('subject', subject.id)} className="flex items-center gap-3 cursor-pointer">
                                                            <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-teal-600 transition-colors">
                                                                <Layers className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-slate-800 text-sm tracking-tight">{subject.name}</p>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subject.topics.length} Units available</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => toggleNode('subject', subject.id)} className="p-2 hover:bg-white rounded-lg transition-colors">
                                                        {subject.expanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-300" />}
                                                    </button>
                                                </div>

                                                {subject.expanded && (
                                                    <div className="bg-white border-t border-slate-50 p-2 space-y-1">
                                                        {subject.topics.map(topic => (
                                                            <div key={topic.id} className="ml-4 rounded-xl overflow-hidden">
                                                                <div className="flex items-center justify-between p-3 hover:bg-slate-50/50 group transition-colors">
                                                                    <div className="flex items-center gap-4">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={topic.isSelected || false}
                                                                            onChange={() => handleSelection('topic', topic.id, subject.id)}
                                                                            className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                                                                        />
                                                                        <div onClick={() => topic.subtopics.length > 0 && toggleNode('topic', topic.id)} className={`flex items-center gap-3 ${topic.subtopics.length > 0 ? 'cursor-pointer' : ''}`}>
                                                                            <Lightbulb className={`w-4 h-4 ${topic.isSelected ? 'text-amber-500' : 'text-slate-300'}`} />
                                                                            <span className="text-sm font-bold text-slate-700">{topic.name}</span>
                                                                        </div>
                                                                    </div>
                                                                    {topic.subtopics.length > 0 && (
                                                                        <button onClick={() => toggleNode('topic', topic.id)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                                                                            {topic.expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-300" />}
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                {topic.expanded && (
                                                                    <div className="ml-10 py-2 space-y-1 border-l-2 border-slate-50">
                                                                        {topic.subtopics.map(st => (
                                                                            <label key={st.id} className="flex items-center gap-3 p-2 ml-4 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={st.isSelected || false}
                                                                                    onChange={() => handleSelection('subtopic', st.id, topic.id, subject.id)}
                                                                                    className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                                                                                />
                                                                                <BookOpen className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-400 transition-colors" />
                                                                                <span className="text-xs font-bold text-slate-500 group-hover:text-slate-900 transition-colors">{st.name}</span>
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {hierarchy.length === 0 && (
                                            <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                                <Layers className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                                <p className="text-slate-400 font-bold">No curriculum data found.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
