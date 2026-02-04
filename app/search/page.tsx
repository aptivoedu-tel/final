'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { Search, Book, GraduationCap, FileText, ChevronRight, Loader2, University as UniIcon } from 'lucide-react';
import Link from 'next/link';

// Force this page to use SSR (required for useSearchParams)
export const runtime = 'edge';

type SearchResult = {
    id: number;
    title: string;
    type: 'university' | 'subject' | 'topic' | 'subtopic';
    description?: string;
    link: string;
    metadata?: any;
};

export default function SearchPage() {
    const searchParams = useSearchParams();
    const query = searchParams.get('q') || '';
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const u = AuthService.getCurrentUser();
        setUser(u);
        if (query) {
            performSearch();
        } else {
            setLoading(false);
        }
    }, [query]);

    const performSearch = async () => {
        setLoading(true);
        try {
            const searchResults: SearchResult[] = [];
            const isSuperAdmin = user?.role === 'super_admin';
            const isInstitutionAdmin = user?.role === 'institution_admin';

            // 1. Search Universities
            const { data: unis } = await supabase
                .from('universities')
                .select('id, name, logo_url')
                .ilike('name', `%${query}%`)
                .limit(5);

            unis?.forEach(u => {
                let link = '/university';
                if (isSuperAdmin) link = '/admin/universities';
                else if (isInstitutionAdmin) link = '/institution-admin/universities';

                searchResults.push({
                    id: u.id,
                    title: u.name,
                    type: 'university',
                    description: 'Partner Institution',
                    link,
                    metadata: { logo: u.logo_url }
                });
            });

            // 2. Search Subjects
            const { data: subjects } = await supabase
                .from('subjects')
                .select('id, name')
                .ilike('name', `%${query}%`)
                .limit(5);

            subjects?.forEach(s => {
                let link = '/university';
                if (isSuperAdmin) link = '/admin/content-library';

                searchResults.push({
                    id: s.id,
                    title: s.name,
                    type: 'subject',
                    description: 'Curriculum Subject',
                    link
                });
            });

            // 3. Search Topics
            const { data: topics } = await supabase
                .from('topics')
                .select('id, name')
                .ilike('name', `%${query}%`)
                .limit(10);

            topics?.forEach(t => {
                let link = '/university';
                if (isSuperAdmin) link = '/admin/content-library';

                searchResults.push({
                    id: t.id,
                    title: t.name,
                    type: 'topic',
                    description: 'Learning Topic',
                    link
                });
            });

            // 4. Search Subtopics (Lessons)
            const { data: subtopics } = await supabase
                .from('subtopics')
                .select('id, name')
                .ilike('name', `%${query}%`)
                .limit(10);

            subtopics?.forEach(st => {
                let link = '/university';
                if (isSuperAdmin) link = '/admin/content-library';

                searchResults.push({
                    id: st.id,
                    title: st.name,
                    type: 'subtopic',
                    description: 'Lesson Content',
                    link
                });
            });

            setResults(searchResults);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'university': return <UniIcon className="w-5 h-5 text-indigo-500" />;
            case 'subject': return <Book className="w-5 h-5 text-purple-500" />;
            case 'topic': return <GraduationCap className="w-5 h-5 text-blue-500" />;
            case 'subtopic': return <FileText className="w-5 h-5 text-emerald-500" />;
            default: return <Search className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole={user?.role || 'student'} />
            <div className="flex-1 flex flex-col">
                <Header userName={user?.full_name} userEmail={user?.email} />

                <main className="ml-64 mt-16 p-8">
                    <div className="max-w-4xl mx-auto">
                        <div className="mb-12">
                            <h1 className="text-3xl font-black text-slate-900 mb-2">Search Results</h1>
                            <p className="text-slate-500 font-medium">
                                {loading ? 'Searching...' : `Found ${results.length} results for "${query}"`}
                            </p>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                                <p className="text-slate-500 font-bold animate-pulse">Scanning Academic Library...</p>
                            </div>
                        ) : results.length > 0 ? (
                            <div className="space-y-4">
                                {results.map((result, idx) => (
                                    <Link
                                        key={`${result.type}-${result.id}-${idx}`}
                                        href={result.link}
                                        className="block bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                                                    {getTypeIcon(result.type)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                            {result.type}
                                                        </span>
                                                        <span className="text-slate-200">•</span>
                                                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                                                            {result.description}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                                                        {result.title}
                                                    </h3>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-[2.5rem] border border-gray-100 p-16 text-center shadow-sm">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Search className="w-10 h-10 text-gray-200" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-2">No results found</h3>
                                <p className="text-slate-500 font-medium max-w-sm mx-auto">
                                    We couldn't find anything matching "{query}". Try searching for specific topics like "Calculus", "Physics", or "Harvard".
                                </p>
                                <button
                                    onClick={() => window.history.back()}
                                    className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black tracking-widest uppercase hover:bg-slate-800 transition-all"
                                >
                                    Go Back
                                </button>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
