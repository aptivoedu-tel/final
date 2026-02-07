'use client';

import React, { useEffect, useState } from 'react';
import { Users, Search, MoreVertical, Shield, UserCheck, UserX, Mail, Trash2, Building2, ExternalLink, X, Save } from 'lucide-react';
import Link from 'next/link';
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

    // Edit User State
    const [editingUser, setEditingUser] = useState<any>(null);
    const [editFormData, setEditFormData] = useState({ full_name: '', role: 'student' });

    const openEditModal = (user: any) => {
        setEditingUser(user);
        setEditFormData({
            full_name: user.full_name || '',
            role: user.role || 'student'
        });
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;

        try {
            const { error } = await supabase
                .from('users')
                .update({
                    full_name: editFormData.full_name,
                    role: editFormData.role
                })
                .eq('id', editingUser.id);

            if (error) throw error;

            loadUsers();
            setEditingUser(null);
        } catch (error: any) {
            alert(`Error updating user: ${error.message}`);
        }
    };

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
            const { data, error } = await supabase
                .from('users')
                .select(`
                    *,
                    institution_admins(
                        institutions(id, name)
                    ),
                    student_university_enrollments(
                        institutions(id, name)
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Post-process to flatten institution info
            const usersWithInst = (data || []).map(u => {
                const adminInst = u.institution_admins?.[0]?.institutions;
                const studentInst = u.student_university_enrollments?.[0]?.institutions;
                return {
                    ...u,
                    institution: adminInst || studentInst || null
                };
            });

            setUsers(usersWithInst);
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
        try {
            const { error } = await supabase
                .from('users')
                .update({ status: newStatus })
                .eq('id', userId);

            if (error) throw error;
            loadUsers();
        } catch (error: any) {
            alert(`Error updating status: ${error.message}`);
        }
    };

    const [linkingUser, setLinkingUser] = useState<any | null>(null);
    const [institutions, setInstitutions] = useState<any[]>([]);
    const [selectedInstId, setSelectedInstId] = useState<string>('');

    const fetchInstitutions = async () => {
        const { data } = await supabase.from('institutions').select('id, name');
        if (data) setInstitutions(data);
    };

    const handleLinkToInstitution = async () => {
        if (!linkingUser || !selectedInstId) return;
        try {
            // 1. Update institution_admins for admins or just the users table for students/admins
            if (linkingUser.role === 'institution_admin') {
                await supabase.from('institution_admins').upsert({
                    user_id: linkingUser.id,
                    institution_id: parseInt(selectedInstId)
                });
            }

            // 2. Primary link in users table
            const { error } = await supabase
                .from('users')
                .update({ institution_id: parseInt(selectedInstId) })
                .eq('id', linkingUser.id);

            if (error) throw error;

            alert('User successfully linked to institution');
            setLinkingUser(null);
            setSelectedInstId('');
            loadUsers();
        } catch (error: any) {
            alert(`Error linking user: ${error.message}`);
        }
    };

    const handleDeleteUser = async (userId: string, fullName: string) => {
        if (!confirm(`Are you sure you want to PERMANENTLY delete user ${fullName}? This will remove them from both the database and Supabase Auth.`)) {
            return;
        }

        try {
            const response = await fetch('/api/delete-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to delete user');

            alert('User deleted successfully');
            loadUsers();
        } catch (error: any) {
            alert(`Error deleting user: ${error.message}`);
        }
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
                    userName={currentUser?.full_name}
                    userEmail={currentUser?.email}
                />

                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8">
                    {/* Page Header */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">User Management</h1>
                            <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium">Manage student access and administrative accounts</p>
                        </div>
                        <button className="flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-slate-900 transition-all shadow-lg shadow-teal-100 active:scale-95">
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
                                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-sm font-medium"
                            />
                        </div>

                        <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-fit overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => setFilterRole('all')}
                                className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterRole === 'all' ? 'bg-white shadow-sm text-teal-600' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                All Users
                            </button>
                            <button
                                onClick={() => setFilterRole('student')}
                                className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterRole === 'student' ? 'bg-white shadow-sm text-teal-600' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Students
                            </button>
                            <button
                                onClick={() => setFilterRole('admin')}
                                className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterRole === 'admin' ? 'bg-white shadow-sm text-teal-600' : 'text-slate-500 hover:text-slate-700'
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
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Institution</th>
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
                                                        <div className="h-10 w-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-teal-100">
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
                                                {user.institution ? (
                                                    <Link
                                                        href={`/admin/institutions?search=${encodeURIComponent(user.institution.name)}`}
                                                        className="flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-800 transition-colors"
                                                    >
                                                        <Building2 className="w-3 h-3" />
                                                        {user.institution.name}
                                                        <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </Link>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-medium text-slate-400 italic">No link</span>
                                                        {user.role === 'institution_admin' && (
                                                            <button
                                                                onClick={() => {
                                                                    setLinkingUser(user);
                                                                    fetchInstitutions();
                                                                }}
                                                                className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest rounded border border-amber-100 hover:bg-amber-100 transition-colors"
                                                            >
                                                                Link
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${['super_admin', 'institution_admin'].includes(user.role)
                                                    ? 'bg-purple-50 text-purple-600 border border-purple-100'
                                                    : 'bg-teal-50 text-teal-600 border border-teal-100'
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
                                                    : user.status === 'suspended'
                                                        ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                                                    }`}>
                                                    {user.status === 'active' ? 'Active' : user.status === 'suspended' ? 'Suspended' : user.status || 'Pending'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-500">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditModal(user)}
                                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-teal-600 transition-all active:scale-90"
                                                        title="Edit"
                                                    >
                                                        <UserCheck className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusToggle(user.id, user.status)}
                                                        className={`p-2 rounded-lg transition-all active:scale-90 ${user.status === 'suspended' ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-rose-50 hover:text-rose-600'}`}
                                                        title={user.status === 'suspended' ? "Activate" : "Suspend"}
                                                    >
                                                        {user.status === 'suspended' ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id, user.full_name || user.email)}
                                                        className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-all active:scale-90"
                                                        title="Delete Permanently"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
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

            {/* LINK MODAL */}
            {linkingUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-xl font-bold text-slate-900">Link User to Institution</h3>
                            <p className="text-xs text-slate-500 mt-1 font-medium">Link {linkingUser.full_name || linkingUser.email}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Select Institution</label>
                                <select
                                    value={selectedInstId}
                                    onChange={(e) => setSelectedInstId(e.target.value)}
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-700"
                                >
                                    <option value="">Search or select...</option>
                                    {institutions.map(inst => (
                                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setLinkingUser(null)}
                                    className="flex-1 py-4 bg-gray-100 text-slate-700 font-bold rounded-2xl hover:bg-gray-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleLinkToInstitution}
                                    disabled={!selectedInstId}
                                    className="flex-1 py-4 bg-teal-600 text-white font-bold rounded-2xl hover:bg-teal-700 transition-all shadow-lg shadow-teal-100 disabled:opacity-50"
                                >
                                    Confirm Link
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT USER MODAL */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Edit User Details</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{editingUser.email}</p>
                            </div>
                            <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                                <input
                                    type="text"
                                    value={editFormData.full_name}
                                    onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Role</label>
                                <select
                                    value={editFormData.role}
                                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all outline-none appearance-none"
                                >
                                    <option value="student">Student</option>
                                    <option value="institution_admin">Institution Admin</option>
                                    <option value="super_admin">Super Admin</option>
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={() => setEditingUser(null)}
                                    className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateUser}
                                    className="flex-1 py-3.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 shadow-lg shadow-teal-200 transition-all flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
