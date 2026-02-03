'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import {
    Star, RefreshCw, Check
} from 'lucide-react';

export default function AdminFeedbacksPage() {
    const [feedbacks, setFeedbacks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

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
        <div className="min-h-screen bg-white font-sans">
            <Sidebar userRole="super_admin" />
            <div className="flex-1 flex flex-col lg:ml-64 transition-all duration-300">
                <Header userName={user?.full_name || 'Admin'} userEmail={user?.email || 'aptivo.education@gmail.com'} />

                <main className="p-4 lg:p-8 pt-20 lg:pt-24">
                    <div className="max-w-5xl mx-auto">
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold text-slate-900">User Testimonials</h1>
                            <p className="text-slate-500 text-sm">Review student feedback and select features for the home page.</p>
                        </div>

                        {loading ? (
                            <div className="py-20 text-center">
                                <RefreshCw className="w-6 h-6 text-teal-600 animate-spin mx-auto" />
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {feedbacks.map((f) => (
                                    <div key={f.id} className="bg-white border border-gray-100 rounded-xl p-6 hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between gap-6">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="flex gap-0.5">
                                                        {[1, 2, 3, 4, 5].map((s) => (
                                                            <Star
                                                                key={s}
                                                                className={`w-3.5 h-3.5 ${s <= f.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-900">{f.user?.full_name || 'Anonymous Student'}</span>
                                                    <span className="text-xs text-slate-400 italic"> - {f.user?.email || 'No email provided'}</span>
                                                </div>

                                                <p className="text-slate-600 text-sm mb-4 leading-relaxed">"{f.feedback_text}"</p>

                                                <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                                    {new Date(f.created_at).toLocaleDateString()} • {f.user?.role?.replace('_', ' ') || 'Student'}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => togglePublish(f.id, f.is_published)}
                                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${f.is_published
                                                    ? 'bg-teal-600 text-white'
                                                    : 'bg-gray-100 text-slate-500 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {f.is_published && <Check className="w-3 h-3" />}
                                                {f.is_published ? 'On Home Page' : 'Feature on Home'}
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
