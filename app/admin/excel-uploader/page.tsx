'use client';

import React, { useState } from 'react';
import { Download, FileSpreadsheet, Upload, Folder, BookOpen, Layers, CheckCircle, AlertTriangle, Save, Loader2, X } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { useUI } from '@/lib/context/UIContext';
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
    const { isSidebarCollapsed } = useUI();

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

    const convertDriveLink = (url: string) => {
        if (!url) return '';
        if (typeof url !== 'string') return '';
        if (url.includes('drive.google.com')) {
            const idMatch = url.match(/\/d\/(.+?)\//) || url.match(/id=(.+?)(&|$)/);
            if (idMatch && idMatch[1]) {
                return `https://lh3.googleusercontent.com/u/0/d/${idMatch[1]}=w1000`;
            }
        }
        return url;
    };

    const handleSaveToDatabase = async () => {
        if (!user) {
            alert('User session not found. Please log in again.');
            return;
        }
        if (!topic) {
            alert('Please select a topic first.');
            return;
        }
        if (!subtopic && subtopic !== 'no_subtopic') {
            alert('Please select a Subtopic first.');
            return;
        }
        if (previewData.length === 0) {
            alert('No data found in the file.');
            return;
        }

        setSaving(true);
        try {
            let targetSubtopicId = subtopic;

            // Handle "No Subtopic" case
            if (subtopic === 'no_subtopic') {
                const { data: existing } = await supabase
                    .from('subtopics')
                    .select('id')
                    .eq('topic_id', topic)
                    .eq('name', 'General')
                    .single();

                if (existing) {
                    targetSubtopicId = existing.id.toString();
                } else {
                    const { data: created, error: createErr } = await supabase
                        .from('subtopics')
                        .insert({ topic_id: parseInt(topic), name: 'General' })
                        .select('id')
                        .single();

                    if (createErr) throw createErr;
                    targetSubtopicId = created.id.toString();
                }
            }

            // 1. Create upload record
            const { data: uploadRec, error: uploadErr } = await supabase.from('uploads').insert({
                upload_type: 'mcq_excel',
                file_name: selectedFile?.name,
                subtopic_id: parseInt(targetSubtopicId),
                status: 'processing',
                total_rows: previewData.length,
                created_by: user.id
            }).select().single();

            if (uploadErr) throw uploadErr;

            // 2. Map and Insert MCQs
            const mcqsToInsert = previewData.map(row => {
                // Normalize keys (smart case)
                const getVal = (patterns: string[]) => {
                    const key = Object.keys(row).find(k => patterns.some(p => k.toLowerCase().includes(p.toLowerCase())));
                    return key ? row[key] : null;
                };

                const q = getVal(['question', 'text', 'statement']);
                const a = getVal(['option a', 'a', 'option_a']);
                const b = getVal(['option b', 'b', 'option_b']);
                const c = getVal(['option c', 'c', 'option_c']);
                const d = getVal(['option d', 'd', 'option_d']);
                const correct = (getVal(['correct', 'answer']) || 'A')?.toString().toUpperCase().trim();
                const explanation = getVal(['explanation', 'reason', 'justify']) || '';
                const rawDifficulty = (getVal(['difficulty', 'level']) || 'medium').toString().toLowerCase();

                // Image fields
                let qImage = getVal(['question image', 'q image', 'image_url', 'figure']) || '';
                let eImage = getVal(['explanation image', 'e image', 'explanation_url', 'rationale image']) || '';

                // Convert Drive links if present
                if (qImage) qImage = convertDriveLink(qImage.toString());
                if (eImage) eImage = convertDriveLink(eImage.toString());

                // Validate difficulty enum
                const difficulty = ['easy', 'medium', 'hard'].includes(rawDifficulty) ? rawDifficulty : 'medium';

                return {
                    subtopic_id: parseInt(targetSubtopicId),
                    question: q,
                    option_a: a,
                    option_b: b,
                    option_c: c,
                    option_d: d,
                    correct_option: correct,
                    explanation: explanation,
                    difficulty: difficulty,
                    question_image_url: qImage || null,
                    explanation_url: eImage || null,
                    upload_id: uploadRec.id
                };
            }).filter(item => item.question && item.option_a && item.correct_option);

            if (mcqsToInsert.length === 0) {
                throw new Error('No valid questions found. Check your column headers (Question, Option A, Correct Option are required).');
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
                'Difficulty': 'Easy',
                'Question Image': 'https://example.com/question.jpg',
                'Explanation Image': 'https://example.com/explanation.jpg'
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
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="super_admin" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name || 'Admin'} userEmail={user?.email || 'admin@aptivo.edu'} />

                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Excel MCQ Uploader</h1>
                            <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium">Bulk upload questions with automatic validation.</p>
                        </div>
                        <button
                            onClick={handleDownloadTemplate}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-green-50 text-green-600 font-bold rounded-xl hover:bg-green-100 transition-all border border-green-200 active:scale-95 text-sm"
                        >
                            <Download className="w-5 h-5" />
                            <span>Template</span>
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
                                            <option value="no_subtopic" className="text-primary font-bold">-- NO SUBTOPIC (Topic Level) --</option>
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
                                                disabled={saving || (!subtopic && subtopic !== 'no_subtopic')}
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
                                                    const q = (row as any)['Question'] || (row as any)['question'];
                                                    const hasOptions = (row as any)['Option A'] && (row as any)['Option B'];
                                                    const hasCorrect = (row as any)['Correct Option'];
                                                    const isValid = q && hasOptions && hasCorrect;

                                                    return (
                                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <p className="text-sm font-bold text-slate-700 max-w-xs truncate">{q || 'MISSING QUESTION'}</p>
                                                                <div className="flex gap-2 mt-1">
                                                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">{(row as any)['Difficulty'] || 'Medium'}</span>
                                                                    {(row as any)['Explanation'] && <span className="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded font-bold uppercase">Has Explanation</span>}
                                                                    {((row as any)['Question Image'] || (row as any)['question image'] || (row as any)['image_url'] || (row as any)['Figure']) && <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-bold uppercase">Q-Image</span>}
                                                                    {((row as any)['Explanation Image'] || (row as any)['explanation image'] || (row as any)['explanation_url'] || (row as any)['Rationale']) && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold uppercase">E-Image</span>}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                                    <span className={`text-[11px] ${(row as any)['Correct Option'] === 'A' ? 'text-green-600 font-bold' : 'text-slate-400'}`}>A: {(row as any)['Option A']?.toString().substring(0, 15)}...</span>
                                                                    <span className={`text-[11px] ${(row as any)['Correct Option'] === 'B' ? 'text-green-600 font-bold' : 'text-slate-400'}`}>B: {(row as any)['Option B']?.toString().substring(0, 15)}...</span>
                                                                    <span className={`text-[11px] ${(row as any)['Correct Option'] === 'C' ? 'text-green-600 font-bold' : 'text-slate-400'}`}>C: {(row as any)['Option C']?.toString().substring(0, 15)}...</span>
                                                                    <span className={`text-[11px] ${(row as any)['Correct Option'] === 'D' ? 'text-green-600 font-bold' : 'text-slate-400'}`}>D: {(row as any)['Option D']?.toString().substring(0, 15)}...</span>
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
        </div>
    );
}
