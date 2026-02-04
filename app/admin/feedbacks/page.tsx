'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import {
    Star, RefreshCw, Check
} from 'lucide-react';
import { useUI } from '@/lib/context/UIContext';

export default function AdminFeedbacksPage() {
    const [feedbacks, setFeedbacks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const { isSidebarCollapsed } = useUI();

    useEffect(() => {
        const init = async () => {
            const u = AuthService.getCurrentUser();
            if (u) setUser(u);
            await loadFeedbacks();
        };
        init();
    }, []);

    const loadFeedbacks = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('feedbacks')
                .select(`
                    *,
                    user:user_id (full_name, email, role)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setFeedbacks(data || []);
        } catch (error) {
            console.error("Error loading feedbacks:", error);
        } finally {
            setLoading(false);
        }
    };

    const togglePublish = async (id: number, currentState: boolean) => {
        try {
            const { error } = await supabase
                .from('feedbacks')
                .update({ is_published: !currentState })
                .eq('id', id);

            if (error) throw error;

            setFeedbacks(feedbacks.map(f =>
                f.id === id ? { ...f, is_published: !currentState } : f
            ));
        } catch (error) {
            console.error("Error toggling publish state:", error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="super_admin" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name || 'Admin'} userEmail={user?.email || 'aptivo.education@gmail.com'} />

                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8">
                    <div className="max-w-5xl mx-auto">
                        <div className="mb-10">
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">User Testimonials</h1>
                            <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium">Review student feedback and select features for the home page.</p>
                        </div>

                        {loading ? (
                            <div className="py-20 text-center">
                                <RefreshCw className="w-6 h-6 text-teal-600 animate-spin mx-auto" />
                            </div>
                        ) : (
                            <div className="grid gap-4">
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
                                                onClick={() => togglePublish(f.id, f.is_published)}
                                                className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm ${f.is_published
                                                    ? 'bg-emerald-600 text-white shadow-emerald-100 active:bg-slate-900'
                                                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 active:bg-slate-200'
                                                    }`}
                                            >
                                                {f.is_published && <Check className="w-3.5 h-3.5" />}
                                                {f.is_published ? 'Featured' : 'Feature'}
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
                </main>
            </div>
        </div>
    );
}
