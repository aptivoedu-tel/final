'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Lock, Unlock, Search, Building2, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

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

            const { data: profile } = await supabase
                .from('users')
                .select('institution_id')
                .eq('id', user.id)
                .single();

            const instId = profile?.institution_id;
            setInstitutionId(instId);

            // 1. Fetch Universities
            const { data: unis } = await supabase.from('universities').select('*').eq('is_active', true);

            // 2. Fetch Access States filtered by institution_id
            const { data: access } = await supabase
                .from('institution_university_access')
                .select('*')
                .eq('institution_id', instId || 0);

            const states: Record<number, boolean> = {};
            access?.forEach((a: any) => {
                states[a.university_id] = a.is_locked;
            });

            setUniversities(unis || []);
            setLockedStates(states);
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
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">University Access Control</h1>
                    <p className="text-slate-500 text-lg">Control which universities your students can see and access.</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search universities..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="p-8 text-center text-gray-400">Loading catalog...</div>
                ) : filteredUnis.map(uni => {
                    const isLocked = lockedStates[uni.id] || false;
                    return (
                        <div key={uni.id} className="bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 overflow-hidden border border-indigo-100">
                                    {uni.logo_url ? (
                                        <img src={uni.logo_url} alt={uni.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <Building2 className="w-8 h-8" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">{uni.name}</h3>
                                    <p className="text-slate-500 text-sm">{uni.country || 'Global'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <span className={`text-sm font-medium ${isLocked ? 'text-red-600' : 'text-green-600'} bg-gray-50 px-3 py-1 rounded-full`}>
                                    {isLocked ? 'Enrollment Locked' : 'Enrollment Open'}
                                </span>
                                <button
                                    onClick={() => toggleLock(uni.id, isLocked)}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${isLocked
                                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                                        }`}
                                >
                                    {isLocked ? (
                                        <><Lock className="w-4 h-4" /> Unlock</>
                                    ) : (
                                        <><Unlock className="w-4 h-4" /> Lock</>
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
