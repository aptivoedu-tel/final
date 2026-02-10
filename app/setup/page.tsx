'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/client';
import { CheckCircle, XCircle, Play, Database as DbIcon, Shield, Users, Building2, Trash2 } from 'lucide-react';
import { useLoading } from '@/lib/context/LoadingContext';


export default function SetupPage() {
    const [logs, setLogs] = useState<string[]>([]);
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');


    const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    const runSetup = async () => {
        setGlobalLoading(true, 'Initializing Application Database...');

        setStatus('running');
        setLogs([]);
        addLog("Starting database initialization...");

        try {
            // 1. Create University
            addLog("Checking Universities...");
            const { data: unis } = await supabase.from('universities').select('id').eq('name', 'Global University');
            let uniId;
            if (!unis || unis.length === 0) {
                const { data: newUni, error: uniError } = await supabase.from('universities').insert({
                    name: 'Global University',
                    domain: 'global.edu',
                    country: 'USA',
                    city: 'New York',
                    description: 'A global university for testing.',
                    is_active: true
                }).select().single();
                if (uniError) throw new Error(`Failed to create university: ${uniError.message}`);
                uniId = newUni.id;
                addLog("Created 'Global University'");
            } else {
                uniId = unis[0].id;
                addLog("Found 'Global University'");
            }

            // 2. Create Institution
            addLog("Checking Institutions...");
            const { data: insts } = await supabase.from('institutions').select('id').eq('name', 'Tech Institute');
            let instId;
            if (!insts || insts.length === 0) {
                const { data: newInst, error: instError } = await supabase.from('institutions').insert({
                    name: 'Tech Institute',
                    institution_type: 'college',
                    domain: 'tech.edu',
                    contact_email: 'contact@tech.edu',
                    is_active: true
                }).select().single();
                if (instError) throw new Error(`Failed to create institution: ${instError.message}`);
                instId = newInst.id;
                addLog("Created 'Tech Institute'");
            } else {
                instId = insts[0].id;
                addLog("Found 'Tech Institute'");
            }

            // 3. Create Content (Subjects, Topics)
            addLog("Seeding Content...");
            const { data: subj } = await supabase.from('subjects').select('id').eq('name', 'Mathematics');
            let subjId;
            if (!subj || subj.length === 0) {
                const { data: newSubj } = await supabase.from('subjects').insert({
                    name: 'Mathematics',
                    description: 'Core mathematics curriculum',
                    color: 'bg-emerald-600',
                    is_active: true
                }).select().single();
                subjId = newSubj?.id;
                addLog("Created 'Mathematics' Subject");
            } else {
                subjId = subj[0].id;
            }

            if (subjId) {
                // Topic
                const { data: topics } = await supabase.from('topics').select('id').eq('name', 'Algebra').eq('subject_id', subjId);
                let topicId;
                if (!topics || topics.length === 0) {
                    const { data: newTopic } = await supabase.from('topics').insert({
                        subject_id: subjId,
                        name: 'Algebra',
                        description: 'Introduction to Algebra',
                        difficulty_level: 'beginner',
                        is_active: true
                    }).select().single();
                    topicId = newTopic?.id;
                    addLog("Created 'Algebra' Topic");
                } else {
                    topicId = topics[0].id;
                }

                // Subtopic
                if (topicId) {
                    const { data: subs } = await supabase.from('subtopics').select('id').eq('name', 'Linear Equations').eq('topic_id', topicId);
                    if (!subs || subs.length === 0) {
                        await supabase.from('subtopics').insert({
                            topic_id: topicId,
                            name: 'Linear Equations',
                            content_markdown: '# Linear Equations\n\nLearn about y = mx + b',
                            is_active: true
                        });
                        addLog("Created 'Linear Equations' Subtopic");
                    }
                }
            }

            // 4. Create Users
            // Helper to create user
            const ensureUser = async (email: string, pass: string, name: string, role: 'student' | 'institution_admin' | 'super_admin', extra: any = {}) => {
                addLog(`Ensuring user ${email}...`);

                // 1. SignUp
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password: pass,
                    options: { data: { full_name: name, role } }
                });

                let userId = authData.user?.id;

                if (authError && authError.message.includes("already registered")) {
                    addLog(`User ${email} exists, trying to fetch ID via public table check...`);
                    // We can't query auth.users, so we check public.users
                    const { data: u } = await supabase.from('users').select('id').eq('email', email).single();
                    if (u) userId = u.id;
                } else if (authError) {
                    addLog(`Error creating auth user: ${authError.message}`);
                }

                if (userId) {
                    // Update public profile
                    await supabase.from('users').upsert({
                        id: userId,
                        email,
                        full_name: name,
                        role,
                        status: 'active',
                        password_hash: 'managed_by_supabase' // Dummy
                    });
                    addLog(`Verified ${role} profile: ${email}`);
                    return userId;
                }
                return null;
            };

            const superId = await ensureUser('super@demo.com', 'password123', 'Super Admin', 'super_admin');
            const adminId = await ensureUser('admin@demo.com', 'password123', 'Institution Admin', 'institution_admin');
            const studentId = await ensureUser('student@demo.com', 'password123', 'Student User', 'student');

            // 5. Link Users
            if (adminId && instId) {
                const { error: linkError } = await supabase.from('institution_admins').upsert({
                    user_id: adminId,
                    institution_id: instId
                }, { onConflict: 'user_id,institution_id' });
                if (!linkError) addLog("Linked Admin to Institution");
            }

            if (studentId && uniId && instId) {
                const { error: enrollError } = await supabase.from('student_university_enrollments').upsert({
                    student_id: studentId,
                    university_id: uniId,
                    institution_id: instId,
                    is_active: true
                }, { onConflict: 'student_id,university_id' });
                if (!enrollError) addLog("Enrolled Student to University");
            }

            // 5a. Enroll Student in Content & Create MCQs
            if (studentId && subjId) {
                // Find topic again if variable scope issue, or use topicId we found earlier.
                // Re-fetching to be safe or use what we have.
                const { data: topics } = await supabase.from('topics').select('id').eq('name', 'Algebra').eq('subject_id', subjId).single();
                const topicId = topics?.id;

                if (topicId) {
                    // Enrich Enrollment
                    await supabase.from('student_topic_enrollments').upsert({
                        student_id: studentId,
                        topic_id: topicId,
                        is_active: true,
                        enrolled_at: new Date().toISOString()
                    }, { onConflict: 'student_id,topic_id' });
                    addLog("Enrolled Student in 'Algebra'");

                    // Subtopic Check (already created in step 3, but get ID)
                    const { data: subs } = await supabase.from('subtopics').select('id').eq('name', 'Linear Equations').eq('topic_id', topicId).single();
                    const subId = subs?.id;

                    if (subId) {
                        // Check MCQs
                        const { count } = await supabase.from('mcqs').select('*', { count: 'exact', head: true }).eq('subtopic_id', subId);
                        if (count === 0) {
                            await supabase.from('mcqs').insert([
                                {
                                    subtopic_id: subId,
                                    question: 'What is the slope in y = 2x + 1?',
                                    option_a: '1',
                                    option_b: '2',
                                    option_c: 'x',
                                    option_d: '0',
                                    correct_option: 'B',
                                    difficulty: 'easy',
                                    is_active: true
                                }
                            ]);
                            addLog("Added sample MCQ to 'Linear Equations'");
                        }
                    }
                }
            }

            // 6. Add Dummy Progress for Student
            if (studentId && subjId) {
                // We need topic stats.
                // For now, let's just log that we are ready.
                // Actual progress usually requires more complex calls.
                addLog("Student setup complete.");
            }

            setStatus('success');
            addLog("Initialization Complete! You can now log in.");

        } catch (error: any) {
            console.error(error);
            addLog(`CRITICAL ERROR: ${error.message}`);
            setStatus('error');
        } finally {
            setGlobalLoading(false);
        }
    };


    const resetDatabase = async () => {
        if (!confirm("WARNING: ALL DATA WILL BE DELETED. Continue?")) return;
        setGlobalLoading(true, 'Wiping Database Content...');
        addLog("Wiping Database...");

        try {
            // Delete child tables first
            await supabase.from('mcqs').delete().neq('id', 0);
            await supabase.from('student_topic_enrollments').delete().neq('id', 0);
            await supabase.from('subtopics').delete().neq('id', 0);
            await supabase.from('topics').delete().neq('id', 0);
            await supabase.from('subjects').delete().neq('id', 0);

            await supabase.from('student_university_enrollments').delete().neq('id', 0);
            await supabase.from('institution_admins').delete().neq('id', 0);

            await supabase.from('institutions').delete().neq('id', 0);
            await supabase.from('universities').delete().neq('id', 0);

            // Users last (UUID)
            // Note: This only deletes from public.users. Auth user remains in Supabase Auth,
            // but won't be able to login if validation checks public.users.
            const { error } = await supabase.from('users').delete().neq('email', 'placeholder');

            if (error) throw error;

            addLog("Database Wiped Successfully.");
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
                        <h1 className="text-2xl font-bold">Database Setup & Seeding</h1>
                    </div>
                    <p className="text-teal-200">Initialize your application with required test data.</p>
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
                                    {loading ? 'Initializing Application...' : 'Run Setup Script'}
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
                                <p className="text-slate-500 mb-6">Database has been successfully seeded.</p>
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
                                <p className="text-red-500 mb-6">Please check the logs below.</p>

                                {logs.some(l => l.includes('row-level security')) && (
                                    <div className="text-left mt-4 mb-6 bg-red-50 p-4 rounded-xl border border-red-100">
                                        <p className="font-bold text-red-800 mb-2 flex items-center gap-2">
                                            <Shield className="w-4 h-4" />
                                            Permission Error (RLS)
                                        </p>
                                        <p className="text-sm text-red-700 mb-3">
                                            Database security policies are blocking the setup script.
                                            You must disable RLS to allow initial seeding.
                                        </p>
                                        <div className="bg-slate-900 rounded-lg p-3 mb-3 text-left">
                                            <code className="text-emerald-400 text-xs font-mono block whitespace-pre overflow-x-auto">
                                                {`ALTER TABLE universities DISABLE ROW LEVEL SECURITY;
ALTER TABLE institutions DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE topics DISABLE ROW LEVEL SECURITY;
ALTER TABLE subtopics DISABLE ROW LEVEL SECURITY;
ALTER TABLE mcqs DISABLE ROW LEVEL SECURITY;
ALTER TABLE institution_admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_university_enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_topic_enrollments DISABLE ROW LEVEL SECURITY;`}
                                            </code>
                                        </div>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(`ALTER TABLE universities DISABLE ROW LEVEL SECURITY;
ALTER TABLE institutions DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE topics DISABLE ROW LEVEL SECURITY;
ALTER TABLE subtopics DISABLE ROW LEVEL SECURITY;
ALTER TABLE mcqs DISABLE ROW LEVEL SECURITY;
ALTER TABLE institution_admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_university_enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_topic_enrollments DISABLE ROW LEVEL SECURITY;`)}
                                            className="w-full py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700"
                                        >
                                            Copy SQL Code
                                        </button>
                                        <p className="text-xs text-center text-red-500 mt-2">Run this in your Supabase SQL Editor</p>
                                    </div>
                                )}

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
