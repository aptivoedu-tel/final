'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Building2, BarChart3, ArrowRight, RefreshCw, FileText, Clock, Shield, CheckCircle, Mail } from 'lucide-react';
import { AnalyticsService } from '@/lib/services/analyticsService';
import { useLoading } from '@/lib/context/LoadingContext';
import { AuthService } from '@/lib/services/authService';
import { getTimeGreeting } from '@/lib/utils';

export default function InstitutionAdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const [instId, setInstId] = useState<number | null>(null);
    const [user, setUser] = useState<any>(null);
    const [userStatus, setUserStatus] = useState<string>('loading');

    const loadStats = async () => {
        setGlobalLoading(true, 'Connecting to Live Servers...');
        try {
            const currentUser = AuthService.getCurrentUser();
            setUser(currentUser);
            if (!currentUser) return;

            const { data: profile } = await fetch(`/api/mongo/profile?userId=${currentUser.id}`).then(r => r.json());

            // Track account approval status
            setUserStatus(profile?.status || 'pending');

            const currentInstId = profile?.institution_id;
            setInstId(currentInstId);

            if (currentInstId && profile?.status === 'active') {
                const data = await AnalyticsService.getInstitutionDetailedAnalytics(currentInstId);
                setStats(data.overall);
            }
        } catch (err) {
            console.error(err);
            setUserStatus('active'); // Default to showing dashboard on error
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
            color: 'text-emerald-600',
            bg: 'bg-emerald-50'
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

    // ── Pending Approval Screen ──────────────────────────────────────────────
    if (!loading && userStatus === 'pending') {
        return (
            <div className="max-w-2xl mx-auto py-16 px-4 text-center">
                {/* Pulsing clock icon */}
                <div className="relative inline-flex items-center justify-center mb-8">
                    <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="relative w-28 h-28 bg-amber-50 border-4 border-amber-100 rounded-full flex items-center justify-center shadow-2xl shadow-amber-100">
                        <Clock className="w-14 h-14 text-amber-500" />
                    </div>
                </div>

                <h1 className="text-3xl font-black text-slate-900 mb-3">Account Under Review</h1>
                <p className="text-slate-500 text-base leading-relaxed mb-10 max-w-md mx-auto">
                    Your institution account has been received and is currently pending approval from our Super Admin team.
                </p>

                {/* Step checklist */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 mb-8 text-left space-y-5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Approval Checklist</p>
                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">Email Verified</p>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">Your email address has been confirmed.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Clock className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">Super Admin Review — In Progress</p>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                                Our team is reviewing your institution. This typically takes a few business days.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 opacity-40">
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Shield className="w-5 h-5 text-teal-500" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">Account Activated</p>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                                You will be able to access your dashboard once approved.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={loadStats}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-all shadow-lg shadow-teal-100 active:scale-95"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Check Status Again
                    </button>
                    <a
                        href="mailto:support@aptivoedu.com"
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all active:scale-95"
                    >
                        <Mail className="w-4 h-4" />
                        Contact Support
                    </a>
                </div>
            </div>
        );
    }

    // ── Normal Dashboard ─────────────────────────────────────────────────────
    return (
        <div className="max-w-5xl mx-auto py-8">
            <h1 className="text-3xl font-black text-slate-900 mb-2">
                {getTimeGreeting()}, {user?.full_name?.split(' ')[0] || 'Admin'}
            </h1>
            <p className="text-slate-500 text-lg mb-10">Welcome back. Manage your institution's learning environment.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cards.map((card) => (
                    <Link
                        key={card.title}
                        href={card.href}
                        className="group bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                    >
                        <div className={`w-14 h-14 ${card.bg} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                            <card.icon className={`w-7 h-7 ${card.color}`} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-teal-600 transition-colors">
                            {card.title}
                        </h3>
                        <p className="text-slate-500 mb-6 leading-relaxed">
                            {card.description}
                        </p>
                        <div className="flex items-center text-sm font-bold text-teal-600">
                            Open Tool <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>
                ))}
            </div>

            {/* Quick Stats Section */}
            <div className="mt-12 bg-teal-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-teal-200">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">Live Activity</h2>
                        {loading ? (
                            <p className="text-teal-200">Connecting to live servers...</p>
                        ) : (
                            <p className="text-teal-200">
                                {stats?.totalStudents || 0} students enrolled across {stats?.totalUniversities || 0} universities.
                            </p>
                        )}
                    </div>
                    <Link
                        href="/institution-admin/analytics"
                        className="px-8 py-3 bg-white text-teal-900 font-bold rounded-xl hover:bg-teal-50 transition-all hover:scale-105 active:scale-95 shadow-lg"
                    >
                        View Analytics Report
                    </Link>
                </div>

                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-800 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-900 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-50"></div>
            </div>
        </div>
    );
}
