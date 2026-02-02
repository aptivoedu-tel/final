'use client';

import React, { useState } from 'react';
import { Download, FileSpreadsheet, Upload, Folder, BookOpen, Layers, CheckCircle, AlertTriangle, Save, Loader2, X } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { supabase } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';

export default function ExcelUploaderPage() {
    const [user, setUser] = useState<any>(null);

    // Hierarchy Data
    const [subjectsList, setSubjectsList] = useState<any[]>([]);
    const [topicsList, setTopicsList] = useState<any[]>([]);
    const [subtopicsList, setSubtopicsList] = useState<any[]>([]);

    const [subject, setSubject] = useState('');
    const [topic, setTopic] = useState('');
    const [subtopic, setSubtopic] = useState('');

    // Upload State
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    React.useEffect(() => {
        const currentUser = AuthService.getCurrentUser();
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('aptivo_user') : null;
        if (currentUser) setUser(currentUser);
        else if (storedUser) setUser(JSON.parse(storedUser));

        loadSubjects();
    }, []);

    const loadSubjects = async () => {
        const { data } = await supabase.from('subjects').select('*').eq('is_active', true);
        if (data) setSubjectsList(data);
    };

    React.useEffect(() => {
        if (subject) {
            const loadTopics = async () => {
                const { data } = await supabase.from('topics').select('*').eq('subject_id', subject).eq('is_active', true);
                if (data) setTopicsList(data);
            };
            loadTopics();
        } else {
            setTopicsList([]);
        }
        setTopic('');
    }, [subject]);

    React.useEffect(() => {
        if (topic) {
            const loadSub = async () => {
                const { data } = await supabase.from('subtopics').select('*').eq('topic_id', topic).eq('is_active', true);
                if (data) setSubtopicsList(data);
            };
            loadSub();
        } else {
            setSubtopicsList([]);
        }
        setSubtopic('');
    }, [topic]);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const processFile = (file: File) => {
        setSelectedFile(file);
        setLoading(true);

        const reader = new FileReader();
        reader.onload = (e: any) => {
            try {
                const bstr = e.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);
                setPreviewData(data);
            } catch (err) {
                alert('Error parsing Excel file. Please use the template.');
                setSelectedFile(null);
            } finally {
                setLoading(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleSaveToDatabase = async () => {
        if (!user) {
            alert('User session not found. Please log in again.');
            return;
        }
        if (!subtopic) {
            alert('Please select a Subtopic first.');
            return;
        }
        if (previewData.length === 0) {
            alert('No data found in the file.');
            return;
        }

        setSaving(true);
        try {
            // 1. Create upload record
            const { data: uploadRec, error: uploadErr } = await supabase.from('uploads').insert({
                upload_type: 'mcq_excel',
                file_name: selectedFile?.name,
                subtopic_id: parseInt(subtopic),
                status: 'processing',
                total_rows: previewData.length,
                created_by: user.id
            }).select().single();

            if (uploadErr) throw uploadErr;

            // 2. Map and Insert MCQs
            const mcqsToInsert = previewData.map(row => {
                // Handle different header variations (Case sensitive or space variations)
                const q = row['Question'] || row['question'] || row['QUESTION'];
                const a = row['Option A'] || row['option_a'] || row['A'];
                const b = row['Option B'] || row['option_b'] || row['B'];
                const c = row['Option C'] || row['option_c'] || row['C'];
                const d = row['Option D'] || row['option_d'] || row['D'];
                const correct = (row['Correct Option'] || row['correct_option'] || row['Answer'])?.toString().toUpperCase();
                const explanation = row['Explanation'] || row['explanation'];
                const rawDifficulty = (row['Difficulty'] || row['difficulty'] || 'medium').toLowerCase();

                // Validate difficulty enum
                const difficulty = ['easy', 'medium', 'hard'].includes(rawDifficulty) ? rawDifficulty : 'medium';

                return {
                    subtopic_id: parseInt(subtopic),
                    question: q,
                    option_a: a,
                    option_b: b,
                    option_c: c,
                    option_d: d,
                    correct_option: correct,
                    explanation: explanation,
                    difficulty: difficulty,
                    upload_id: uploadRec.id
                };
            }).filter(item => item.question && item.option_a && item.correct_option);

            if (mcqsToInsert.length === 0) {
                throw new Error('No valid questions found. Check your column headers.');
            }

            const { error: mcqErr } = await supabase.from('mcqs').insert(mcqsToInsert);
            if (mcqErr) throw mcqErr;

            // 3. Complete Upload Record
            await supabase.from('uploads').update({
                status: 'completed',
                processed_rows: mcqsToInsert.length,
                completed_at: new Date().toISOString()
            }).eq('id', uploadRec.id);

            alert(`Successfully imported ${mcqsToInsert.length} questions!`);
            setPreviewData([]);
            setSelectedFile(null);
            setSubject('');
        } catch (err: any) {
            console.error(err);
            alert('Upload failed: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDownloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            {
                'Question': 'What is the capital of France?',
                'Option A': 'London',
                'Option B': 'Berlin',
                'Option C': 'Paris',
                'Option D': 'Madrid',
                'Correct Option': 'C',
                'Explanation': 'Paris is the capital and largest city of France.',
                'Difficulty': 'Easy'
            }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "aptivo_mcq_template.xlsx");
    };

    const resetUpload = () => {
        setSelectedFile(null);
        setPreviewData([]);
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <Sidebar userRole="super_admin" />
            <Header userName={user?.full_name || 'Admin'} userEmail={user?.email || 'admin@aptivo.edu'} />

            <main className="ml-64 mt-16 p-8">
                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">Excel MCQ Uploader</h1>
                        <p className="text-slate-500">Bulk upload questions with automatic validation and topic mapping.</p>
                    </div>
                    <button
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-2 px-5 py-2.5 bg-green-50 text-green-600 font-bold rounded-xl hover:bg-green-100 transition-colors border border-green-200"
                    >
                        <Download className="w-5 h-5" />
                        Download Template
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Configuration & Upload */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Topic Selection */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
                                <Layers className="w-4 h-4" /> 1. Topic Mapping
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2">Subject</label>
                                    <select
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none text-slate-700 font-medium"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                    >
                                        <option value="">Select Subject</option>
                                        {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2">Topic</label>
                                    <select
                                        disabled={!subject}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none text-slate-700 font-medium disabled:opacity-50"
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                    >
                                        <option value="">Select Topic</option>
                                        {topicsList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2">Subtopic</label>
                                    <select
                                        disabled={!topic}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none text-slate-700 font-medium disabled:opacity-50"
                                        value={subtopic}
                                        onChange={(e) => setSubtopic(e.target.value)}
                                    >
                                        <option value="">Select Subtopic</option>
                                        {subtopicsList.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Dropzone */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
                                <Upload className="w-4 h-4" /> 2. Upload File
                            </h3>

                            {!selectedFile ? (
                                <div
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    onClick={() => document.getElementById('file-upload')?.click()}
                                    className={`
                                        h-48 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer
                                        ${dragActive ? 'border-primary bg-primary/5' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}
                                    `}
                                >
                                    <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".xlsx,.xls,.csv" />
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center mb-3 text-slate-400">
                                        <FileSpreadsheet className="w-6 h-6" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-600">Drop Excel or Browse</span>
                                    <span className="text-xs text-slate-400 mt-1">Supports XLSX, XLS, CSV</span>
                                </div>
                            ) : (
                                <div className="p-4 border border-green-200 bg-green-50 rounded-2xl relative">
                                    <button onClick={resetUpload} className="absolute top-2 right-2 p-1 text-green-600 hover:bg-green-100 rounded-lg">
                                        <X className="w-4 h-4" />
                                    </button>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-green-600 shadow-sm">
                                            <FileSpreadsheet className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-green-800 truncate">{selectedFile.name}</p>
                                            <p className="text-xs text-green-600">{(selectedFile.size / 1024).toFixed(1)} KB • {previewData.length} records</p>
                                        </div>
                                    </div>
                                    {previewData.length > 0 && (
                                        <button
                                            onClick={handleSaveToDatabase}
                                            disabled={saving || !subtopic}
                                            className="w-full mt-4 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-200 disabled:opacity-50"
                                        >
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            {saving ? 'Saving...' : 'Commit to Database'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Preview Area */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[540px] flex flex-col">
                            <div className="p-6 border-b border-gray-100 bg-slate-50/50 flex justify-between items-center">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Data Preview</h3>
                                {previewData.length > 0 && <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-500">{previewData.length} Questions Found</span>}
                            </div>

                            <div className="flex-1 overflow-auto custom-scrollbar">
                                {loading ? (
                                    <div className="h-full flex flex-col items-center justify-center py-20">
                                        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                                        <p className="text-slate-500 font-medium">Parsing Excel Data...</p>
                                    </div>
                                ) : previewData.length > 0 ? (
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-white sticky top-0 z-10">
                                            <tr className="border-b border-gray-100">
                                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Question Info</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Options</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {previewData.map((row, idx) => {
                                                const q = row['Question'] || row['question'];
                                                const hasOptions = row['Option A'] && row['Option B'];
                                                const hasCorrect = row['Correct Option'];
                                                const isValid = q && hasOptions && hasCorrect;

                                                return (
                                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <p className="text-sm font-bold text-slate-700 max-w-xs truncate">{q || 'MISSING QUESTION'}</p>
                                                            <div className="flex gap-2 mt-1">
                                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">{row['Difficulty'] || 'Medium'}</span>
                                                                {row['Explanation'] && <span className="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded font-bold uppercase">Has Explanation</span>}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                                <span className={`text-[11px] ${row['Correct Option'] === 'A' ? 'text-green-600 font-bold' : 'text-slate-400'}`}>A: {row['Option A']?.toString().substring(0, 15)}...</span>
                                                                <span className={`text-[11px] ${row['Correct Option'] === 'B' ? 'text-green-600 font-bold' : 'text-slate-400'}`}>B: {row['Option B']?.toString().substring(0, 15)}...</span>
                                                                <span className={`text-[11px] ${row['Correct Option'] === 'C' ? 'text-green-600 font-bold' : 'text-slate-400'}`}>C: {row['Option C']?.toString().substring(0, 15)}...</span>
                                                                <span className={`text-[11px] ${row['Correct Option'] === 'D' ? 'text-green-600 font-bold' : 'text-slate-400'}`}>D: {row['Option D']?.toString().substring(0, 15)}...</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {isValid ? (
                                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                                            ) : (
                                                                <div className="flex items-center gap-1 text-red-500 tooltip" title="Incomplete row data">
                                                                    <AlertTriangle className="w-5 h-5" />
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center py-20 text-center px-10">
                                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                            <FileSpreadsheet className="w-10 h-10 text-slate-200" />
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-400">No data to display</h4>
                                        <p className="text-slate-300 max-w-sm">Upload an Excel file to see a preview of your questions before saving them to the database.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
