'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useUI } from '@/lib/context/UIContext';
import { Plus, Search, Building2, Trash2, Edit2, X, CheckCircle, Globe, Mail, Phone, MapPin, AlertCircle, Ban, UserCheck, ShieldAlert } from 'lucide-react';

type Institution = {
    id: number;
    name: string;
    institution_type: string;
    domain: string;
    contact_email: string;
    contact_phone: string;
    address: string;
    is_active: boolean;
    status: 'pending' | 'approved' | 'rejected' | 'blocked';
    admin_name?: string;
    admin_email?: string;
    created_at: string;
};

export default function InstitutionsPage() {
    const [loading, setLoading] = useState(true);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'approved' | 'pending' | 'rejected' | 'blocked'>('approved');

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        type: 'school',
        domain: '',
        email: '',
        phone: '',
        address: ''
    });

    useEffect(() => {
        fetchInstitutions();
    }, []);

    const fetchInstitutions = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('institutions')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) setInstitutions(data);
        if (error) console.error(error);
        setLoading(false);
    };

    const handleUpdateStatus = async (id: number, newStatus: string) => {
        const confirmMsg = newStatus === 'approved' ? 'Approve this institution?' :
            newStatus === 'rejected' ? 'Reject this application?' :
                newStatus === 'blocked' ? 'Block this institution?' : 'Unblock this institution?';

        if (!confirm(confirmMsg)) return;

        try {
            const { error } = await supabase
                .from('institutions')
                .update({ status: newStatus, is_active: newStatus === 'approved' })
                .eq('id', id);

            if (error) throw error;

            fetchInstitutions();
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to permanently delete this institution? This action cannot be undone and may affect associated users.')) return;

        try {
            const { error } = await supabase
                .from('institutions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchInstitutions();
        } catch (error: any) {
            alert(`Error deleting institution: ${error.message}`);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from('institutions').insert([{
                name: formData.name,
                institution_type: formData.type,
                domain: formData.domain,
                contact_email: formData.email,
                contact_phone: formData.phone,
                address: formData.address,
                is_active: true,
                status: 'approved'
            }]);

            if (error) throw error;

            setIsModalOpen(false);
            setFormData({ name: '', type: 'school', domain: '', email: '', phone: '', address: '' });
            fetchInstitutions();
        } catch (error: any) {
            alert(`Error adding institution: ${error.message}`);
        }
    };

    const filteredInstitutions = institutions.filter(inst => {
        const matchesSearch = inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inst.domain.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTab = inst.status === activeTab;
        return matchesSearch && matchesTab;
    });

    const pendingCount = institutions.filter(i => i.status === 'pending').length;
    const { isSidebarCollapsed } = useUI();

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="super_admin" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName="Admin" userEmail="admin@system.com" />

                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Institution Manager</h1>
                                <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium">Review registrations and manage ecosystem partners.</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-slate-900 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                            >
                                <Plus className="w-5 h-5" />
                                <span className="text-sm">Create New</span>
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 mb-8 p-1.5 bg-gray-200/50 rounded-2xl w-full sm:w-fit overflow-x-auto no-scrollbar">
                            {(['approved', 'pending', 'rejected', 'blocked'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    {tab === 'pending' && pendingCount > 0 && (
                                        <span className="bg-amber-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                                            {pendingCount}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 mb-8 flex items-center gap-4 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
                            <Search className="w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder={`Search in ${activeTab} list...`}
                                className="flex-1 outline-none text-slate-700 font-medium placeholder:text-slate-400"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Loading State */}
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="font-medium">Refreshing directory...</p>
                            </div>
                        ) : filteredInstitutions.length === 0 ? (
                            <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                                <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-400 font-medium italic">No institutions match your current filter.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                                {filteredInstitutions.map(inst => (
                                    <div key={inst.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative">
                                        {/* Status Ribbon */}
                                        <div className={`absolute top-0 right-0 px-4 py-1 text-[10px] font-bold rounded-bl-xl uppercase tracking-widest ${inst.status === 'approved' ? 'bg-green-100 text-green-600' :
                                            inst.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                                                inst.status === 'blocked' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {inst.status}
                                        </div>

                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                <Building2 className="w-7 h-7" />
                                            </div>
                                            <button
                                                onClick={() => handleDelete(inst.id)}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                title="Delete Institution"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <h3 className="text-xl font-bold text-slate-800 mb-1 truncate pr-16">{inst.name}</h3>
                                        <div className="flex gap-2 items-center mb-6">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter border-b border-slate-100">{inst.institution_type}</span>
                                            <span className="text-slate-200">•</span>
                                            <span className="text-[10px] text-slate-400 font-medium">{new Date(inst.created_at).toLocaleDateString()}</span>
                                        </div>

                                        <div className="space-y-3 mb-8">
                                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center"><Globe className="w-4 h-4" /></div>
                                                <span className="truncate">{inst.domain}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center"><Mail className="w-4 h-4" /></div>
                                                <span className="truncate">{inst.contact_email}</span>
                                            </div>
                                            {inst.admin_name && (
                                                <div className="mt-4 pt-4 border-t border-gray-50">
                                                    <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase">Lead Admin Account</p>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                            {inst.admin_name.charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-slate-700 truncate">{inst.admin_name}</p>
                                                            <p className="text-[11px] text-slate-400 truncate">{inst.admin_email}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Bar */}
                                        <div className="flex gap-2">
                                            {inst.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => handleUpdateStatus(inst.id, 'approved')}
                                                        className="flex-1 py-2.5 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5"
                                                    >
                                                        <UserCheck className="w-3.5 h-3.5" /> Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(inst.id, 'rejected')}
                                                        className="flex-1 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-1.5"
                                                    >
                                                        <X className="w-3.5 h-3.5" /> Reject
                                                    </button>
                                                </>
                                            )}

                                            {(inst.status === 'approved' || inst.status === 'blocked') && (
                                                <button
                                                    onClick={() => handleUpdateStatus(inst.id, inst.status === 'approved' ? 'blocked' : 'approved')}
                                                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${inst.status === 'approved'
                                                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                                                        }`}
                                                >
                                                    {inst.status === 'approved' ? (
                                                        <><Ban className="w-3.5 h-3.5" /> Block Institution</>
                                                    ) : (
                                                        <><ShieldAlert className="w-3.5 h-3.5" /> Lift Suspension</>
                                                    )}
                                                </button>
                                            )}

                                            {inst.status === 'rejected' && (
                                                <button
                                                    onClick={() => handleUpdateStatus(inst.id, 'pending')}
                                                    className="flex-1 py-2.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-xl hover:bg-indigo-100 flex items-center justify-center gap-1.5"
                                                >
                                                    <AlertCircle className="w-3.5 h-3.5" /> Re-Review
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>

                {/* Add Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-800">Direct Registration</h3>
                                    <p className="text-sm text-slate-500 mt-1">Add a partner with immediate approval bypass.</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 text-slate-400 hover:text-slate-600 shadow-gray-200">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-4 sm:space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-bold text-slate-700 mb-2 tracking-tight">Institution Name</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-sm sm:text-base"
                                            placeholder="Official name..."
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Primary Type</label>
                                        <select
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-slate-600"
                                            value={formData.type}
                                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        >
                                            <option value="school">Secondary School</option>
                                            <option value="university">University Faculty</option>
                                            <option value="college">Technical College</option>
                                            <option value="coaching">Professional Coaching</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Web Domain</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                            placeholder="example.com"
                                            value={formData.domain}
                                            onChange={e => setFormData({ ...formData, domain: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Contact Email</label>
                                        <input
                                            required
                                            type="email"
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                            placeholder="admin@institution.edu"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Support Phone</label>
                                        <input
                                            type="text"
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                            placeholder="+44..."
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 hover:scale-[1.01]"
                                >
                                    Activate & Add to Directory
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
