'use client';

import React, { useEffect, useState } from 'react';
import {
    Users, BookOpen, Layers, UploadCloud, Edit3,
    Network, TrendingUp, MoreHorizontal, Shield
} from 'lucide-react';
import { useUI } from '@/lib/context/UIContext';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import {
    AdminDashboardService,
    AdminStats,
    RecentActivity
} from '@/lib/services/adminDashboardService';

export default function AdminDashboard() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<AdminStats>({
        totalQuestions: 0,
        activeStudents: 0,
        subjects: 0,
        topics: 0,
        changePercentages: {
            questions: '0%',
            students: '0%',
            subjects: '0%',
            topics: '0'
        }
    });
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const { isSidebarCollapsed } = useUI();

    useEffect(() => {
        const loadDashboard = async () => {
            const currentUser = AuthService.getCurrentUser();
            // Bypass for development if no user but localStorage set
            const storedUser = typeof window !== 'undefined' ? localStorage.getItem('aptivo_user') : null;

            let activeUser = currentUser;

            if (currentUser) {
                activeUser = currentUser;
            } else if (storedUser) {
                activeUser = JSON.parse(storedUser);
            } else {
                window.location.href = '/login';
                return;
            }

            setUser(activeUser);
            setLoading(false);

            try {
                // If institution admin, pass institution ID (logic to get institution ID would be needed here)
                // For now, assume super admin or handle institution specifically if we had the ID context
                // const institutionDetails = await AdminDashboardService.getInstitutionDetails(activeUser.id);
                // const institutionId = institutionDetails.institution?.id;

                const [statsRes, activityRes] = await Promise.all([
                    AdminDashboardService.getAdminStats(), // Pass institutionId here if available
                    AdminDashboardService.getRecentActivity(5)
                ]);

                if (statsRes.stats) setStats(statsRes.stats);
                if (activityRes.activities) setRecentActivity(activityRes.activities);

            } catch (error) {
                console.error("Failed to load admin dashboard data", error);
            } finally {
                setDataLoading(false);
            }
        };

        loadDashboard();
    }, []);

    if (loading) return null;

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <Sidebar userRole="super_admin" />
            <Header userName={user?.full_name || 'Admin User'} userEmail={user?.email} userAvatar={user?.avatar_url} />

            <main className={`flex-1 transition-all duration-300 pt-28 lg:pt-24 pb-12 px-4 sm:px-8 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
                    <p className="text-slate-500">Welcome back! Here's what's happening with your content.</p>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[
                        {
                            label: 'Total Questions',
                            value: stats.totalQuestions.toLocaleString(),
                            change: stats.changePercentages.questions,
                            icon: BookOpen,
                            color: 'bg-blue-100 text-blue-600'
                        },
                        {
                            label: 'Active Students',
                            value: stats.activeStudents.toLocaleString(),
                            change: stats.changePercentages.students,
                            icon: Users,
                            color: 'bg-green-100 text-green-600'
                        },
                        {
                            label: 'Subjects',
                            value: stats.subjects.toString(),
                            change: stats.changePercentages.subjects,
                            icon: Layers,
                            color: 'bg-purple-100 text-purple-600'
                        },
                        {
                            label: 'Topics',
                            value: stats.topics.toString(),
                            change: stats.changePercentages.topics,
                            icon: Network,
                            color: 'bg-orange-100 text-orange-600'
                        }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${stat.change.startsWith('+') ? 'bg-green-50 text-green-600' :
                                    stat.change === '0%' ? 'bg-gray-50 text-gray-500' : 'bg-red-50 text-red-600'
                                    }`}>
                                    {stat.change}
                                </span>
                            </div>
                            <h3 className="text-3xl font-bold text-slate-800 mb-1">{dataLoading ? '...' : stat.value}</h3>
                            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Main Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Upload MCQs */}
                    <a href="/admin/excel-uploader" className="group relative overflow-hidden bg-blue-600 rounded-2xl p-8 text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all hover:-translate-y-1 block">
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-6 group-hover:bg-white/30 transition-colors">
                                <UploadCloud className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Upload MCQs</h3>
                            <p className="text-blue-100 text-sm leading-relaxed">
                                Import questions from Excel with validation
                            </p>
                        </div>
                        <UploadCloud className="absolute -right-8 -bottom-8 w-48 h-48 text-white opacity-10 transform rotate-12 group-hover:scale-110 transition-transform" />
                    </a>

                    {/* Edit Content */}
                    <a href="/admin/content-editor" className="group relative overflow-hidden bg-purple-600 rounded-2xl p-8 text-white shadow-lg shadow-purple-600/20 hover:shadow-purple-600/30 transition-all hover:-translate-y-1 block">
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-6 group-hover:bg-white/30 transition-colors">
                                <Edit3 className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Edit Content</h3>
                            <p className="text-purple-100 text-sm leading-relaxed">
                                Create and edit Markdown educational content
                            </p>
                        </div>
                        <Edit3 className="absolute -right-8 -bottom-8 w-48 h-48 text-white opacity-10 transform rotate-12 group-hover:scale-110 transition-transform" />
                    </a>

                    {/* Manage Hierarchy */}
                    <a href="/admin/hierarchy-manager" className="group relative overflow-hidden bg-green-500 rounded-2xl p-8 text-white shadow-lg shadow-green-500/20 hover:shadow-green-500/30 transition-all hover:-translate-y-1 block">
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-6 group-hover:bg-white/30 transition-colors">
                                <Network className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Manage Hierarchy</h3>
                            <p className="text-green-50 text-sm leading-relaxed">
                                Organize subjects, topics, and subtopics
                            </p>
                        </div>
                        <Network className="absolute -right-8 -bottom-8 w-48 h-48 text-white opacity-10 transform rotate-12 group-hover:scale-110 transition-transform" />
                    </a>
                </div>

                {/* Secondary Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Universities */}
                    <a href="/admin/universities" className="group relative overflow-hidden bg-rose-500 rounded-2xl p-8 text-white shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 transition-all hover:-translate-y-1 block">
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-6 group-hover:bg-white/30 transition-colors">
                                <BookOpen className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Universities</h3>
                            <p className="text-rose-100 text-sm leading-relaxed">
                                Manage university profiles and domains
                            </p>
                        </div>
                        <BookOpen className="absolute -right-8 -bottom-8 w-48 h-48 text-white opacity-10 transform rotate-12 group-hover:scale-110 transition-transform" />
                    </a>

                    {/* Institutions */}
                    <a href="/admin/institutions" className="group relative overflow-hidden bg-amber-500 rounded-2xl p-8 text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all hover:-translate-y-1 block">
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-6 group-hover:bg-white/30 transition-colors">
                                <Users className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Institutions</h3>
                            <p className="text-amber-100 text-sm leading-relaxed">
                                Manage colleges and school partners
                            </p>
                        </div>
                        <Users className="absolute -right-8 -bottom-8 w-48 h-48 text-white opacity-10 transform rotate-12 group-hover:scale-110 transition-transform" />
                    </a>

                    {/* User Management */}
                    <a href="/admin/users" className="group relative overflow-hidden bg-teal-600 rounded-2xl p-8 text-white shadow-lg shadow-teal-600/20 hover:shadow-teal-600/30 transition-all hover:-translate-y-1 block">
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-6 group-hover:bg-white/30 transition-colors">
                                <Shield className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">User Access</h3>
                            <p className="text-teal-100 text-sm leading-relaxed">
                                Manage admin and student accounts
                            </p>
                        </div>
                        <Shield className="absolute -right-8 -bottom-8 w-48 h-48 text-white opacity-10 transform rotate-12 group-hover:scale-110 transition-transform" />
                    </a>
                </div>

                {/* Bottom Section - Activity or Trends */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-800">Upload Trends</h3>
                            <button className="text-slate-400 hover:text-slate-600">
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="h-48 flex items-center justify-center text-slate-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <div className="text-center">
                                <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <span className="text-sm">Activity chart visualization would go here</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-800">Recent Activity</h3>
                            <button className="text-teal-600 text-sm font-bold hover:underline">View All</button>
                        </div>

                        {dataLoading ? (
                            <div className="text-center py-8 text-slate-400">Loading activity...</div>
                        ) : recentActivity.length > 0 ? (
                            <div className="space-y-4">
                                {recentActivity.map((item, i) => {
                                    // Map icon string to component if needed, or use defaults
                                    const IconComponent =
                                        item.icon === 'layers' ? Layers :
                                            item.icon === 'upload' ? UploadCloud :
                                                item.icon === 'edit' ? Edit3 :
                                                    item.icon === 'user-plus' ? Users : Edit3;

                                    return (
                                        <div key={i} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.color}`}>
                                                <IconComponent className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-sm font-bold text-slate-800">{item.action}</h4>
                                                <p className="text-xs text-slate-500">{item.subject}</p>
                                            </div>
                                            <span className="text-xs text-slate-400 font-medium">{item.time}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <p className="text-sm">No recent activity found</p>
                            </div>
                        )}
                    </div>
                </div>
            </main >
        </div >
    );
}
