'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, Bell, Shield, Globe, RefreshCw, AlertTriangle, Monitor } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { useUI } from '@/lib/context/UIContext';
import { useLoading } from '@/lib/context/LoadingContext';
import { toast } from 'sonner';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('general');
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const { isSidebarCollapsed } = useUI();
    const [user, setUser] = useState<any>(null);

    const [settings, setSettings] = useState({
        maintenance_mode: false,
        maintenance_title: 'System Maintenance in Progress',
        maintenance_message: 'We are currently performing scheduled maintenance to improve our services. Please check back shortly.',
        maintenance_time: '',
        maintenance_intensity: 'Standard',
        ai_chatbot_active: true,
        institution_name: 'Aptivo University',
        academic_domain: 'aptivo.edu'
    });

    useEffect(() => {
        const currentUser = AuthService.getCurrentUser();
        if (currentUser) setUser(currentUser);
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/mongo/admin/settings');
            if (res.ok) {
                const data = await res.json();
                if (data.settings) {
                    setSettings({
                        maintenance_mode: data.settings.maintenance_mode,
                        maintenance_title: data.settings.maintenance_title || 'System Maintenance in Progress',
                        maintenance_message: data.settings.maintenance_message || '',
                        maintenance_time: data.settings.maintenance_time || '',
                        maintenance_intensity: data.settings.maintenance_intensity || 'Standard',
                        ai_chatbot_active: data.settings.ai_chatbot_active ?? true,
                        institution_name: data.settings.institution_name || 'Aptivo University',
                        academic_domain: data.settings.academic_domain || 'aptivo.edu'
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const handleSave = async () => {
        setGlobalLoading(true, 'Synchronizing System Configuration...');
        try {
            const res = await fetch('/api/mongo/admin/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });

            if (res.ok) {
                toast.success('System settings synchronized successfully');
            } else {
                const err = await res.json();
                throw new Error(err.error || 'Failed to sync settings');
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setGlobalLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="super_admin" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name || 'Super Admin'} userEmail={user?.email} />

                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    System Core
                                </span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Portal Governance</h1>
                            <p className="text-sm sm:text-base text-slate-500 font-medium">Configure institution preferences and platform operations.</p>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-slate-900 text-white font-black uppercase tracking-wider text-[11px] rounded-xl hover:bg-teal-600 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                        >
                            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Sync Global Config
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Settings Sidebar */}
                        <div className="lg:col-span-1">
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-2">
                                {[
                                    { id: 'general', label: 'Operational Info', icon: Globe },
                                    { id: 'features', label: 'AI & Global Features', icon: Monitor },
                                    { id: 'maintenance', label: 'Maintenance Mode', icon: AlertTriangle },
                                    { id: 'security', label: 'Access Control', icon: Shield },
                                    { id: 'notifications', label: 'System Alerts', icon: Bell },
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${activeTab === item.id
                                            ? 'bg-slate-900 text-white shadow-lg'
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                            }`}
                                    >
                                        <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-teal-400' : ''}`} />
                                        <span className="text-[11px] font-black uppercase tracking-widest leading-none">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Settings Content */}
                        <div className="lg:col-span-3">
                            <div className="bg-white p-8 sm:p-10 rounded-[32px] shadow-sm border border-slate-200 min-h-[500px] relative overflow-hidden">
                                {activeTab === 'general' && (
                                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest mb-2 flex items-center gap-3">
                                                <Globe className="w-5 h-5 text-teal-600" />
                                                Operational Identity
                                            </h2>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Global metadata for the platform instances.</p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Institution Full Name</label>
                                                <input
                                                    type="text"
                                                    value={settings.institution_name}
                                                    onChange={(e) => setSettings({ ...settings, institution_name: e.target.value })}
                                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 font-bold text-slate-700 transition-all"
                                                    placeholder="Aptivo University"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Academic Domain</label>
                                                <input
                                                    type="text"
                                                    value={settings.academic_domain}
                                                    onChange={(e) => setSettings({ ...settings, academic_domain: e.target.value })}
                                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 font-bold text-slate-700 transition-all"
                                                    placeholder="aptivo.edu"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'features' && (
                                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest mb-2 flex items-center gap-3">
                                                <Monitor className="w-5 h-5 text-teal-600" />
                                                System Capabilities
                                            </h2>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Enable or disable core platform modules and integrations.</p>
                                        </div>

                                        <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-teal-100 transition-all">
                                            <div className="flex items-center gap-6">
                                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm text-teal-600 border border-slate-100">
                                                    <Monitor className="w-8 h-8" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-1">AI Research Assistant</h4>
                                                    <p className="text-xs font-medium text-slate-500">Toggle the platform-wide chatbot for all users.</p>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer scale-110">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={settings.ai_chatbot_active}
                                                    onChange={(e) => setSettings({ ...settings, ai_chatbot_active: e.target.checked })}
                                                />
                                                <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-teal-600 shadow-inner"></div>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'maintenance' && (
                                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b border-slate-100">
                                            <div className="max-w-md">
                                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest mb-2 flex items-center gap-3">
                                                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                                                    Service Interruption
                                                </h2>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Activating maintenance mode will suspend portal access for all non-admin users.</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer scale-125">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={settings.maintenance_mode}
                                                    onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                                                />
                                                <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-rose-500 shadow-inner"></div>
                                            </label>
                                        </div>

                                        <div className="space-y-8">
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Maintenance Banner Title</label>
                                                <input
                                                    type="text"
                                                    value={settings.maintenance_title}
                                                    onChange={(e) => setSettings({ ...settings, maintenance_title: e.target.value })}
                                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 font-bold text-slate-700 transition-all"
                                                    placeholder="System Maintenance in Progress"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Custom Maintenance Message</label>
                                                <textarea
                                                    rows={4}
                                                    value={settings.maintenance_message}
                                                    onChange={(e) => setSettings({ ...settings, maintenance_message: e.target.value })}
                                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 font-bold text-slate-700 transition-all resize-none"
                                                    placeholder="Enter custom lines for users during downtime..."
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                                <div className="space-y-2">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expected Recovery Time</label>
                                                    <input
                                                        type="text"
                                                        value={settings.maintenance_time}
                                                        onChange={(e) => setSettings({ ...settings, maintenance_time: e.target.value })}
                                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 font-bold text-slate-700 transition-all"
                                                        placeholder="e.g. 2 Hours, 6:00 PM EST"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Update Intensity / Priority</label>
                                                    <select
                                                        value={settings.maintenance_intensity}
                                                        onChange={(e) => setSettings({ ...settings, maintenance_intensity: e.target.value })}
                                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 font-bold text-slate-700 transition-all appearance-none"
                                                    >
                                                        <option value="Low Impact">Low Impact - Hotfix</option>
                                                        <option value="Standard">Standard - Security Update</option>
                                                        <option value="Critical">Critical - Core Engine Migration</option>
                                                        <option value="Major Overhaul">Major Overhaul - Massive Changes</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {settings.maintenance_mode && (
                                                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                        <Monitor className="w-24 h-24 text-white -rotate-12" />
                                                    </div>
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em]">Live Status: Offline</span>
                                                    </div>
                                                    <h3 className="text-white font-black text-lg mb-2 relative z-10">{settings.maintenance_title}</h3>
                                                    <p className="text-slate-400 text-xs font-medium leading-relaxed relative z-10 mb-6">{settings.maintenance_message}</p>
                                                    <div className="flex flex-wrap gap-4 relative z-10">
                                                        {settings.maintenance_time && (
                                                            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">ETA Recovery</span>
                                                                <span className="text-[11px] font-black text-white uppercase">{settings.maintenance_time}</span>
                                                            </div>
                                                        )}
                                                        <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">Update Scale</span>
                                                            <span className="text-[11px] font-black text-white uppercase">{settings.maintenance_intensity}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'security' && (
                                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest mb-2 flex items-center gap-3">
                                                <Shield className="w-5 h-5 text-indigo-600" />
                                                Security Protocols
                                            </h2>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configure platform-wide security and access layers.</p>
                                        </div>

                                        <div className="space-y-4">
                                            {[
                                                { title: 'Multi-Factor Auth', desc: 'Mandatory 2FA for all administrative accounts', checked: true, color: 'indigo-500' },
                                                { title: 'Global Enrollment', desc: 'Allow self-registration via verified domains', checked: true, color: 'teal-600' },
                                                { title: 'IP Whitelisting', desc: 'Restrict admin access to specific IP ranges', checked: false, color: 'slate-400' }
                                            ].map((item, i) => (
                                                <div key={i} className="flex items-center justify-between py-6 group hover:bg-slate-50 px-4 rounded-2xl transition-all cursor-pointer border-b border-slate-50">
                                                    <div className="flex-1">
                                                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-1">{item.title}</h4>
                                                        <p className="text-xs font-medium text-slate-500">{item.desc}</p>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input type="checkbox" className="sr-only peer" defaultChecked={item.checked} />
                                                        <div className={`w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-${item.color}`}></div>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'notifications' && (
                                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest mb-2 flex items-center gap-3">
                                                <Bell className="w-5 h-5 text-amber-500" />
                                                Global Dispatch
                                            </h2>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Define system notification delivery and alert triggers.</p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {['Registration Alerts', 'Upload Verification', 'System Diagnostics', 'Performance Reports', 'Security Breach', 'Database Sync'].map((item, i) => (
                                                <label key={i} className="flex items-center gap-4 p-6 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-white hover:border-amber-100 transition-all group">
                                                    <input type="checkbox" id={`notif-${item}`} defaultChecked className="w-5 h-5 text-amber-500 rounded-lg border-slate-200 focus:ring-amber-500/20" />
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-slate-700 group-hover:text-amber-600 transition-colors uppercase tracking-widest leading-none">{item}</span>
                                                        <span className="text-[10px] text-slate-400 mt-1 font-bold">Enabled</span>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div >
        </div >
    );
}
