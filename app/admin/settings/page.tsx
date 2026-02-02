'use client';

import React, { useState } from 'react';
import { Settings, Save, Bell, Shield, Globe } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(false);

    const handleSave = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            alert('Settings saved successfully!');
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-background">
            <Sidebar userRole="super_admin" />
            <Header userName="Admin" userEmail="admin@aptivo.com" />

            <main className="ml-64 mt-16 p-8">
                <div className="flex items-center justify-between mb-8 animate-fade-in">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Settings</h1>
                        <p className="text-lg text-gray-600">Configure your institution preferences</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="btn btn-primary"
                    >
                        {loading ? <div className="spinner w-4 h-4" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>

                <div className="grid grid-cols-12 gap-8">
                    {/* Settings Sidebar */}
                    <div className="col-span-3">
                        <div className="glass-surface p-4 space-y-2">
                            {[
                                { id: 'general', label: 'General', icon: Globe },
                                { id: 'security', label: 'Security & Access', icon: Shield },
                                { id: 'notifications', label: 'Notifications', icon: Bell },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === item.id
                                        ? 'bg-primary/10 text-primary-dark font-medium'
                                        : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <item.icon className="w-5 h-5" />
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Settings Content */}
                    <div className="col-span-9">
                        <div className="glass-surface p-8 animate-slide-in">
                            {activeTab === 'general' && (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-6">General Settings</h2>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Institution Name</label>
                                        <input type="text" defaultValue="Aptivo University" className="input" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Primary Domain</label>
                                        <input type="text" defaultValue="aptivo.edu" className="input" />
                                    </div>

                                    <div className="flex items-center justify-between py-4 border-t border-gray-100">
                                        <div>
                                            <h4 className="font-medium text-gray-900">Maintenance Mode</h4>
                                            <p className="text-sm text-gray-500">Disable access for students temporarily</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'security' && (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Security Settings</h2>

                                    <div className="flex items-center justify-between py-4 border-b border-gray-100">
                                        <div>
                                            <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
                                            <p className="text-sm text-gray-500">Require 2FA for all admin accounts</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" defaultChecked />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between py-4">
                                        <div>
                                            <h4 className="font-medium text-gray-900">Public Registration</h4>
                                            <p className="text-sm text-gray-500">Allow students to self-register with domain email</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" defaultChecked />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'notifications' && (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Notification Preferences</h2>

                                    <div className="space-y-4">
                                        {['New user registrations', 'Content upload completion', 'System alerts', 'Weekly digest'].map((item, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <input type="checkbox" id={`notif-${i}`} defaultChecked className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary" />
                                                <label htmlFor={`notif-${i}`} className="text-gray-700">{item}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
