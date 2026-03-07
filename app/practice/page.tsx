'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useUI } from '@/lib/context/UIContext';
import { AuthService } from '@/lib/services/authService';
import { Search } from 'lucide-react';

// ─── Subject Card Palettes ──────────
const PALETTES = [
    { text: 'text-teal-900', bg: 'bg-teal-50/80', border: 'border-teal-100/60', hover: 'group-hover:text-teal-600', line: 'border-teal-200/60', dotActive: 'bg-teal-400', dotHover: 'group-hover:bg-teal-500' },
    { text: 'text-indigo-900', bg: 'bg-indigo-50/80', border: 'border-indigo-100/60', hover: 'group-hover:text-indigo-600', line: 'border-indigo-200/60', dotActive: 'bg-indigo-400', dotHover: 'group-hover:bg-indigo-500' },
    { text: 'text-emerald-900', bg: 'bg-emerald-50/80', border: 'border-emerald-100/60', hover: 'group-hover:text-emerald-600', line: 'border-emerald-200/60', dotActive: 'bg-emerald-400', dotHover: 'group-hover:bg-emerald-500' },
    { text: 'text-amber-900', bg: 'bg-amber-50/80', border: 'border-amber-100/60', hover: 'group-hover:text-amber-600', line: 'border-amber-200/60', dotActive: 'bg-amber-400', dotHover: 'group-hover:bg-amber-500' },
    { text: 'text-rose-900', bg: 'bg-rose-50/80', border: 'border-rose-100/60', hover: 'group-hover:text-rose-600', line: 'border-rose-200/60', dotActive: 'bg-rose-400', dotHover: 'group-hover:bg-rose-500' },
    { text: 'text-violet-900', bg: 'bg-violet-50/80', border: 'border-violet-100/60', hover: 'group-hover:text-violet-600', line: 'border-violet-200/60', dotActive: 'bg-violet-400', dotHover: 'group-hover:bg-violet-500' },
    { text: 'text-sky-900', bg: 'bg-sky-50/80', border: 'border-sky-100/60', hover: 'group-hover:text-sky-600', line: 'border-sky-200/60', dotActive: 'bg-sky-400', dotHover: 'group-hover:bg-sky-500' },
    { text: 'text-orange-900', bg: 'bg-orange-50/80', border: 'border-orange-100/60', hover: 'group-hover:text-orange-600', line: 'border-orange-200/60', dotActive: 'bg-orange-400', dotHover: 'group-hover:bg-orange-500' },
];

export default function PracticePage() {
    const { isSidebarCollapsed } = useUI();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // hierarchy with MCQ counts pre-computed
    const [hierarchy, setHierarchy] = useState<
        {
            id: number;
            name: string;
            palette: typeof PALETTES[0];
            topics: {
                id: number;
                name: string;
                hasQuestions: boolean;
                subtopics: { id: number; name: string; hasQuestions: boolean }[];
            }[];
        }[]
    >([]);

    useEffect(() => {
        const init = async () => {
            const currentUser = AuthService.getCurrentUser() || await AuthService.syncSession();
            if (!currentUser) { router.push('/login'); return; }
            setUser(currentUser);

            try {
                // Fetch full hierarchy + MCQ id-maps in one call
                const [hierRes, mcqRes] = await Promise.all([
                    fetch('/api/mongo/admin/hierarchy?type=all'),
                    fetch('/api/mongo/mcqs?counts_only=true'),
                ]);

                const hierData = await hierRes.json();
                const mcqData = await mcqRes.json();

                const subjects: any[] = (hierData.subjects || []).filter((s: any) => s.is_active);
                const topics: any[] = (hierData.topics || []).filter((t: any) => t.is_active);
                const subtopics: any[] = (hierData.subtopics || []).filter((s: any) => s.is_active);
                const allMcqs: any[] = mcqData.allMcqs || [];

                // Build sets of topic_id / subtopic_id that have ≥1 MCQ
                const topicIdsWithQ = new Set<number>(allMcqs.map((m: any) => m.topic_id).filter(Boolean));
                const subtopicIdsWithQ = new Set<number>(allMcqs.map((m: any) => m.subtopic_id).filter(Boolean));

                // Also mark a topic as having questions if any of its subtopics do
                subtopics.forEach((st: any) => {
                    if (subtopicIdsWithQ.has(st.id)) topicIdsWithQ.add(st.topic_id);
                });

                const built = subjects.map((subj: any, idx: number) => {
                    const subjTopics = topics
                        .filter((t: any) => t.subject_id === subj.id && topicIdsWithQ.has(t.id))
                        .sort((a: any, b: any) => a.sequence_order - b.sequence_order)
                        .map((t: any) => {
                            const subs = subtopics
                                .filter((st: any) => st.topic_id === t.id && subtopicIdsWithQ.has(st.id))
                                .sort((a: any, b: any) => a.sequence_order - b.sequence_order)
                                .map((st: any) => ({ id: st.id, name: st.name, hasQuestions: true }));

                            return {
                                id: t.id,
                                name: t.name,
                                hasQuestions: true,
                                subtopics: subs,
                            };
                        });

                    return {
                        id: subj.id,
                        name: subj.name,
                        palette: PALETTES[idx % PALETTES.length],
                        topics: subjTopics,
                    };
                }).filter((s: any) => s.topics.length > 0); // hide subjects with zero content

                setHierarchy(built);
            } catch (err) {
                console.error('Failed to fetch hierarchy:', err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    // ── Filtered hierarchy based on search ──────────────────────────────────
    const filtered = hierarchy
        .map(subj => {
            const q = searchTerm.toLowerCase();
            if (!q) return subj;
            const matchedTopics = subj.topics
                .map(t => ({
                    ...t,
                    subtopics: t.subtopics.filter(st => st.name.toLowerCase().includes(q)),
                }))
                .filter(t =>
                    t.name.toLowerCase().includes(q) ||
                    t.subtopics.length > 0 ||
                    subj.name.toLowerCase().includes(q)
                );
            if (!subj.name.toLowerCase().includes(q) && matchedTopics.length === 0) return null;
            return { ...subj, topics: matchedTopics };
        })
        .filter(Boolean) as typeof hierarchy;

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <Sidebar userRole="student" />

            <div className={`flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-24' : 'lg:ml-72'}`}>
                <Header
                    userName={user?.full_name || 'Student'}
                    userEmail={user?.email}
                    userAvatar={user?.avatar_url}
                />

                <main className="p-5 lg:p-8 mt-24">
                    <div className="max-w-5xl mx-auto">

                        {/* Page Header */}
                        <div className="mb-7">
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Browse Curriculum</h1>
                            <p className="text-sm text-slate-500 mt-1">
                                Access our comprehensive library of standards-aligned subjects. Every course is designed to build mastery from the ground up.
                            </p>
                        </div>

                        {/* Search */}
                        <div className="relative mb-8 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search topics or subtopics..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
                            />
                        </div>

                        {/* Two-column grid of subjects */}
                        {filtered.length === 0 ? (
                            <div className="text-center py-20 text-slate-400 text-sm font-semibold">No topics found.</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                                {filtered.map(subj => (
                                    <SubjectSection
                                        key={subj.id}
                                        subject={subj}
                                        onTopicClick={id => router.push(`/practice/session/${id}`)}
                                        onSubtopicClick={id => router.push(`/practice/session/subtopic/${id}`)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

// ─── Subject Section Component ────────────────────────────────────────────────
function SubjectSection({
    subject,
    onTopicClick,
    onSubtopicClick,
}: {
    subject: any;
    onTopicClick: (id: number) => void;
    onSubtopicClick: (id: number) => void;
}) {
    return (
        <div className={`rounded-2xl p-6 ${subject.palette.bg} border ${subject.palette.border} shadow-sm transition-all hover:shadow-md w-full h-full flex flex-col`}>
            {/* Subject header */}
            <div className={`mb-4 pb-3 border-b ${subject.palette.line}`}>
                <h2 className={`text-xl font-bold ${subject.palette.text} tracking-tight`}>
                    {subject.name}
                </h2>
            </div>

            {/* Topics list */}
            <ul className="space-y-1.5">
                {subject.topics.map((topic: any) => (
                    <li key={topic.id} className="py-0.5">
                        {/* Topic row */}
                        <button
                            onClick={() => onTopicClick(topic.id)}
                            className="w-full flex items-start gap-2.5 py-1 text-left group"
                        >
                            <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 bg-slate-300 ${subject.palette.dotHover} transition-colors`} />
                            <span className={`text-sm font-semibold text-slate-700 ${subject.palette.hover} transition-colors leading-snug`}>
                                {topic.name}
                            </span>
                        </button>

                        {/* Subtopics nested under this topic */}
                        {topic.subtopics.length > 0 && (
                            <ul className="ml-5 mt-1.5 mb-2.5 space-y-1 border-l-2 border-slate-200/70 pl-3">
                                {topic.subtopics.map((st: any) => (
                                    <li key={st.id}>
                                        <button
                                            onClick={() => onSubtopicClick(st.id)}
                                            className="w-full flex items-start gap-2 py-0.5 text-left group"
                                        >
                                            <span className={`text-xs font-medium text-slate-500 ${subject.palette.hover} transition-colors leading-snug`}>
                                                {st.name}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
