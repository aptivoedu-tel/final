'use client';

import React, { useState } from 'react';
import { CheckCircle, XCircle, Database as DbIcon, Shield, Users, Building2, Trash2 } from 'lucide-react';
import { useLoading } from '@/lib/context/LoadingContext';

// MongoDB-only setup page — all Supabase references removed.

export default function SetupPage() {
    const [logs, setLogs] = useState<string[]>([]);
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');

    const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    const apiFetch = async (url: string, options?: RequestInit) => {
        const res = await fetch(url, options);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Request to ${url} failed`);
        return data;
    };

    const runSetup = async () => {
        setGlobalLoading(true, 'Initializing Application Database...');
        setStatus('running');
        setLogs([]);
        addLog('Starting MongoDB setup...');

        try {
            // 1. Create University
            addLog('Checking Universities...');
            let uniData = await apiFetch('/api/mongo/universities');
            let uni = (uniData.universities || []).find((u: any) => u.name === 'Global University');
            if (!uni) {
                const created = await apiFetch('/api/mongo/universities', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'Global University',
                        domain: 'global.edu',
                        country: 'USA',
                        city: 'New York',
                        description: 'A global university for testing.',
                        is_active: true,
                    }),
                });
                uni = created.university;
                addLog("Created 'Global University'");
            } else {
                addLog("Found 'Global University'");
            }

            // 2. Create Institution
            addLog('Checking Institutions...');
            let instData = await apiFetch('/api/mongo/institutions');
            let inst = (instData.institutions || []).find((i: any) => i.name === 'Tech Institute');
            if (!inst) {
                const created = await apiFetch('/api/mongo/institutions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'Tech Institute',
                        institution_type: 'college',
                        domain: 'tech.edu',
                        contact_email: 'contact@tech.edu',
                        is_active: true,
                    }),
                });
                inst = created.institution;
                addLog("Created 'Tech Institute'");
            } else {
                addLog("Found 'Tech Institute'");
            }

            // 3. Create Subjects / Topics / Subtopics
            addLog('Seeding Content...');
            let subjData = await apiFetch('/api/mongo/subjects');
            let subj = (subjData.subjects || []).find((s: any) => s.name === 'Mathematics');
            if (!subj) {
                const created = await apiFetch('/api/mongo/subjects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'Mathematics',
                        description: 'Core mathematics curriculum',
                        color: 'bg-emerald-600',
                        is_active: true,
                    }),
                });
                subj = created.subject;
                addLog("Created 'Mathematics' Subject");
            }

            let topic: any = null;
            if (subj) {
                let topicData = await apiFetch(`/api/mongo/topics?subject_id=${subj.id}`);
                topic = (topicData.topics || []).find((t: any) => t.name === 'Algebra');
                if (!topic) {
                    const created = await apiFetch('/api/mongo/topics', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            subject_id: subj.id,
                            name: 'Algebra',
                            description: 'Introduction to Algebra',
                            difficulty_level: 'beginner',
                            is_active: true,
                        }),
                    });
                    topic = created.topic;
                    addLog("Created 'Algebra' Topic");
                }

                if (topic) {
                    let subtopicData = await apiFetch(`/api/mongo/subtopics?topic_id=${topic.id}`);
                    const hasSub = (subtopicData.subtopics || []).some((s: any) => s.name === 'Linear Equations');
                    if (!hasSub) {
                        await apiFetch('/api/mongo/subtopics', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                topic_id: topic.id,
                                name: 'Linear Equations',
                                content_markdown: '# Linear Equations\n\nLearn about y = mx + b',
                                is_active: true,
                            }),
                        });
                        addLog("Created 'Linear Equations' Subtopic");
                    }
                }
            }

            // 4. Create Demo Users
            const ensureUser = async (email: string, pass: string, name: string, role: string) => {
                addLog(`Ensuring user ${email}...`);
                try {
                    const result = await apiFetch('/api/auth/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password: pass, full_name: name, role }),
                    });
                    addLog(`Created ${role}: ${email}`);
                    return result.user;
                } catch (err: any) {
                    if (err.message?.includes('already exists')) {
                        addLog(`User ${email} already exists`);
                        // Try to get the user via admin API
                        try {
                            const usersRes = await apiFetch('/api/mongo/admin/users');
                            return (usersRes.users || []).find((u: any) => u.email === email) || null;
                        } catch {
                            return null;
                        }
                    }
                    addLog(`Warning creating ${email}: ${err.message}`);
                    return null;
                }
            };

            await ensureUser('super@demo.com', 'password123', 'Super Admin', 'super_admin');
            await ensureUser('admin@demo.com', 'password123', 'Institution Admin', 'institution_admin');
            await ensureUser('student@demo.com', 'password123', 'Student User', 'student');

            setStatus('success');
            addLog('Initialization Complete! You can now log in.');
        } catch (error: any) {
            console.error(error);
            addLog(`CRITICAL ERROR: ${error.message}`);
            setStatus('error');
        } finally {
            setGlobalLoading(false);
        }
    };

    const resetDatabase = async () => {
        if (!confirm('WARNING: This will delete all demo data. Continue?')) return;
        setGlobalLoading(true, 'Wiping Demo Data...');
        addLog('Wiping demo data via MongoDB API...');

        try {
            // Reset via individual delete calls
            const tables = ['subjects', 'institutions', 'universities'];
            for (const table of tables) {
                try {
                    await fetch(`/api/mongo/${table}?wipe=true`, { method: 'DELETE' });
                    addLog(`Cleared ${table}`);
                } catch {
                    addLog(`Could not clear ${table} (may need manual deletion)`);
                }
            }
            addLog('Reset attempted. Some tables may require manual cleanup via MongoDB Atlas.');
            setStatus('idle');
        } catch (e: any) {
            addLog(`Wipe Failed: ${e.message}`);
        } finally {
            setGlobalLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8 font-sans">
            <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                <div className="bg-gradient-to-r from-teal-900 to-teal-700 p-8 text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <DbIcon className="w-8 h-8" />
                        <h1 className="text-2xl font-bold">MongoDB Setup & Seeding</h1>
                    </div>
                    <p className="text-teal-200">Initialize your application with required test data via MongoDB.</p>
                </div>

                <div className="p-8">
                    <div className="mb-8 space-y-4">
                        <div className="flex items-start gap-4 p-4 rounded-lg bg-teal-50 border border-teal-100">
                            <Shield className="w-5 h-5 text-teal-600 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-teal-900">Super Admin</h3>
                                <p className="text-sm text-teal-700 font-mono mt-1">super@demo.com / password123</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                            <Building2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-emerald-900">Institution Admin</h3>
                                <p className="text-sm text-emerald-700 font-mono mt-1">admin@demo.com / password123</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 rounded-lg bg-green-50 border border-emerald-100">
                            <Users className="w-5 h-5 text-emerald-600 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-emerald-900">Student</h3>
                                <p className="text-sm text-emerald-700 font-mono mt-1">student@demo.com / password123</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center mb-8 gap-4">
                        {status !== 'success' && status !== 'error' && (
                            <div className="flex gap-4">
                                <button
                                    onClick={runSetup}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-8 py-4 bg-teal-600 text-white rounded-xl font-bold text-lg hover:bg-teal-700 transition-all shadow-lg hover:shadow-teal-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Initializing...' : 'Run Setup Script'}
                                </button>
                                <button
                                    onClick={resetDatabase}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-6 py-4 bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold text-lg hover:bg-red-200 transition-all disabled:opacity-50"
                                >
                                    <Trash2 className="w-5 h-5" />
                                    Wipe Data
                                </button>
                            </div>
                        )}

                        {status === 'success' && (
                            <div className="text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-4">
                                    <CheckCircle className="w-8 h-8" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 mb-2">Setup Complete!</h2>
                                <p className="text-slate-500 mb-6">MongoDB has been successfully seeded.</p>
                                <a href="/login" className="inline-block px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">
                                    Go to Login
                                </a>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
                                    <XCircle className="w-8 h-8" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 mb-2">Setup Failed</h2>
                                <p className="text-red-500 mb-6">Please check the logs below and ensure your MongoDB connection is configured correctly in <code className="font-mono">.env.local</code>.</p>
                                <button
                                    onClick={runSetup}
                                    className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200"
                                >
                                    Retry
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-900 rounded-xl p-6 font-mono text-sm h-64 overflow-y-auto">
                        {logs.length === 0 ? (
                            <span className="text-slate-500 italic">Waiting to start...</span>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} className="text-slate-300 mb-1 border-b border-slate-800/50 pb-1 last:border-0">
                                    {log}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
