'use client';

import React, { useEffect, useState } from 'react';
import { Settings, Hammer, Clock, ShieldAlert, Globe, ArrowRight, Laptop } from 'lucide-react';

export default function MaintenancePage() {
    const [settings, setSettings] = useState({
        maintenance_title: 'System Maintenance in Progress',
        maintenance_message: 'We are currently performing scheduled maintenance to improve our services. Please check back shortly.',
        maintenance_time: '',
        maintenance_intensity: 'Standard'
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/mongo/admin/settings');
                if (res.ok) {
                    const data = await res.json();
                    if (data.settings) {
                        setSettings({
                            maintenance_title: data.settings.maintenance_title || 'System Maintenance in Progress',
                            maintenance_message: data.settings.maintenance_message || 'We are currently performing scheduled maintenance to improve our services.',
                            maintenance_time: data.settings.maintenance_time || '',
                            maintenance_intensity: data.settings.maintenance_intensity || 'Standard'
                        });
                    }
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchSettings();
    }, []);

    return (
        <div className="min-h-screen bg-[#fafbfc] flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden font-sans">
            {/* Abstract Background Decoration */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Main Content Card */}
            <div className="max-w-3xl w-full relative z-10 text-center space-y-12">
                {/* Branding */}
                <div className="inline-flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-1000">
                    <div className="w-20 h-20 bg-white rounded-[28px] shadow-2xl flex items-center justify-center border border-slate-100/50 p-4">
                        <div className="w-full h-full bg-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-100 animate-pulse">
                            <Laptop className="w-8 h-8" />
                        </div>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[11px] font-black uppercase tracking-[0.4em] text-teal-600 mb-1">Aptivo Portal</span>
                        <div className="h-0.5 w-12 bg-teal-600/20 rounded-full" />
                    </div>
                </div>

                {/* Hero Text */}
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                    <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                        {settings.maintenance_title}
                    </h1>
                    <p className="text-lg sm:text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
                        {settings.maintenance_message}
                    </p>
                </div>

                {/* Stats/Status Display */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
                    {[
                        { icon: ShieldAlert, label: 'Platform Security', value: 'Verified', color: 'teal' },
                        { icon: Clock, label: 'Estimated Completion', value: settings.maintenance_time || 'Check back soon', color: 'indigo' },
                        { icon: Hammer, label: 'Work Intensity', value: settings.maintenance_intensity || 'Standard', color: 'amber' },
                    ].map((item, i) => (
                        <div key={i} className="bg-white p-6 rounded-[32px] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col items-center gap-3 group hover:border-teal-100 transition-all hover:-translate-y-1">
                            <div className={`p-4 rounded-2xl bg-${item.color}-50 text-${item.color}-600 group-hover:bg-${item.color}-600 group-hover:text-white transition-all`}>
                                <item.icon className="w-6 h-6" />
                            </div>
                            <div className="text-center">
                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</span>
                                <span className="text-sm font-black text-slate-900 leading-none">{item.value}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Message */}
                <div className="pt-8 border-t border-slate-100 inline-block animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-700">
                    <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-slate-100/50 border border-slate-200/50">
                        <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            Engineers at work
                            <ArrowRight className="w-3 h-3" />
                        </span>
                    </div>
                </div>
            </div>

            {/* Bottom floating info */}
            <div className="fixed bottom-8 left-0 right-0 flex justify-center pointer-events-none px-6">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] text-center">
                    &copy; 2026 Aptivo Inteligence. All core systems protected.
                </p>
            </div>
        </div>
    );
}
