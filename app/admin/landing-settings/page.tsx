'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import {
    Star, Check, Building2, Eye, EyeOff
} from 'lucide-react';
import { useUI } from '@/lib/context/UIContext';
import { useLoading } from '@/lib/context/LoadingContext';

export default function AdminLandingSettingsPage() {
    const [feedbacks, setFeedbacks] = useState<any[]>([]);
    const [universities, setUniversities] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'universities' | 'feedbacks'>('universities');

    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const [user, setUser] = useState<any>(null);
    const { isSidebarCollapsed } = useUI();

    useEffect(() => {
        const init = async () => {
            const u = AuthService.getCurrentUser();
            if (u) setUser(u);
            await loadData();
        };
        init();
    }, []);

    const loadData = async () => {
        setGlobalLoading(true, 'Loading Landing Page Settings...');
        try {
            const [fbRes, uniRes] = await Promise.all([
                fetch('/api/mongo/feedback'),
                fetch('/api/mongo/admin/landing-settings')
            ]);

            if (fbRes.ok) {
                const fbData = await fbRes.json();
                setFeedbacks(fbData.feedbacks || []);
            }
            if (uniRes.ok) {
                const uniData = await uniRes.json();
                setUniversities(uniData.universities || []);
            }
        } catch (error) {
            console.error("Error loading landing settings data:", error);
        } finally {
            setGlobalLoading(false);
        }
    };

    const toggleFeedbackPublish = async (id: number, currentState: boolean) => {
        try {
            const res = await fetch('/api/mongo/feedback', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    is_published: !currentState
                })
            });

            if (!res.ok) throw new Error('Toggle failed');

            setFeedbacks(feedbacks.map(f =>
                f.id === id ? { ...f, is_published: !currentState } : f
            ));
        } catch (error) {
            console.error("Error toggling publish state:", error);
        }
    };

    const toggleUniversityDisplay = async (id: number, currentState: boolean) => {
        try {
            const res = await fetch('/api/mongo/admin/landing-settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    show_on_landing: !currentState
                })
            });

            if (!res.ok) throw new Error('Toggle failed');

            setUniversities(universities.map(u =>
                u.id === id ? { ...u, show_on_landing: !currentState } : u
            ));
        } catch (error) {
            console.error("Error toggling university display state:", error);
        }
    };

    const displayedUniversitiesCount = universities.filter(u => u.show_on_landing !== false).length;

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="super_admin" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name || 'Admin'} userEmail={user?.email || 'aptivo.education@gmail.com'} />

                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8">
                    <div className="max-w-5xl mx-auto">
                        <div className="mb-8">
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Landing Page Management</h1>
                            <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium">Control what universities and feedbacks appear on the public landing page.</p>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-200 mb-8 overflow-x-auto custom-scrollbar">
                            <button
                                onClick={() => setActiveTab('universities')}
                                className={`px-6 py-4 text-sm font-bold uppercase tracking-wider whitespace-nowrap whitespace-nowrap border-b-2 transition-all duration-200 ${activeTab === 'universities'
                                        ? 'border-teal-600 text-teal-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                                    }`}
                            >
                                <Building2 className="w-4 h-4 inline-block mr-2" />
                                Trusted Universities
                            </button>
                            <button
                                onClick={() => setActiveTab('feedbacks')}
                                className={`px-6 py-4 text-sm font-bold uppercase tracking-wider whitespace-nowrap whitespace-nowrap border-b-2 transition-all duration-200 ${activeTab === 'feedbacks'
                                        ? 'border-teal-600 text-teal-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                                    }`}
                            >
                                <Star className="w-4 h-4 inline-block mr-2" />
                                Student Voices
                            </button>
                        </div>

                        {loading ? null : (
                            <div>
                                {activeTab === 'universities' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between bg-teal-50 border border-teal-100 p-4 rounded-xl">
                                            <p className="text-sm text-teal-800 font-medium">
                                                <strong>{displayedUniversitiesCount}</strong> universities are currently selected to display in the marquee animation. For best animation results, keep this above 4 or 5.
                                            </p>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2">
                                            {universities.map(u => {
                                                const isDisplayed = u.show_on_landing !== false;
                                                return (
                                                    <div key={u.id} className={`bg-white border ${isDisplayed ? 'border-teal-100 ring-1 ring-teal-50' : 'border-gray-100'} rounded-2xl p-5 hover:shadow-xl transition-all`}>
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden">
                                                                    {u.logo_url ? (
                                                                        <img src={u.logo_url} alt={u.name} className="max-h-full max-w-full object-contain" />
                                                                    ) : (
                                                                        <Building2 className="w-5 h-5 text-gray-400" />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <h3 className="text-sm font-bold text-slate-900">{u.name}</h3>
                                                                    <p className="text-xs text-slate-500 truncate max-w-[200px]">{u.domain || 'No Domain'}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => toggleUniversityDisplay(u.id, isDisplayed)}
                                                            className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${isDisplayed
                                                                    ? 'bg-teal-600 text-white hover:bg-teal-700'
                                                                    : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                                                                }`}
                                                        >
                                                            {isDisplayed ? (
                                                                <><Eye className="w-4 h-4" /> Displaying in Marquee</>
                                                            ) : (
                                                                <><EyeOff className="w-4 h-4" /> Hidden</>
                                                            )}
                                                        </button>
                                                    </div>
                                                );
                                            })}

                                            {universities.length === 0 && (
                                                <div className="col-span-1 md:col-span-2 py-20 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                                    <p className="text-slate-500">No universities found.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'feedbacks' && (
                                    <div className="grid gap-4">
                                        <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-4 rounded-xl mb-2">
                                            <p className="text-sm text-blue-800 font-medium">
                                                Select the feedback items you want to feature under <strong>Student Success Stories</strong> on the landing page.
                                            </p>
                                        </div>

                                        {feedbacks.map((f) => (
                                            <div key={f.id} className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all group active:scale-[0.99]">
                                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
                                                    <div className="flex-1">
                                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                                                            <div className="flex gap-0.5">
                                                                {[1, 2, 3, 4, 5].map((s) => (
                                                                    <Star
                                                                        key={s}
                                                                        className={`w-3.5 h-3.5 ${s <= f.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <span className="text-sm font-bold text-slate-900">{f.user?.full_name || 'Anonymous Student'}</span>
                                                            <span className="text-xs text-slate-400 font-medium truncate max-w-[150px] sm:max-w-none"> {f.user?.email || ''}</span>
                                                        </div>

                                                        <p className="text-slate-600 text-sm mb-4 leading-relaxed font-medium">"{f.feedback_text}"</p>

                                                        <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                                            {new Date(f.created_at).toLocaleDateString()}
                                                            <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                                            {f.user?.role?.replace('_', ' ') || 'Student'}
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => toggleFeedbackPublish(f.id, f.is_published)}
                                                        className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm ${f.is_published
                                                            ? 'bg-emerald-600 text-white shadow-emerald-100 active:bg-slate-900'
                                                            : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 active:bg-slate-200'
                                                            }`}
                                                    >
                                                        {f.is_published && <Check className="w-3.5 h-3.5" />}
                                                        {f.is_published ? 'Featured' : 'Feature on Page'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {feedbacks.length === 0 && (
                                            <div className="py-20 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                                <p className="text-slate-500">No feedback submitted yet.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
