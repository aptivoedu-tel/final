'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Building2, BarChart3, ArrowRight, RefreshCw, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { AnalyticsService } from '@/lib/services/analyticsService';
import { useLoading } from '@/lib/context/LoadingContext';

export default function InstitutionAdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const [instId, setInstId] = useState<number | null>(null);

    const loadStats = async () => {
        setGlobalLoading(true, 'Connecting to Live Servers...');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('users')
                .select('institution_id')
                .eq('id', user.id)
                .single();

            let currentInstId = profile?.institution_id;

            if (!currentInstId) {
                // FALLBACK: Try checking institution_admins table
                const { data: adminLink } = await supabase
                    .from('institution_admins')
                    .select('institution_id')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (adminLink?.institution_id) {
                    console.log("Rescued institution link from institution_admins");
                    currentInstId = adminLink.institution_id;
                    // Proactively update the users table for next time
                    await supabase.from('users').update({ institution_id: currentInstId }).eq('id', user.id);
                }
            }

            setInstId(currentInstId);

            if (currentInstId) {
                const data = await AnalyticsService.getInstitutionDetailedAnalytics(currentInstId);
                setStats(data.overall);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setGlobalLoading(false);
        }
    };

    useEffect(() => {
        loadStats();
    }, []);

    const cards = [
        {
            title: 'Manage Students',
            description: 'Create accounts, manage access, and view your directory.',
            icon: Users,
            href: '/institution-admin/students',
            color: 'text-blue-600',
            bg: 'bg-blue-50'
        },
        {
            title: 'University Access',
            description: 'Lock or unlock universities for your institution.',
            icon: Building2,
            href: '/institution-admin/universities',
            color: 'text-purple-600',
            bg: 'bg-purple-50'
        },
        {
            title: 'Performance Analytics',
            description: 'Monitor student progress and identified weakness areas.',
            icon: BarChart3,
            href: '/institution-admin/analytics',
            color: 'text-emerald-600',
            bg: 'bg-emerald-50'
        },
        {
            title: 'Content Library',
            description: 'Examine the educational curriculum (Read-Only).',
            icon: FileText,
            href: '/institution-admin/content-editor',
            color: 'text-slate-100',
            bg: 'bg-slate-900'
        }
    ];

    return (
        <div className="max-w-5xl mx-auto py-8">
            <h1 className="text-3xl font-black text-slate-900 mb-2">Institution Dashboard</h1>
            <p className="text-slate-500 text-lg mb-10">Welcome back. Manage your institution's learning environment.</p>

            {/* DIAGNOSTIC BANNER */}
            {!loading && !instId && (
                <div className="mb-10 p-6 bg-amber-50 border-2 border-amber-200 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
                            <Building2 className="w-8 h-8 text-amber-600" />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-xl font-bold text-amber-900 mb-1">Institution Link Broken</h3>
                            <p className="text-amber-700 leading-relaxed font-medium">
                                Your account is not currently linked to any institution in the primary database.
                                This prevents you from managing students and university access.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                            <button
                                onClick={loadStats}
                                className="px-6 py-3 bg-white text-amber-700 font-bold rounded-xl border border-amber-200 hover:bg-amber-100 transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" /> Retry Sync
                            </button>
                            <Link
                                href="/profile"
                                className="px-6 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-all shadow-lg shadow-amber-200 flex items-center justify-center"
                            >
                                Check Profile
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cards.map((card) => (
                    <Link
                        key={card.title}
                        href={instId ? card.href : '#'}
                        onClick={(e) => {
                            if (!instId) {
                                e.preventDefault();
                                alert("You cannot access this tool because your institution link is missing. Please contact a Super Admin or use the 'Retry Sync' button above.");
                            }
                        }}
                        className={`group bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${!instId ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                    >
                        <div className={`w-14 h-14 ${card.bg} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                            <card.icon className={`w-7 h-7 ${card.color}`} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                            {card.title}
                        </h3>
                        <p className="text-slate-500 mb-6 leading-relaxed">
                            {card.description}
                        </p>
                        <div className="flex items-center text-sm font-bold text-indigo-600">
                            {instId ? (
                                <>Open Tool <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" /> </>
                            ) : (
                                "Link Required"
                            )}
                        </div>
                    </Link>
                ))}
            </div>

            {/* Quick Stats Section */}
            <div className="mt-12 bg-indigo-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                            Live Activity
                        </h2>
                        {loading ? (
                            <p className="text-indigo-200">Connecting to live servers...</p>
                        ) : (
                            <p className="text-indigo-200">
                                {stats?.totalStudents || 0} students enrolled across {stats?.totalUniversities || 0} universities.
                            </p>
                        )}
                    </div>
                    <Link href="/institution-admin/analytics" className="px-8 py-3 bg-white text-indigo-900 font-bold rounded-xl hover:bg-indigo-50 transition-all hover:scale-105 active:scale-95 shadow-lg">
                        View Analytics Report
                    </Link>
                </div>

                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-800 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-900 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-50"></div>
            </div>
        </div>
    );
}
