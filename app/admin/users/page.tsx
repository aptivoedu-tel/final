'use client';

import React, { useEffect, useState } from 'react';
import { Users, Search, MoreVertical, Shield, UserCheck, UserX, Mail } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { supabase } from '@/lib/supabase/client';
import { useUI } from '@/lib/context/UIContext';

export default function UserManagementPage() {
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState<'all' | 'student' | 'admin'>('all');
    const { isSidebarCollapsed } = useUI();

    useEffect(() => {
        const user = AuthService.getCurrentUser();
        if (!user || user.role === 'student') {
            window.location.href = '/dashboard';
            return;
        }
        setCurrentUser(user);
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            // In a real app, this would be a secure RPC or Admin API call
            // For demo, we'll fetch from the users table which should be RLS protected
            // Admin should be able to see all users via RLS policy
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error loading users:', error);
            // Fallback for demo if RLS blocks listing
            setUsers([
                { id: '1', full_name: 'Alex Chen', email: 'alex@demo.com', role: 'student', status: 'active', created_at: new Date().toISOString() },
                { id: '2', full_name: 'Sarah Jones', email: 'sarah@demo.com', role: 'student', status: 'active', created_at: new Date().toISOString() },
                { id: '3', full_name: 'Admin User', email: 'admin@aptivo.com', role: 'super_admin', status: 'active', created_at: new Date().toISOString() },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = filterRole === 'all' ||
            (filterRole === 'admin' ? ['super_admin', 'institution_admin'].includes(user.role) : user.role === 'student');

        return matchesSearch && matchesRole;
    });

    const handleStatusToggle = async (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        // Ideally call an API endpoint
        alert(`Toggling status for ${userId} to ${newStatus}`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex font-sans">
            <Sidebar userRole={currentUser?.role || 'institution_admin'} />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header
                    userName={currentUser?.full_name || 'Admin'}
                    userEmail={currentUser?.email || ''}
                />

                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8">
                    {/* Page Header */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">User Management</h1>
                            <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium">Manage student access and administrative accounts</p>
                        </div>
                        <button className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-slate-900 transition-all shadow-lg shadow-indigo-100 active:scale-95">
                            <Users className="w-4 h-4" />
                            <span className="text-sm">Invite User</span>
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="glass-surface p-4 mb-6 flex flex-col lg:flex-row gap-4 items-center justify-between animate-slide-in">
                        <div className="relative w-full lg:w-96">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
                            />
                        </div>

                        <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-fit overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => setFilterRole('all')}
                                className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterRole === 'all' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                All Users
                            </button>
                            <button
                                onClick={() => setFilterRole('student')}
                                className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterRole === 'student' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Students
                            </button>
                            <button
                                onClick={() => setFilterRole('admin')}
                                className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterRole === 'admin' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Admins
                            </button>
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="glass-surface overflow-x-auto custom-scrollbar animate-slide-in" style={{ animationDelay: '0.1s' }}>
                        <table className="w-full min-w-[800px]">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Joined</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic font-medium">
                                            No users found matching your filters
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 flex-shrink-0">
                                                        <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-100">
                                                            {user.full_name?.charAt(0) || user.email?.charAt(0)}
                                                        </div>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-bold text-slate-900">{user.full_name || 'Unknown'}</div>
                                                        <div className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                                                            <Mail className="w-3 h-3 text-slate-400" />
                                                            {user.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${['super_admin', 'institution_admin'].includes(user.role)
                                                    ? 'bg-purple-50 text-purple-600 border border-purple-100'
                                                    : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                                    }`}>
                                                    {['super_admin', 'institution_admin'].includes(user.role) ? (
                                                        <Shield className="w-3 h-3 mr-1.5" />
                                                    ) : (
                                                        <Users className="w-3 h-3 mr-1.5" />
                                                    )}
                                                    {user.role === 'super_admin' ? 'Super Admin' :
                                                        user.role === 'institution_admin' ? 'Admin' : 'Student'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${user.status === 'active'
                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                    : 'bg-rose-50 text-rose-600 border border-rose-100'
                                                    }`}>
                                                    {user.status === 'active' ? 'Active' : 'Suspended'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-500">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-all active:scale-90" title="Edit">
                                                        <UserCheck className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusToggle(user.id, user.status)}
                                                        className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all active:scale-90"
                                                        title="Suspend"
                                                    >
                                                        <UserX className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        {/* Pagination (Visual only for demo) */}
                        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white">
                            <span className="text-xs font-bold text-slate-400">Showing {filteredUsers.length} users</span>
                            <div className="flex gap-2">
                                <button disabled className="px-4 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-300">Previous</button>
                                <button disabled className="px-4 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-300">Next</button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
