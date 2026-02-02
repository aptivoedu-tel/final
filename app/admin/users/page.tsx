'use client';

import React, { useEffect, useState } from 'react';
import { Users, Search, MoreVertical, Shield, UserCheck, UserX, Mail } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { supabase } from '@/lib/supabase/client';

export default function UserManagementPage() {
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState<'all' | 'student' | 'admin'>('all');

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
        <div className="min-h-screen bg-background">
            <Sidebar userRole={currentUser?.role || 'institution_admin'} />
            <Header
                userName={currentUser?.full_name || 'Admin'}
                userEmail={currentUser?.email || ''}
            />

            <main className="ml-64 mt-16 p-8">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-8 animate-fade-in">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">User Management</h1>
                        <p className="text-lg text-gray-600">Manage student access and administrative accounts</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="btn btn-primary">
                            <Users className="w-4 h-4" />
                            Invite User
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="glass-surface p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between animate-slide-in">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input pl-12"
                        />
                    </div>

                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setFilterRole('all')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filterRole === 'all' ? 'bg-white shadow text-primary' : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            All Users
                        </button>
                        <button
                            onClick={() => setFilterRole('student')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filterRole === 'student' ? 'bg-white shadow text-primary' : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Students
                        </button>
                        <button
                            onClick={() => setFilterRole('admin')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filterRole === 'admin' ? 'bg-white shadow text-primary' : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Admins
                        </button>
                    </div>
                </div>

                {/* Users Table */}
                <div className="glass-surface overflow-hidden animate-slide-in" style={{ animationDelay: '0.1s' }}>
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No users found matching your filters
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0">
                                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                                                        {user.full_name?.charAt(0) || user.email?.charAt(0)}
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{user.full_name || 'Unknown'}</div>
                                                    <div className="text-sm text-gray-500 flex items-center gap-1">
                                                        <Mail className="w-3 h-3" />
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${['super_admin', 'institution_admin'].includes(user.role)
                                                    ? 'bg-purple-100 text-purple-800'
                                                    : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                {['super_admin', 'institution_admin'].includes(user.role) ? (
                                                    <Shield className="w-3 h-3 mr-1" />
                                                ) : (
                                                    <Users className="w-3 h-3 mr-1" />
                                                )}
                                                {user.role === 'super_admin' ? 'Super Admin' :
                                                    user.role === 'institution_admin' ? 'Admin' : 'Student'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.status === 'active'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                }`}>
                                                {user.status === 'active' ? 'Active' : 'Suspended'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                                                <button className="p-1 hover:bg-gray-200 rounded text-gray-600" title="Edit">
                                                    <UserCheck className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleStatusToggle(user.id, user.status)}
                                                    className="p-1 hover:bg-red-100 rounded text-red-600"
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
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                        <span className="text-sm text-gray-500">Showing {filteredUsers.length} users</span>
                        <div className="flex gap-2">
                            <button disabled className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-400">Previous</button>
                            <button disabled className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-400">Next</button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
