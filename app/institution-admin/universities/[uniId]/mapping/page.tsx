'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { ChevronLeft, Save, CheckSquare, Square, ChevronRight, ChevronDown, BookOpen, Layers, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { useLoading } from '@/lib/context/LoadingContext';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useUI } from '@/lib/context/UIContext';
import { AuthService } from '@/lib/services/authService';



interface Subtopic {
    id: number;
    name: string;
}

interface Topic {
    id: number;
    name: string;
    subtopics: Subtopic[];
}

interface Subject {
    id: number;
    name: string;
    topics: Topic[];
}

export default function UniversityContentMapper() {
    const { uniId } = useParams();
    const router = useRouter();
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const [saving, setSaving] = useState(false);
    const [university, setUniversity] = useState<any>(null);
    const [institutionId, setInstitutionId] = useState<number | null>(null);
    const [globalSessionLimit, setGlobalSessionLimit] = useState(10);
    const [user, setUser] = useState<any>(null);

    const { isSidebarCollapsed } = useUI();

    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubtopics, setSelectedSubtopics] = useState<Record<number, string[]>>({});
    const [expandedSubjects, setExpandedSubjects] = useState<Set<number>>(new Set());
    const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set());

    useEffect(() => {
        loadData();
    }, [uniId]);

    const loadData = async () => {
        setGlobalLoading(true, 'Fetching Curriculum Mapping Structure...');

        try {
            // 1. Get current user and institution
            const currentUser = AuthService.getCurrentUser();
            const storedUser = typeof window !== 'undefined' ? localStorage.getItem('aptivo_user') : null;
            const activeUser = currentUser || (storedUser ? JSON.parse(storedUser) : null);

            if (!activeUser) {
                router.push('/login');
                return;
            }
            setUser(activeUser);

            const { data: profile } = await supabase
                .from('users')
                .select('institution_id')
                .eq('id', activeUser.id)
                .single();

            let instId = profile?.institution_id;

            if (!instId) {
                // FALLBACK: Try checking institution_admins table
                const { data: adminLink } = await supabase
                    .from('institution_admins')
                    .select('institution_id')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (adminLink?.institution_id) {
                    console.log("Rescued institution link from institution_admins");
                    instId = adminLink.institution_id;
                    // Proactively update the users table for next time
                    await supabase.from('users').update({ institution_id: instId }).eq('id', user.id);
                } else {
                    toast.error("Institution link missing. Please contact Super Admin.");
                    return;
                }
            }
            setInstitutionId(instId);

            // 2. Load University Info
            const { data: uni } = await supabase.from('universities').select('*').eq('id', uniId).single();
            setUniversity(uni);

            // 3. Load All Subjects, Topics, Subtopics
            const { data: subjectsData } = await supabase
                .from('subjects')
                .select(`
          id, 
          name,
          topics:topics(
            id, 
            name,
            subtopics:subtopics(id, name)
          )
        `)
                .order('name');

            setSubjects(subjectsData as unknown as Subject[] || []);

            // 4. Load Existing Mappings
            const { data: mappings } = await supabase
                .from('university_content_access')
                .select('subtopic_id, allowed_difficulties')
                .eq('university_id', uniId)
                .eq('institution_id', instId)
                .eq('is_active', true);

            if (mappings) {
                const map: Record<number, string[]> = {};
                mappings.forEach(m => {
                    map[m.subtopic_id] = m.allowed_difficulties || ['easy', 'medium', 'hard'];
                });
                setSelectedSubtopics(map);
            }

        } catch (error: any) {
            toast.error("Failed to load mapping data: " + error.message);
        } finally {
            setTimeout(() => setGlobalLoading(false), 800);
        }
    };


    const toggleSubtopic = (subtopicId: number) => {
        const newSelected = { ...selectedSubtopics };
        if (newSelected[subtopicId]) {
            delete newSelected[subtopicId];
        } else {
            newSelected[subtopicId] = ['easy', 'medium', 'hard'];
        }
        setSelectedSubtopics(newSelected);
    };

    const toggleTopic = (topic: Topic, isSelected: boolean) => {
        const newSelected = { ...selectedSubtopics };
        topic.subtopics.forEach(st => {
            if (isSelected) {
                newSelected[st.id] = newSelected[st.id] || ['easy', 'medium', 'hard'];
            } else {
                delete newSelected[st.id];
            }
        });
        setSelectedSubtopics(newSelected);
    };

    const toggleSubject = (subject: Subject, isSelected: boolean) => {
        const newSelected = { ...selectedSubtopics };
        subject.topics.forEach(t => {
            t.subtopics.forEach(st => {
                if (isSelected) {
                    newSelected[st.id] = newSelected[st.id] || ['easy', 'medium', 'hard'];
                } else {
                    delete newSelected[st.id];
                }
            });
        });
        setSelectedSubtopics(newSelected);
    };

    const toggleDifficulty = (topic: Topic, difficulty: string) => {
        const newSelected = { ...selectedSubtopics };
        topic.subtopics.forEach(st => {
            const current = newSelected[st.id] || ['easy', 'medium', 'hard'];
            let next: string[];
            if (current.includes(difficulty)) {
                next = current.filter(d => d !== difficulty);
            } else {
                next = [...current, difficulty];
            }
            // Ensure at least one is selected if the subtopic is active
            if (next.length > 0) {
                newSelected[st.id] = next;
            }
        });
        setSelectedSubtopics(newSelected);
    };

    const handleSave = async () => {
        if (!institutionId) return;
        setGlobalLoading(true, 'Synchronizing Content Mapping...');


        try {
            // 1. Deactivate existing mappings for this institution/university
            await supabase
                .from('university_content_access')
                .update({ is_active: false })
                .eq('university_id', uniId)
                .eq('institution_id', institutionId);

            // 2. Prepare new mappings
            const newMappings: any[] = [];

            subjects.forEach(subject => {
                subject.topics.forEach(topic => {
                    topic.subtopics.forEach(subtopic => {
                        if (selectedSubtopics[subtopic.id]) {
                            newMappings.push({
                                university_id: parseInt(uniId as string),
                                institution_id: institutionId,
                                subject_id: subject.id,
                                topic_id: topic.id,
                                subtopic_id: subtopic.id,
                                is_active: true,
                                session_limit: globalSessionLimit,
                                allowed_difficulties: selectedSubtopics[subtopic.id]
                            });
                        }
                    });
                });
            });

            if (newMappings.length > 0) {
                const { error } = await supabase
                    .from('university_content_access')
                    .upsert(newMappings, { onConflict: 'university_id,institution_id,subtopic_id' });

                if (error) throw error;
            }

            toast.success("Content map updated successfully!");
        } catch (error: any) {
            toast.error("Failed to save mapping: " + error.message);
        } finally {
            setGlobalLoading(false);
        }
    };


    const isTopicSelected = (topic: Topic) => {
        return topic.subtopics.length > 0 && topic.subtopics.every(st => !!selectedSubtopics[st.id]);
    };

    const isTopicPartial = (topic: Topic) => {
        const selectedCount = topic.subtopics.filter(st => !!selectedSubtopics[st.id]).length;
        return selectedCount > 0 && selectedCount < topic.subtopics.length;
    };

    const isSubjectSelected = (subject: Subject) => {
        const allStIds: number[] = [];
        subject.topics.forEach(t => t.subtopics.forEach(st => allStIds.push(st.id)));
        return allStIds.length > 0 && allStIds.every(id => !!selectedSubtopics[id]);
    };

    const isSubjectPartial = (subject: Subject) => {
        const allStIds: number[] = [];
        subject.topics.forEach(t => t.subtopics.forEach(st => allStIds.push(st.id)));
        const selectedCount = allStIds.filter(id => !!selectedSubtopics[id]).length;
        return selectedCount > 0 && selectedCount < allStIds.length;
    };


    if (loading) return null;

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="institution_admin" />
            <div className="flex-1 flex flex-col">
                <Header userName={user?.full_name} userEmail={user?.email} userAvatar={user?.avatar_url} />

                <main className={`${isSidebarCollapsed ? 'lg:ml-24' : 'lg:ml-72'} pt-24 p-4 lg:p-8 transition-all duration-300`}>
                    <div className="max-w-5xl mx-auto pb-20">
                        <div className="flex items-center gap-4 mb-8">
                            <button
                                onClick={() => router.back()}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-6 h-6 text-slate-600" />
                            </button>
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900">Content Mapping</h1>
                                <p className="text-slate-500">Configure which subjects and sub-topics are available for <span className="text-indigo-600 font-bold">{university?.name}</span>.</p>
                            </div>
                            <div className="ml-auto">
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl font-bold shadow-lg hover:bg-teal-700 transition-all"
                                >
                                    <Save className="w-5 h-5" />
                                    Save Changes
                                </button>

                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-indigo-600" />
                                    <h2 className="font-bold text-slate-800 text-lg">Curriculum Tree</h2>
                                </div>
                                <div className="flex flex-wrap items-center gap-6">
                                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Question Count:</span>
                                        <input
                                            type="number"
                                            value={globalSessionLimit}
                                            onChange={(e) => setGlobalSessionLimit(parseInt(e.target.value) || 10)}
                                            className="w-16 bg-transparent border-b-2 border-indigo-100 focus:border-indigo-600 outline-none text-center font-bold text-slate-900"
                                        />
                                    </div>
                                    <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-3 h-3 bg-indigo-600 rounded-sm" /> Selected
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-3 h-3 border-2 border-slate-200 rounded-sm" /> Unselected
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-4">
                                {subjects.map(subject => {
                                    const subjectOpen = expandedSubjects.has(subject.id);
                                    const subSelected = isSubjectSelected(subject);
                                    const subPartial = isSubjectPartial(subject);

                                    return (
                                        <div key={subject.id} className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm transition-all hover:border-indigo-100">
                                            <div className={`flex items-center p-5 transition-colors ${subjectOpen ? 'bg-indigo-50/30' : ''}`}>
                                                <button
                                                    onClick={() => {
                                                        const newExpanded = new Set(expandedSubjects);
                                                        if (newExpanded.has(subject.id)) newExpanded.delete(subject.id);
                                                        else newExpanded.add(subject.id);
                                                        setExpandedSubjects(newExpanded);
                                                    }}
                                                    className="p-1 hover:bg-white rounded transition-colors mr-2"
                                                >
                                                    {subjectOpen ? <ChevronDown className="w-5 h-5 text-indigo-600" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                                                </button>

                                                <button
                                                    onClick={() => toggleSubject(subject, !subSelected)}
                                                    className="flex items-center gap-3 flex-1 text-left group"
                                                >
                                                    <div className="text-indigo-600">
                                                        {subSelected ? <CheckSquare className="w-6 h-6 fill-current" /> : (subPartial ? <div className="w-6 h-6 border-2 border-indigo-600 rounded bg-indigo-100 flex items-center justify-center"><div className="w-3.5 h-0.5 bg-indigo-600" /></div> : <Square className="w-6 h-6 text-slate-300 group-hover:text-indigo-300" />)}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                            <Layers className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <span className="font-bold text-slate-800 text-lg">{subject.name}</span>
                                                            <span className="ml-3 text-xs text-slate-400 font-medium">
                                                                {subject.topics.length} Topics • {subject.topics.reduce((acc, t) => acc + t.subtopics.length, 0)} Sub-topics
                                                            </span>
                                                        </div>
                                                    </div>
                                                </button>
                                            </div>

                                            {subjectOpen && (
                                                <div className="px-10 pb-5 pt-0 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                                    {subject.topics.map(topic => {
                                                        const topicOpen = expandedTopics.has(topic.id);
                                                        const topSelected = isTopicSelected(topic);
                                                        const topPartial = isTopicPartial(topic);

                                                        return (
                                                            <div key={topic.id} className="border border-gray-50 rounded-xl overflow-hidden bg-gray-50/30">
                                                                <div className={`flex items-center p-4 transition-colors ${topicOpen ? 'bg-white' : ''}`}>
                                                                    <button
                                                                        onClick={() => {
                                                                            const newExpanded = new Set(expandedTopics);
                                                                            if (newExpanded.has(topic.id)) newExpanded.delete(topic.id);
                                                                            else newExpanded.add(topic.id);
                                                                            setExpandedTopics(newExpanded);
                                                                        }}
                                                                        className="p-1 hover:bg-gray-100 rounded transition-colors mr-2"
                                                                    >
                                                                        {topicOpen ? <ChevronDown className="w-4 h-4 text-slate-600" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                                                    </button>

                                                                    <div className="flex items-center gap-3 flex-1">
                                                                        <button
                                                                            onClick={() => toggleTopic(topic, !topSelected)}
                                                                            className="flex items-center gap-3 flex-1 text-left group"
                                                                        >
                                                                            <div className="text-slate-600">
                                                                                {topSelected ? <CheckSquare className="w-5 h-5 fill-indigo-600 text-white" /> : (topPartial ? <div className="w-5 h-5 border-2 border-indigo-600 rounded bg-indigo-50 flex items-center justify-center"><div className="w-2.5 h-0.5 bg-indigo-600" /></div> : <Square className="w-5 h-5 text-slate-300 group-hover:text-indigo-300" />)}
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <Lightbulb className="w-4 h-4 text-amber-500" />
                                                                                <span className="font-bold text-slate-700">{topic.name}</span>
                                                                                <span className="ml-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">{topic.subtopics.length} Lessons</span>
                                                                            </div>
                                                                        </button>

                                                                        {topSelected && (
                                                                            <div className="relative ml-4">
                                                                                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm group/dropdown cursor-pointer hover:border-indigo-600 transition-all">
                                                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Difficulty:</span>
                                                                                    <div className="flex items-center gap-1.5 min-w-[100px] justify-between">
                                                                                        <span className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">
                                                                                            {(() => {
                                                                                                const selectedCount = ['easy', 'medium', 'hard'].filter(diff =>
                                                                                                    topic.subtopics.every(st => selectedSubtopics[st.id]?.includes(diff))
                                                                                                ).length;
                                                                                                if (selectedCount === 3) return 'All Levels';
                                                                                                if (selectedCount === 0) return 'Select';
                                                                                                return `${selectedCount} Selected`;
                                                                                            })()}
                                                                                        </span>
                                                                                        <ChevronDown className="w-3.5 h-3.5 text-indigo-600 group-hover/dropdown:rotate-180 transition-transform" />
                                                                                    </div>

                                                                                    {/* Dropdown Menu */}
                                                                                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 opacity-0 invisible group-hover/dropdown:opacity-100 group-hover/dropdown:visible transition-all">
                                                                                        {[
                                                                                            { id: 'easy', label: 'Basic' },
                                                                                            { id: 'medium', label: 'Intermediate' },
                                                                                            { id: 'hard', label: 'Advanced' }
                                                                                        ].map(diff => {
                                                                                            const isDiffSelected = topic.subtopics.every(st => selectedSubtopics[st.id]?.includes(diff.id));
                                                                                            return (
                                                                                                <div
                                                                                                    key={diff.id}
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        toggleDifficulty(topic, diff.id);
                                                                                                    }}
                                                                                                    className="px-4 py-2.5 hover:bg-indigo-50 flex items-center justify-between group/item transition-colors"
                                                                                                >
                                                                                                    <span className={`text-[11px] font-bold ${isDiffSelected ? 'text-indigo-600' : 'text-slate-600'}`}>
                                                                                                        {diff.label}
                                                                                                    </span>
                                                                                                    {isDiffSelected && <CheckSquare className="w-3.5 h-3.5 text-indigo-600 fill-current" />}
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {topicOpen && (
                                                                    <div className="px-12 pb-4 pt-1 space-y-1 animate-in fade-in slide-in-from-left-2 duration-200">
                                                                        {topic.subtopics.map(subtopic => (
                                                                            <button
                                                                                key={subtopic.id}
                                                                                onClick={() => toggleSubtopic(subtopic.id)}
                                                                                className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-white hover:shadow-sm transition-all group group-hover:translate-x-1"
                                                                            >
                                                                                <div className="text-slate-400 group-hover:text-indigo-400">
                                                                                    {selectedSubtopics[subtopic.id] ? (
                                                                                        <CheckSquare className="w-4 h-4 fill-indigo-600 text-white group-hover:scale-110 transition-transform" />
                                                                                    ) : (
                                                                                        <Square className="w-4 h-4 group-hover:border-indigo-300" />
                                                                                    )}
                                                                                </div>
                                                                                <span className={`text-sm ${selectedSubtopics[subtopic.id] ? 'font-bold text-slate-900' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                                                                    {subtopic.name}
                                                                                </span>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
