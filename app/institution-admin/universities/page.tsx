'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Lock, Unlock, Search, Building2, BookOpen, Target, FileText } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AuthService } from '@/lib/services/authService';

export default function UniversitySelectorPage() {
    const [universities, setUniversities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [lockedStates, setLockedStates] = useState<Record<number, boolean>>({});
    const [institutionId, setInstitutionId] = useState<number | null>(null);

    useEffect(() => {
        const loadData = async () => {
            // 0. Get User Profile
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const instId = await AuthService.getInstitutionId(user.id);
            setInstitutionId(instId);

            if (!instId) {
                toast.error("Institution link missing. You will not be able to manage university access.");
            }

            // 1. Fetch Universities - ALWAYS do this
            const { data: unis } = await supabase.from('universities').select('*').eq('is_active', true);
            setUniversities(unis || []);

            // 2. Fetch Access States if instId exists
            if (instId) {
                const { data: access } = await supabase
                    .from('institution_university_access')
                    .select('*')
                    .eq('institution_id', instId);

                const states: Record<number, boolean> = {};
                access?.forEach((a: any) => {
                    states[a.university_id] = a.is_locked;
                });
                setLockedStates(states);
            }
            setLoading(false);
        };
        loadData();
    }, []);

    const toggleLock = async (uniId: number, currentLocked: boolean) => {
        const newLocked = !currentLocked;

        // Optimistic Update
        setLockedStates(prev => ({ ...prev, [uniId]: newLocked }));

        if (!institutionId) {
            toast.error('Institution ID not found');
            return;
        }

        const { error } = await supabase
            .from('institution_university_access')
            .upsert({
                institution_id: institutionId,
                university_id: uniId,
                is_locked: newLocked
            }, { onConflict: 'institution_id,university_id' });

        if (error) {
            toast.error('Failed to update access');
            setLockedStates(prev => ({ ...prev, [uniId]: currentLocked })); // Revert
        } else {
            toast.success(newLocked ? 'University Locked' : 'University Unlocked');
        }
    };

    const filteredUnis = universities.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 mb-12">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-none">University Management</h1>
                    <p className="text-slate-500 text-lg mt-2 font-medium">Oversee assessments and control student access permissions.</p>
                </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row md:items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search universities by name or location..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 text-sm font-semibold transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-teal-100">
                    <Building2 className="w-3.5 h-3.5" />
                    {filteredUnis.length} Active Listings
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {loading ? (
                    <div className="p-20 text-center">
                        <div className="animate-spin w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Synchronizing Catalog...</p>
                    </div>
                ) : filteredUnis.length === 0 ? (
                    <div className="p-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                        <Search className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                        <h3 className="text-xl font-bold text-slate-900 mb-1">No matches found</h3>
                        <p className="text-slate-500 font-medium">Try adjusting your search filters.</p>
                    </div>
                ) : (
                    filteredUnis.map(uni => {
                        const isLocked = lockedStates[uni.id] ?? true;
                        return (
                            <div key={uni.id} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 flex flex-col xl:flex-row xl:items-center justify-between shadow-sm hover:shadow-2xl hover:shadow-teal-50/50 transition-all gap-8 group">
                                <div className="flex items-center gap-6 flex-1 min-w-0">
                                    <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300 overflow-hidden border border-slate-100 shrink-0 group-hover:scale-105 transition-transform duration-500 shadow-inner">
                                        {uni.logo_url ? (
                                            <img src={uni.logo_url} alt={uni.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Building2 className="w-10 h-10" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-xl font-black text-slate-900 leading-tight truncate">{uni.name}</h3>
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${isLocked ? 'text-rose-500 bg-rose-50 border-rose-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>
                                                {isLocked ? 'Closed' : 'Visible'}
                                            </span>
                                        </div>
                                        <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">{uni.country || 'International Spectrum'} • {uni.city || 'Central Hub'}</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 xl:justify-end border-t xl:border-t-0 pt-6 xl:pt-0 border-slate-50">
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <Link
                                            href={`/institution-admin/universities/${uni.id}/exams`}
                                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                                        >
                                            <Target className="w-3.5 h-3.5" />
                                            Manage Exams
                                        </Link>
                                        <Link
                                            href="/institution-admin/content-editor"
                                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                                        >
                                            <FileText className="w-3.5 h-3.5" />
                                            Review Content
                                        </Link>
                                    </div>

                                    <div className="h-8 w-px bg-slate-100 hidden sm:block mx-2" />

                                    <button
                                        onClick={() => toggleLock(uni.id, isLocked)}
                                        className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-black transition-all text-[10px] uppercase tracking-widest shadow-xl active:scale-95 ${isLocked
                                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100'
                                            : 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-100'
                                            }`}
                                    >
                                        {isLocked ? (
                                            <><Unlock className="w-4 h-4" /> Unlock Students</>
                                        ) : (
                                            <><Lock className="w-4 h-4" /> Lock Students</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
