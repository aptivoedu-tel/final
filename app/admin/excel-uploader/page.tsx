'use client';

import React, { useState } from 'react';
import { Download, FileSpreadsheet, Upload, Folder, BookOpen, Layers, CheckCircle, AlertTriangle, Save, X } from 'lucide-react';
import { useLoading } from '@/lib/context/LoadingContext';

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
    const [autoDetectMode, setAutoDetectMode] = useState(false);
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
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
        setGlobalLoading(true, 'Parsing Academic Content Data...');


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
                setGlobalLoading(false);
            }
        };

        reader.readAsBinaryString(file);
    };

    const handleSaveToDatabase = async () => {
        if (!user) {
            alert('User session not found. Please log in again.');
            return;
        }

        if (previewData.length === 0) {
            alert('No data found in the file.');
            return;
        }

        // Validate selection if not in auto-detect mode
        if (!autoDetectMode) {
            if (!topic) {
                alert('Please select a topic first.');
                return;
            }
            if (!subtopic && subtopic !== 'no_subtopic') {
                alert('Please select a Subtopic first.');
                return;
            }
        }

        setGlobalLoading(true, 'Ingesting Content into Central Repository...');
        try {
            if (autoDetectMode) {
                // Use the new Auto-Detect logic from service
                const { ExcelUploadService } = await import('@/lib/services/excelUploadService');

                // Map the raw preview data to MCQRow objects for the service
                const mcqRows = previewData.map(row => {
                    const getVal = (patterns: string[]) => {
                        const key = Object.keys(row).find(k => patterns.some(p => k.toLowerCase().includes(p.toLowerCase())));
                        return key ? row[key]?.toString() : undefined;
                    };

                    return {
                        subject: getVal(['subject']),
                        topic: getVal(['topic']),
                        subtopic: getVal(['subtopic']),
                        question: getVal(['question', 'text', 'statement']) || '',
                        option_a: getVal(['option a', 'option_a', 'a']) || '',
                        option_b: getVal(['option b', 'option_b', 'b']) || '',
                        option_c: getVal(['option c', 'option_c', 'c']) || '',
                        option_d: getVal(['option d', 'option_d', 'd']) || '',
                        correct_option: (getVal(['correct', 'answer']) || 'A').toUpperCase() as any,
                        explanation: getVal(['explanation', 'reason']),
                        difficulty: (getVal(['difficulty', 'level']) || 'medium').toLowerCase() as any,
                        image_url: getVal(['question image', 'image_url', 'figure']),
                        explanation_url: getVal(['explanation image', 'explanation_url'])
                    };
                });

                const result = await ExcelUploadService.uploadMCQsWithAutoDetect(
                    mcqRows,
                    user.id,
                    selectedFile?.name || 'bulk_upload.xlsx'
                );

                if (result.success) {
                    alert(`Successfully imported ${result.processedRows} questions!`);
                } else if (result.processedRows > 0) {
                    alert(`Imported ${result.processedRows} questions, but ${result.failedRows} failed. Check the upload logs for details.`);
                } else {
                    throw new Error(result.errors[0]?.message || 'Upload failed');
                }
            } else {
                // Original Manual Logic (Legacy Support in UI)
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

                // Map and Insert
                const mcqsToInsert = previewData.map(row => {
                    const getVal = (patterns: string[]) => {
                        const key = Object.keys(row).find(k => patterns.some(p => k.toLowerCase().includes(p.toLowerCase())));
                        return key ? row[key] : null;
                    };

                    return {
                        subtopic_id: parseInt(targetSubtopicId),
                        question: getVal(['question', 'text', 'statement']),
                        option_a: getVal(['option a', 'a', 'option_a']),
                        option_b: getVal(['option b', 'b', 'option_b']),
                        option_c: getVal(['option c', 'c', 'option_c']),
                        option_d: getVal(['option d', 'd', 'option_d']),
                        correct_option: (getVal(['correct', 'answer']) || 'A')?.toString().toUpperCase().trim(),
                        explanation: getVal(['explanation', 'reason']) || '',
                        difficulty: (getVal(['difficulty', 'level']) || 'medium').toString().toLowerCase(),
                        upload_id: null, // Will be set if needed
                        is_active: true
                    };
                }).filter(item => item.question && item.option_a);

                const { error: mcqErr } = await supabase.from('mcqs').insert(mcqsToInsert);
                if (mcqErr) throw mcqErr;

                alert(`Successfully imported ${mcqsToInsert.length} questions!`);
            }

            setPreviewData([]);
            setSelectedFile(null);
            setSubject('');
        } catch (err: any) {
            console.error(err);
            alert('Upload failed: ' + err.message);
        } finally {
            setGlobalLoading(false);
        }
    };


    const handleDownloadTemplate = () => {
        const templateData = [
            {
                'Subject': 'Mathematics',
                'Topic': 'Algebra',
                'Subtopic': 'Linear Equations',
                'Question': 'Solve for x: 2x + 5 = 15',
                'Option A': '5',
                'Option B': '10',
                'Option C': '7.5',
                'Option D': '2.5',
                'Correct Option': 'A',
                'Explanation': '2x = 10, so x = 5',
                'Difficulty': 'Easy',
                'Question Image': '',
                'Explanation Image': ''
            },
            {
                'Subject': 'English',
                'Topic': 'Grammar',
                'Subtopic': '',
                'Question': 'Identify the verb in: "The cat runs fast."',
                'Option A': 'Cat',
                'Option B': 'Runs',
                'Option C': 'Fast',
                'Option D': 'The',
                'Correct Option': 'B',
                'Explanation': '"Runs" is the action word.',
                'Difficulty': 'Medium',
                'Question Image': '',
                'Explanation Image': ''
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "MCQ Template");
        XLSX.writeFile(wb, "aptivo_smart_mcq_template.xlsx");
    };

    const resetUpload = () => {
        setSelectedFile(null);
        setPreviewData([]);
    };

    if (loading) return null;

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
                            <span>Download Template</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left: Configuration & Upload */}
                        <div className="lg:col-span-1 space-y-6">

                            {/* Smart Mode Toggle */}
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 bg-gradient-to-br from-white to-teal-50/30">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-teal-500" /> Smart Mode
                                    </h3>
                                    <button
                                        onClick={() => setAutoDetectMode(!autoDetectMode)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${autoDetectMode ? 'bg-teal-600' : 'bg-slate-200'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoDetectMode ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    {autoDetectMode
                                        ? "Hierarchy will be auto-detected from 'Subject', 'Topic', and 'Subtopic' columns in your file."
                                        : "Manually select the target subtopic below for all questions in the file."
                                    }
                                </p>
                            </div>

                            {/* Manual Selection (Visible only when Smart Mode is OFF) */}
                            {!autoDetectMode && (
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-300">
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
                            )}

                            {/* Dropzone */}
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
                                    <Upload className="w-4 h-4" /> {autoDetectMode ? '1.' : '2.'} Upload File
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
                                                className="w-full mt-4 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-100"
                                            >
                                                <Save className="w-4 h-4" />
                                                Commit to Repository
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
                                        <div className="h-full flex flex-col items-center justify-center py-20 animate-pulse">
                                            <FileSpreadsheet className="w-10 h-10 text-teal-400 mb-4" />
                                            <p className="text-slate-500 font-medium">Data Analysis in Progress...</p>
                                        </div>
                                    ) : previewData.length > 0 ? (


                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-white sticky top-0 z-10">
                                                <tr className="border-b border-gray-100">
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Hierachy & Question</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Options</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {previewData.map((row, idx) => {
                                                    const getVal = (patterns: string[]) => {
                                                        const key = Object.keys(row).find(k => patterns.some(p => k.toLowerCase().includes(p.toLowerCase())));
                                                        return key ? row[key] : null;
                                                    };

                                                    const subj = getVal(['subject']);
                                                    const top = getVal(['topic']);
                                                    const sub = getVal(['subtopic']);
                                                    const q = getVal(['question', 'text', 'statement']);
                                                    const hasOptions = getVal(['option a', 'a']) && getVal(['option b', 'b']);
                                                    const hasCorrect = getVal(['correct', 'answer']);

                                                    const hierarchyValid = !autoDetectMode || (subj && top);
                                                    const dataValid = q && hasOptions && hasCorrect;
                                                    const isValid = hierarchyValid && dataValid;

                                                    return (
                                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                {autoDetectMode && (
                                                                    <div className="flex flex-wrap gap-1 mb-2">
                                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${subj ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>{subj || 'No Subject'}</span>
                                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${top ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'}`}>{top || 'No Topic'}</span>
                                                                        {sub && <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-bold uppercase">{sub}</span>}
                                                                    </div>
                                                                )}
                                                                <p className="text-sm font-bold text-slate-700 max-w-xs truncate">{q || 'MISSING QUESTION'}</p>
                                                                <div className="flex gap-2 mt-1">
                                                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">{getVal(['difficulty']) || 'Medium'}</span>
                                                                    {getVal(['explanation']) && <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold uppercase">Explanation</span>}
                                                                    {getVal(['image', 'url', 'figure']) && <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-bold uppercase">Image</span>}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                                    <span className={`text-[11px] ${hasCorrect?.toString().toUpperCase().trim() === 'A' ? 'text-green-600 font-bold' : 'text-slate-400'}`}>A: {getVal(['option a', 'a'])?.toString().substring(0, 15)}...</span>
                                                                    <span className={`text-[11px] ${hasCorrect?.toString().toUpperCase().trim() === 'B' ? 'text-green-600 font-bold' : 'text-slate-400'}`}>B: {getVal(['option b', 'b'])?.toString().substring(0, 15)}...</span>
                                                                    <span className={`text-[11px] ${hasCorrect?.toString().toUpperCase().trim() === 'C' ? 'text-green-600 font-bold' : 'text-slate-400'}`}>C: {getVal(['option c', 'c'])?.toString().substring(0, 15)}...</span>
                                                                    <span className={`text-[11px] ${hasCorrect?.toString().toUpperCase().trim() === 'D' ? 'text-green-600 font-bold' : 'text-slate-400'}`}>D: {getVal(['option d', 'd'])?.toString().substring(0, 15)}...</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                {isValid ? (
                                                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                                                ) : (
                                                                    <div className="flex items-center gap-1 text-red-500 group relative">
                                                                        <AlertTriangle className="w-5 h-5" />
                                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 p-2 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            {!dataValid ? 'Incomplete question data' : 'Missing Subject/Topic'}
                                                                        </div>
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
