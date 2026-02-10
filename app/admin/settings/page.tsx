'use client';

import React, { useState } from 'react';
import { Settings, Save, Bell, Shield, Globe, RefreshCw } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { useUI } from '@/lib/context/UIContext';
import { useLoading } from '@/lib/context/LoadingContext';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('general');
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const { isSidebarCollapsed } = useUI();

    const handleSave = () => {
        setGlobalLoading(true, 'Synchronizing System Configuration...');
        setTimeout(() => {
            setGlobalLoading(false);
            alert('Settings saved successfully!');
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="super_admin" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header />

                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">System Settings</h1>
                            <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium">Configure institution preferences and platform governance.</p>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-teal-600 text-white font-black uppercase tracking-wider text-[11px] rounded-xl hover:bg-slate-900 transition-all shadow-lg shadow-teal-100 active:scale-95"
                        >
                            {loading ? null : <Save className="w-4 h-4" />}
                            Save Changes
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Settings Sidebar */}
                        <div className="lg:col-span-1">
                            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 space-y-1">
                                {[
                                    { id: 'general', label: 'General', icon: Globe },
                                    { id: 'security', label: 'Security & Access', icon: Shield },
                                    { id: 'notifications', label: 'Notifications', icon: Bell },
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id
                                            ? 'bg-teal-600 text-white shadow-lg shadow-teal-100'
                                            : 'text-slate-500 hover:bg-slate-50'
                                            }`}
                                    >
                                        <item.icon className="w-4 h-4" />
                                        <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Settings Content */}
                        <div className="lg:col-span-3">
                            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 min-h-[400px]">
                                {activeTab === 'general' && (
                                    <div className="space-y-8">
                                        <div>
                                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest mb-1">General Configuration</h2>
                                            <p className="text-xs font-medium text-slate-400">Manage basic institution identity and status.</p>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Institution Identity</label>
                                                <input type="text" defaultValue="Aptivo University" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 font-bold text-slate-700" />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Primary Academic Domain</label>
                                                <input type="text" defaultValue="aptivo.edu" className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 font-bold text-slate-700" />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between py-6 border-t border-slate-100">
                                            <div>
                                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Maintenance Mode</h4>
                                                <p className="text-xs font-medium text-slate-500">Temporarily suspend student portal access</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'security' && (
                                    <div className="space-y-8">
                                        <div>
                                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest mb-1">Security & Shield</h2>
                                            <p className="text-xs font-medium text-slate-400">Configure platform-wide security protocols.</p>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between py-4 border-b border-slate-50">
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Multi-Factor Auth</h4>
                                                    <p className="text-xs font-medium text-slate-500">Mandatory 2FA for all administrative accounts</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" className="sr-only peer" defaultChecked />
                                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                                </label>
                                            </div>

                                            <div className="flex items-center justify-between py-4">
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Global Enrollment</h4>
                                                    <p className="text-xs font-medium text-slate-500">Allow self-registration via verified domains</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" className="sr-only peer" defaultChecked />
                                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'notifications' && (
                                    <div className="space-y-8">
                                        <div>
                                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest mb-1">Global Alerts</h2>
                                            <p className="text-xs font-medium text-slate-400">Define system notification delivery triggers.</p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {['Registration Alerts', 'Upload Verification', 'System Diagnostics', 'Performance Reports'].map((item, i) => (
                                                <label key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-white hover:border-teal-100 transition-all group">
                                                    <input type="checkbox" id={`notif-${item}`} defaultChecked className="w-5 h-5 text-teal-600 rounded-lg border-slate-200 focus:ring-teal-500/20" />
                                                    <span className="text-xs font-bold text-slate-600 group-hover:text-teal-600 transition-colors uppercase tracking-widest">{item}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
