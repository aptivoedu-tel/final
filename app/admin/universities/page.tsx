'use client';

import React from 'react';
import { supabase } from '@/lib/supabase/client';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useUI } from '@/lib/context/UIContext';
import { Plus, Search, MapPin, Globe, Building2, Trash2, Edit2, X, CheckCircle, Upload, Image as ImageIcon, FileText, Save, Layout } from 'lucide-react';
import { AuthService } from '@/lib/services/authService';
import Link from 'next/link';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';

import { toast } from 'sonner';
import { useLoading } from '@/lib/context/LoadingContext';

type University = {
    id: number;
    name: string;
    domain: string;
    city: string;
    country: string;
    logo_url?: string;
    is_active: boolean;
    is_public: boolean;
    test_pattern_markdown?: string;
};

export default function UniversitiesPage() {
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const [universities, setUniversities] = React.useState<University[]>([]);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [logoFile, setLogoFile] = React.useState<File | null>(null);
    const [editingUniversity, setEditingUniversity] = React.useState<University | null>(null);
    const [isTestPatternModalOpen, setIsTestPatternModalOpen] = React.useState(false);
    const [testPatternData, setTestPatternData] = React.useState({ id: 0, name: '', markdown: '' });

    // Form State
    const [formData, setFormData] = React.useState({
        name: '',
        domain: '',
        city: '',
        country: '',
        logo_url: '',
        is_public: true,
    });

    React.useEffect(() => {
        fetchUniversities();
    }, []);

    const fetchUniversities = async () => {
        setGlobalLoading(true, 'Consulting University Directory...');
        const { data, error } = await supabase
            .from('universities')
            .select('*')
            .order('name');

        if (data) setUniversities(data);
        if (error) console.error(error);
        setGlobalLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setGlobalLoading(true, 'Synchronizing Academic Assets...');
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
                    is_public: formData.is_public
                }).eq('id', editingUniversity.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('universities').insert([{
                    name: formData.name,
                    domain: formData.domain,
                    city: formData.city,
                    country: formData.country,
                    logo_url: logo_url,
                    is_public: formData.is_public,
                    is_active: true
                }]);
                if (error) throw error;
            }

            setIsModalOpen(false);
            setEditingUniversity(null);
            setFormData({ name: '', domain: '', city: '', country: '', logo_url: '', is_public: true });
            setLogoFile(null);
            fetchUniversities();
        } catch (error: any) {
            alert(`Error saving university: ${error.message}`);
        } finally {
            setGlobalLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure? This will delete all associated data.')) return;

        const { error } = await supabase.from('universities').delete().eq('id', id);
        if (error) {
            toast.error(error.message);
        } else {
            toast.success('University deleted successfully');
            fetchUniversities();
        }
    };

    const handleSaveTestPattern = async () => {
        setGlobalLoading(true, 'Codifying Pedagogical Patterns...');
        try {
            const { error } = await supabase
                .from('universities')
                .update({ test_pattern_markdown: testPatternData.markdown })
                .eq('id', testPatternData.id);

            if (error) throw error;
            toast.success('Test pattern updated successfully');
            setIsTestPatternModalOpen(false);
            fetchUniversities();
        } catch (error: any) {
            toast.error(`Error: ${error.message}`);
        } finally {
            setGlobalLoading(false);
        }
    };

    const filteredUnis = universities.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.city.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const { isSidebarCollapsed } = useUI();

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="super_admin" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header />

                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Universities</h1>
                                <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium">Manage partner universities and institutions.</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-200 active:scale-95"
                            >
                                <Plus className="w-5 h-5" />
                                <span className="text-sm">Add University</span>
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

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {loading ? null : filteredUnis.length === 0 ? (
                                <div className="col-span-full py-12 text-center text-slate-400">No universities found.</div>
                            ) : (
                                filteredUnis.map(u => (
                                    <div key={u.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-teal-50 overflow-hidden flex items-center justify-center text-teal-600 border border-teal-100">
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
                                                            logo_url: u.logo_url || '',
                                                            is_public: u.is_public ?? true
                                                        });
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-teal-50"
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
                                            <button
                                                onClick={() => {
                                                    setTestPatternData({
                                                        id: u.id,
                                                        name: u.name,
                                                        markdown: u.test_pattern_markdown || ''
                                                    });
                                                    setIsTestPatternModalOpen(true);
                                                }}

                                                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-100 transition-all"
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                                Pattern
                                            </button>
                                            <Link
                                                href={`/admin/universities/${u.id}/exams`}
                                                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-100 transition-all"
                                            >
                                                <Layout className="w-3.5 h-3.5" />
                                                Exams
                                            </Link>
                                        </div>

                                        <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                                            <span className={`flex items-center gap-1.5 text-xs font-bold ${u.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                                                <CheckCircle className="w-3.5 h-3.5" /> {u.is_active ? 'ACTIVE' : 'INACTIVE'}
                                            </span>
                                            {/* Visibility Indicator */}
                                            {u.is_public === false && (
                                                <span className="flex items-center gap-1.5 text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-md">
                                                    HIDDEN
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </main>

                {/* Modal */}
                {
                    isModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                    <h3 className="text-xl font-bold text-slate-800">{editingUniversity ? 'Edit University' : 'Add New University'}</h3>
                                    <button onClick={() => {
                                        setIsModalOpen(false);
                                        setEditingUniversity(null);
                                        setFormData({ name: '', domain: '', city: '', country: '', logo_url: '', is_public: true });
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
                                            className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
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
                                                className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
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
                                                className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                                                placeholder="e.g. Palo Alto"
                                                value={formData.city}
                                                onChange={e => setFormData({ ...formData, city: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 flex items-center justify-between">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700">Public Visibility</label>
                                            <p className="text-xs text-slate-500">Show this university to students in the catalog</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={formData.is_public}
                                                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Country</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
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
                                                <div className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-teal-100 rounded-xl cursor-pointer hover:bg-teal-50/50 transition-colors">
                                                    <Upload className="w-4 h-4 text-teal-600" />
                                                    <span className="text-sm font-bold text-teal-600">
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
                                            disabled={loading}
                                            className="w-full py-4 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors shadow-lg shadow-teal-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {editingUniversity ? 'Update University' : 'Create University'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

                {/* Test Pattern Editor Modal */}
                {
                    isTestPatternModalOpen && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 border border-slate-200">
                                {/* Header */}
                                <div className="px-6 sm:px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-200">
                                            <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg sm:text-xl font-black text-slate-900">Entry Test Pattern</h3>
                                            <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest truncate max-w-[150px] sm:max-w-none">{testPatternData.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={handleSaveTestPattern}
                                            disabled={loading}
                                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-teal-600 text-white font-black rounded-xl hover:bg-teal-700 transition-all shadow-lg shadow-teal-200 disabled:opacity-50 text-xs sm:text-sm"
                                        >
                                            <Save className="w-4 h-4" /> Save
                                        </button>
                                        <button
                                            onClick={() => setIsTestPatternModalOpen(false)}
                                            className="p-2.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Dual Pane Editor */}
                                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                                    {/* Editor Pane */}
                                    <div className="flex-1 flex flex-col lg:border-r border-slate-100 bg-slate-50/30 overflow-hidden min-h-[300px] lg:min-h-0">
                                        <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Editor</span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setTestPatternData(prev => ({
                                                        ...prev,
                                                        markdown: prev.markdown + "\n| Column 1 | Column 2 |\n| --- | --- |\n| Row 1 | Row 2 |\n"
                                                    }))}
                                                    className="p-1.5 hover:bg-teal-50 rounded text-teal-600 transition-colors"
                                                    title="Insert Table"
                                                >
                                                    <Layout className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <textarea
                                            value={testPatternData.markdown}
                                            onChange={(e) => setTestPatternData({ ...testPatternData, markdown: e.target.value })}
                                            className="flex-1 p-6 sm:p-8 bg-transparent outline-none font-mono text-xs sm:text-sm leading-relaxed text-slate-700 resize-none overflow-y-auto"
                                            placeholder="Define the entrance exam sequence, marks distribution, and pattern here. Use markdown tables for clarity."
                                        />
                                    </div>

                                    {/* Preview Pane */}
                                    <div className="hidden lg:flex flex-1 flex-col bg-white overflow-hidden">
                                        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                                            <span className="text-[10px] font-black text-teal-500 uppercase tracking-widest bg-teal-50 px-2 py-0.5 rounded">Live Preview</span>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-8 prose prose-slate max-w-none prose-sm font-sans custom-scrollbar">
                                            {testPatternData.markdown ? (
                                                <MarkdownRenderer content={testPatternData.markdown} />

                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center text-slate-300 text-center opacity-40">
                                                    <FileText className="w-16 h-16 mb-4" />
                                                    <p className="text-sm font-bold uppercase tracking-widest">No pattern defined yet</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >
        </div >
    );
}
