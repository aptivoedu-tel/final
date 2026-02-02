'use client';

import React from 'react';
import { supabase } from '@/lib/supabase/client';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { Plus, Search, MapPin, Globe, Building2, Trash2, Edit2, X, CheckCircle, Upload, Image as ImageIcon } from 'lucide-react';
import { AuthService } from '@/lib/services/authService';

type University = {
    id: number;
    name: string;
    domain: string;
    city: string;
    country: string;
    logo_url?: string;
    is_active: boolean;
};

export default function UniversitiesPage() {
    const [loading, setLoading] = React.useState(true);
    const [universities, setUniversities] = React.useState<University[]>([]);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [uploading, setUploading] = React.useState(false);
    const [logoFile, setLogoFile] = React.useState<File | null>(null);
    const [editingUniversity, setEditingUniversity] = React.useState<University | null>(null);

    // Form State
    const [formData, setFormData] = React.useState({
        name: '',
        domain: '',
        city: '',
        country: '',
        logo_url: ''
    });

    React.useEffect(() => {
        fetchUniversities();
    }, []);

    const fetchUniversities = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('universities')
            .select('*')
            .order('name');

        if (data) setUniversities(data);
        if (error) console.error(error);
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);
        try {
            let logo_url = formData.logo_url;

            if (logoFile) {
                const fileExt = logoFile.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `logos/${fileName}`;

                const { error: uploadError, data } = await supabase.storage
                    .from('university-logos')
                    .upload(filePath, logoFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('university-logos')
                    .getPublicUrl(filePath);

                logo_url = publicUrl;
            }

            if (editingUniversity) {
                const { error } = await supabase.from('universities').update({
                    name: formData.name,
                    domain: formData.domain,
                    city: formData.city,
                    country: formData.country,
                    logo_url: logo_url,
                }).eq('id', editingUniversity.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('universities').insert([{
                    name: formData.name,
                    domain: formData.domain,
                    city: formData.city,
                    country: formData.country,
                    logo_url: logo_url,
                    is_active: true
                }]);
                if (error) throw error;
            }



            setIsModalOpen(false);
            setEditingUniversity(null);
            setFormData({ name: '', domain: '', city: '', country: '', logo_url: '' });
            setLogoFile(null);
            fetchUniversities();
        } catch (error: any) {
            alert(`Error saving university: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure? This will delete all associated data.')) return;

        const { error } = await supabase.from('universities').delete().eq('id', id);
        if (error) {
            alert(error.message);
        } else {
            fetchUniversities();
        }
    };

    const filteredUnis = universities.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.city.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="super_admin" />
            <div className="flex-1 flex flex-col">
                <Header userName="Admin" userEmail="admin@system.com" />

                <main className="ml-64 mt-16 p-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900">Universities</h1>
                                <p className="text-slate-500 mt-1">Manage partner universities and institutions.</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                            >
                                <Plus className="w-5 h-5" />
                                Add University
                            </button>
                        </div>

                        {/* Search & Filter */}
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 mb-6 flex items-center gap-4">
                            <Search className="w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name or city..."
                                className="flex-1 outline-none text-slate-700"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {loading ? (
                                <div className="col-span-full py-12 text-center text-slate-400">Loading...</div>
                            ) : filteredUnis.length === 0 ? (
                                <div className="col-span-full py-12 text-center text-slate-400">No universities found.</div>
                            ) : (
                                filteredUnis.map(u => (
                                    <div key={u.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-indigo-50 overflow-hidden flex items-center justify-center text-indigo-600 border border-indigo-100">
                                                {u.logo_url ? (
                                                    <img src={u.logo_url} alt={u.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Building2 className="w-6 h-6" />
                                                )}
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setEditingUniversity(u);
                                                        setFormData({
                                                            name: u.name,
                                                            domain: u.domain,
                                                            city: u.city,
                                                            country: u.country,
                                                            logo_url: u.logo_url || ''
                                                        });
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(u.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-bold text-slate-800 mb-1">{u.name}</h3>
                                        <p className="text-sm font-medium text-slate-500 mb-4">{u.city}, {u.country}</p>

                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <Globe className="w-4 h-4" /> {u.domain}
                                            </div>
                                        </div>

                                        <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                                            <span className={`flex items-center gap-1.5 text-xs font-bold ${u.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                                                <CheckCircle className="w-3.5 h-3.5" /> {u.is_active ? 'ACTIVE' : 'INACTIVE'}
                                            </span>
                                            <span className="text-xs text-slate-400 font-medium tracking-wider">ID: #{u.id}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </main>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="text-xl font-bold text-slate-800">{editingUniversity ? 'Edit University' : 'Add New University'}</h3>
                                <button onClick={() => {
                                    setIsModalOpen(false);
                                    setEditingUniversity(null);
                                    setFormData({ name: '', domain: '', city: '', country: '', logo_url: '' });
                                    setLogoFile(null);
                                }} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSave} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">University Name</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g. Stanford University"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Domain</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="e.g. stanford.edu"
                                            value={formData.domain}
                                            onChange={e => setFormData({ ...formData, domain: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">City</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="e.g. Palo Alto"
                                            value={formData.city}
                                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Country</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g. USA"
                                        value={formData.country}
                                        onChange={e => setFormData({ ...formData, country: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">University Logo</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                                            {logoFile ? (
                                                <img src={URL.createObjectURL(logoFile)} className="w-full h-full object-cover" />
                                            ) : (
                                                <ImageIcon className="w-6 h-6 text-gray-300" />
                                            )}
                                        </div>
                                        <label className="flex-1">
                                            <div className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-indigo-100 rounded-xl cursor-pointer hover:bg-indigo-50/50 transition-colors">
                                                <Upload className="w-4 h-4 text-indigo-600" />
                                                <span className="text-sm font-bold text-indigo-600">
                                                    {logoFile ? logoFile.name : 'Upload Logo'}
                                                </span>
                                            </div>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                                            />
                                        </label>
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={uploading}
                                        className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {uploading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Processing...
                                            </>
                                        ) : (editingUniversity ? 'Update University' : 'Create University')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
