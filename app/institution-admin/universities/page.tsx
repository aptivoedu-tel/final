'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Lock, Unlock, Search, Building2, BookOpen } from 'lucide-react';
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
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 mb-8 text-center lg:text-left">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-black text-slate-900 leading-tight">University Access Control</h1>
                    <p className="text-slate-500 text-base lg:text-lg">Control which universities your students can see and access.</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <div className="relative w-full max-w-md mx-auto lg:mx-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search universities..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-inner transition-all"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="p-8 text-center text-gray-400">Loading catalog...</div>
                ) : filteredUnis.map(uni => {
                    const isLocked = lockedStates[uni.id] || false;
                    return (
                        <div key={uni.id} className="bg-white border border-gray-200 rounded-2xl p-4 lg:p-6 flex flex-col sm:flex-row sm:items-center justify-between shadow-sm hover:shadow-xl lg:hover:scale-[1.01] transition-all gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 overflow-hidden border border-indigo-100 shrink-0">
                                    {uni.logo_url ? (
                                        <img src={uni.logo_url} alt={uni.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <Building2 className="w-6 h-6 lg:w-8 lg:h-8" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base lg:text-lg font-black text-slate-900 leading-tight truncate">{uni.name}</h3>
                                    <p className="text-slate-400 text-[10px] lg:text-xs font-bold uppercase tracking-widest">{uni.country || 'Global'}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 lg:gap-4 pt-3 sm:pt-0 border-t sm:border-t-0">
                                <span className={`text-[10px] lg:text-xs font-black uppercase tracking-widest ${isLocked ? 'text-red-500 bg-red-50' : 'text-green-600 bg-green-50'} px-3 py-1.5 rounded-lg`}>
                                    {isLocked ? 'Locked' : 'Open'}
                                </span>
                                <button
                                    onClick={() => toggleLock(uni.id, isLocked)}
                                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-xl font-black transition-all text-xs lg:text-sm shadow-sm active:scale-95 ${isLocked
                                        ? 'bg-red-600 text-white hover:bg-red-700'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                        }`}
                                >
                                    {isLocked ? (
                                        <><Unlock className="w-4 h-4" /> Unlock Access</>
                                    ) : (
                                        <><Lock className="w-4 h-4" /> Lock Access</>
                                    )}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
