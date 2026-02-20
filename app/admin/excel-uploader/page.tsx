'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Download, FileSpreadsheet, Upload, Folder, BookOpen, Layers, CheckCircle, AlertTriangle, Save, X, AlertCircle, Info, Filter, Search, ArrowRight, ShieldCheck, Database, FileWarning, SearchCode } from 'lucide-react';
import { useLoading } from '@/lib/context/LoadingContext';

import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { useUI } from '@/lib/context/UIContext';
import { supabase } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';
import { ExcelUploadService } from '@/lib/services/excelUploadService';

export default function ExcelUploaderPage() {
    const [user, setUser] = useState<any>(null);

    // Hierarchy Data
    const [subjectsList, setSubjectsList] = useState<any[]>([]);
    const [topicsList, setTopicsList] = useState<any[]>([]);
    const [subtopicsList, setSubtopicsList] = useState<any[]>([]);
    const [allHierarchy, setAllHierarchy] = useState<{ subjects: any[], topics: any[], subtopics: any[] }>({ subjects: [], topics: [], subtopics: [] });

    // UI Configuration
    const [subject, setSubject] = useState('');
    const [topic, setTopic] = useState('');
    const [subtopic, setSubtopic] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'unidentified' | 'duplicates'>('all');

    // Upload & Analysis State
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [autoDetectMode, setAutoDetectMode] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Hierarchy Resolver State
    const [unresolvedMappings, setUnresolvedMappings] = useState<{
        subjects: { [key: string]: number | null };
        topics: { [key: string]: number | null };
    }>({ subjects: {}, topics: {} });

    // Track which indexes were unidentified during the last scan
    const [unidentifiedIndices, setUnidentifiedIndices] = useState<Set<number>>(new Set());

    // Per-row Overrides for manual resolution
    const [manualResolutions, setManualResolutions] = useState<Record<number, {
        subjId?: number;
        topicId?: number;
    }>>({});

    const [duplicateAnalysis, setDuplicateAnalysis] = useState<any>(null);
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [rejectedIndices, setRejectedIndices] = useState<Set<number>>(new Set());
    const [expandedOptions, setExpandedOptions] = useState<Set<number>>(new Set());

    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const { isSidebarCollapsed } = useUI();

    useEffect(() => {
        const currentUser = AuthService.getCurrentUser();
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('aptivo_user') : null;
        if (currentUser) setUser(currentUser);
        else if (storedUser) setUser(JSON.parse(storedUser));

        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        const { data: s } = await supabase.from('subjects').select('*').eq('is_active', true);
        const { data: t } = await supabase.from('topics').select('*, subject:subjects(name)').eq('is_active', true);

        if (s) {
            setSubjectsList(s);
            setAllHierarchy(prev => ({ ...prev, subjects: s, topics: t || [] }));
        }
    };

    const loadMissingHierarchy = async () => {
        const { data: topics } = await supabase.from('topics').select('*, subject:subjects(name)').eq('is_active', true);
        const { data: subtopics } = await supabase.from('subtopics').select('*, topic:topics(name, subject_id)').eq('is_active', true);
        setAllHierarchy(prev => ({
            ...prev,
            topics: topics || [],
            subtopics: subtopics || []
        }));
    };

    // Manual Form Selectors logic
    useEffect(() => {
        if (subject) {
            const filtered = allHierarchy.topics.filter(t => t.subject_id === parseInt(subject));
            setTopicsList(filtered);
        } else {
            setTopicsList([]);
        }
        setTopic('');
    }, [subject, allHierarchy.topics]);

    useEffect(() => {
        if (topic) {
            const filtered = allHierarchy.subtopics.filter(st => st.topic_id === parseInt(topic));
            setSubtopicsList(filtered);
        } else {
            setSubtopicsList([]);
        }
        setSubtopic('');
    }, [topic, allHierarchy.subtopics]);

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
        setGlobalLoading(true, 'Analyzing Academic Data Structure...');

        const reader = new FileReader();
        reader.onload = async (e: any) => {
            try {
                const bstr = e.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);
                setPreviewData(data);

                if (autoDetectMode) {
                    await runSmartScan(data);
                }
            } catch (err) {
                alert('Error parsing Excel file. Please use the valid template.');
                setSelectedFile(null);
            } finally {
                setGlobalLoading(false);
            }
        };

        reader.readAsBinaryString(file);
    };

    const runSmartScan = async (data: any[]) => {
        setIsAnalyzing(true);
        await loadMissingHierarchy();

        const fileSubjects = new Set<string>();
        const fileTopics = new Set<string>();

        const mcqRows = data.map(row => {
            const getVal = (patterns: string[]) => {
                const rowKeys = Object.keys(row);
                let key = rowKeys.find(k => patterns.some(p => k.toLowerCase().trim() === p.toLowerCase().trim()));
                return key ? row[key]?.toString().trim() : undefined;
            };

            const s = getVal(['subject']);
            const t = getVal(['topic']);
            if (s) fileSubjects.add(s);
            if (t) fileTopics.add(t);

            return {
                subject: s,
                topic: t,
                question: getVal(['question', 'text', 'statement']) || '',
                option_a: getVal(['option a', 'a']) || '',
                option_b: getVal(['option b', 'b']) || '',
                option_c: getVal(['option c', 'c']) || '',
                option_d: getVal(['option d', 'd']) || '',
                correct_option: (getVal(['correct', 'answer']) || 'A').toUpperCase() as any,
            };
        });

        // Map to DB IDs
        const newMap = { subjects: {} as any, topics: {} as any };
        fileSubjects.forEach(s => {
            const match = allHierarchy.subjects.find(db => db.name.toLowerCase() === s.toLowerCase());
            newMap.subjects[s] = match ? match.id : null;
        });
        fileTopics.forEach(t => {
            const match = allHierarchy.topics.find(db => db.name.toLowerCase() === t.toLowerCase());
            newMap.topics[t] = match ? match.id : null;
        });
        setUnresolvedMappings(newMap);

        // Prepare rows for duplicate validation with resolved IDs
        const rowsForValidation = mcqRows.map(row => ({
            ...row,
            subjectId: row.subject ? newMap.subjects[row.subject] : null,
            topicId: row.topic ? newMap.topics[row.topic] : null
        }));

        // Run Pre-validation Duplicate Scan
        const dupResult = await ExcelUploadService.validateDuplicates(rowsForValidation as any);
        setDuplicateAnalysis(dupResult);

        // Identify which items need resolution
        const unID = new Set<number>();
        rowsForValidation.forEach((row, idx) => {
            if (!row.subjectId || !row.topicId) unID.add(idx);
        });
        // Initialize selection (select all by default except duplicates)
        const initialSelection = new Set<number>();
        rowsForValidation.forEach((row, idx) => {
            const isDuplicate = dupResult?.items?.some((i: any) => i.index === idx);
            if (!isDuplicate) {
                initialSelection.add(idx);
            }
        });
        setSelectedRows(initialSelection);

        setIsAnalyzing(false);
    };

    const getRowValue = (row: any, patterns: string[]) => {
        const rowKeys = Object.keys(row);
        let key = rowKeys.find(k => patterns.some(p => k.toLowerCase().trim() === p.toLowerCase().trim()));
        if (!key) {
            key = rowKeys.find(k => patterns.some(p => {
                const kl = k.toLowerCase().trim();
                const pl = p.toLowerCase().trim();
                return kl.includes(pl);
            }));
        }
        return key ? row[key] : null;
    };

    // Computational derived data for table
    const processedTableData = useMemo(() => {
        return previewData
            .map((row, idx) => {
                const excelSubj = getRowValue(row, ['subject'])?.toString() || '';
                const excelTopic = getRowValue(row, ['topic'])?.toString() || '';

                const override = manualResolutions[idx] || {};
                const resolvedSubjId = override.subjId || (excelSubj ? unresolvedMappings.subjects[excelSubj] : null);
                const resolvedTopicId = override.topicId || (excelTopic ? unresolvedMappings.topics[excelTopic] : null);

                const validation = ExcelUploadService.validateMCQRow(row);
                const hierarchyValid = !autoDetectMode || (resolvedSubjId !== null && resolvedTopicId !== null);

                // Check duplicate status
                const dupInfo = duplicateAnalysis?.items?.find((item: any) => item.index === idx);

                return {
                    original: row,
                    index: idx,
                    excelSubj,
                    excelTopic,
                    resolvedSubjId,
                    resolvedTopicId,
                    isValid: validation.isValid && hierarchyValid && !dupInfo,
                    hierarchyValid,
                    isOriginallyUnidentified: unidentifiedIndices.has(idx),
                    validationErrors: validation.errors,
                    dupInfo
                };
            })
            .filter(d => !rejectedIndices.has(d.index));
    }, [previewData, unresolvedMappings, manualResolutions, autoDetectMode, duplicateAnalysis, unidentifiedIndices, rejectedIndices]);

    const filteredData = useMemo(() => {
        if (activeTab === 'unidentified') return processedTableData.filter(d => !d.hierarchyValid);
        if (activeTab === 'duplicates') return processedTableData.filter(d => !!d.dupInfo);
        return processedTableData;
    }, [processedTableData, activeTab]);

    const stats = useMemo(() => {
        const unid = processedTableData.filter(d => !d.hierarchyValid).length;
        const dups = processedTableData.filter(d => !!d.dupInfo).length;
        return { total: processedTableData.length, unidentified: unid, duplicates: dups };
    }, [processedTableData]);

    const updateManualResolution = (idx: number, field: 'subjId' | 'topicId', val: number | null) => {
        setManualResolutions(prev => ({
            ...prev,
            [idx]: { ...prev[idx], [field]: val }
        }));
    };

    const bulkApplyResolution = (excelLabel: string, type: 'subject' | 'topic', dbId: number) => {
        setUnresolvedMappings(prev => ({
            ...prev,
            [type === 'subject' ? 'subjects' : 'topics']: {
                ...prev[type === 'subject' ? 'subjects' : 'topics'],
                [excelLabel]: dbId
            }
        }));

        // Clear manual overrides if they match this label
        const updated = { ...manualResolutions };
        processedTableData.forEach(d => {
            const currentLabel = type === 'subject' ? d.excelSubj : d.excelTopic;
            if (currentLabel === excelLabel && updated[d.index]) {
                delete updated[d.index][type === 'subject' ? 'subjId' : 'topicId'];
            }
        });
        setManualResolutions(updated);
    };

    const toggleSelectAll = () => {
        if (selectedRows.size === filteredData.length) {
            setSelectedRows(new Set());
        } else {
            const newSelection = new Set(selectedRows);
            filteredData.forEach(d => newSelection.add(d.index));
            setSelectedRows(newSelection);
        }
    };

    const toggleRowSelection = (idx: number) => {
        const next = new Set(selectedRows);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        setSelectedRows(next);
    };

    const rejectAllDuplicates = () => {
        const toReject = processedTableData.filter(d => !!d.dupInfo).map(d => d.index);
        const nextRejected = new Set(rejectedIndices);
        toReject.forEach(idx => nextRejected.add(idx));

        const nextSelected = new Set(selectedRows);
        toReject.forEach(idx => nextSelected.delete(idx));

        setRejectedIndices(nextRejected);
        setSelectedRows(nextSelected);
        setActiveTab('all');
        alert(`${toReject.length} duplicates have been filtered out from the active queue.`);
    };

    const handleSaveToDatabase = async () => {
        if (!user) return alert('Session expired.');
        if (selectedRows.size === 0) return alert('No questions selected for upload.');

        if (stats.unidentified > 0 && autoDetectMode) {
            const hasUnidentifiedInSelection = processedTableData.some(d => selectedRows.has(d.index) && !d.hierarchyValid);
            if (hasUnidentifiedInSelection) {
                setActiveTab('unidentified');
                return alert(`Please resolve or de-select the unidentified items before committing.`);
            }
        }

        const mcqsToUpload = processedTableData
            .filter(d => selectedRows.has(d.index))
            .map(d => {
                const row = d.original;
                return {
                    subject: d.excelSubj,
                    topic: d.excelTopic,
                    question: getRowValue(row, ['question', 'text']) || '',
                    option_a: getRowValue(row, ['option a', 'a']) || '',
                    option_b: getRowValue(row, ['option b', 'b']) || '',
                    option_c: getRowValue(row, ['option c', 'c']) || '',
                    option_d: getRowValue(row, ['option d', 'd']) || '',
                    correct_option: (getRowValue(row, ['correct', 'answer']) || 'A').toString().toUpperCase() as any,
                    explanation: getRowValue(row, ['explanation']),
                    difficulty: (getRowValue(row, ['difficulty']) || 'medium').toString().toLowerCase() as any,
                    subjectId: autoDetectMode ? d.resolvedSubjId : parseInt(subject),
                    topicId: autoDetectMode ? d.resolvedTopicId : parseInt(topic),
                };
            });

        if (mcqsToUpload.length === 0) return alert('No valid questions to upload after duplicate filtering.');

        setGlobalLoading(true, 'Committing Verified Data...');
        try {
            const result = await ExcelUploadService.uploadMCQsWithAutoDetect(mcqsToUpload as any, user.id, selectedFile?.name || 'bulk_upload.xlsx');
            if (result.success) {
                alert(`Successfully indexed ${result.processedRows} new questions to central library.`);
                resetUpload();
            }
        } catch (err: any) {
            alert('Upload error: ' + err.message);
        } finally {
            setGlobalLoading(false);
        }
    };

    const resetUpload = () => {
        setSelectedFile(null);
        setPreviewData([]);
        setManualResolutions({});
        setDuplicateAnalysis(null);
        setRejectedIndices(new Set());
        setSelectedRows(new Set());
        setUnresolvedMappings({ subjects: {}, topics: {} });
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                'Subject': 'Computer Science',
                'Topic': 'Cloud Computing',
                'Subtopic': 'AWS Infrastructure',
                'Question': 'Which service provides virtual servers in the cloud?',
                'Option A': 'S3',
                'Option B': 'EC2',
                'Option C': 'Lambda',
                'Option D': 'RDS',
                'Correct Option': 'B',
                'Explanation': 'EC2 stands for Elastic Compute Cloud.',
                'Difficulty': 'Easy'
            }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "aptivo_mcq_template.xlsx");
    };

    return (
        <div className="min-h-screen bg-[#F9FAFB] flex font-sans">
            <Sidebar userRole="super_admin" />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name || 'Admin'} userEmail={user?.email || 'admin@aptivo.edu'} />

                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-6 sm:px-10">
                    <div className="max-w-[1600px] mx-auto">

                        {/* Interactive Status Dashboard */}
                        <div className="flex flex-col lg:flex-row justify-between items-end gap-6 mb-10">
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                    Content Ingestion <span className="text-indigo-600">Resolver</span>
                                </h1>
                                <p className="text-slate-400 mt-2 font-medium tracking-wide uppercase text-[10px]">Library Integrity Pipeline & Auditor</p>
                            </div>

                            <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-200/60 backdrop-blur-sm">
                                {[
                                    { id: 'all', label: 'All Items', count: stats.total, color: 'bg-slate-900' },
                                    { id: 'unidentified', label: 'Unidentified', count: stats.unidentified, color: 'bg-amber-500' },
                                    { id: 'duplicates', label: 'Duplicates', count: stats.duplicates, color: 'bg-rose-500' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`flex items-center gap-3 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? `${tab.color} text-white shadow-lg` : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {tab.label}
                                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-200 text-slate-500'}`}>
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                            {/* Left: Controls */}
                            <div className="xl:col-span-1 space-y-6">

                                {/* Upload Box */}
                                {!selectedFile ? (
                                    <div
                                        onDragOver={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDrop={handleDrop}
                                        onClick={() => document.getElementById('file-upload')?.click()}
                                        className={`h-64 border-2 border-dashed rounded-[32px] flex flex-col items-center justify-center transition-all cursor-pointer ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300 shadow-sm'}`}
                                    >
                                        <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} />
                                        <Upload className={`w-10 h-10 mb-4 ${dragActive ? 'text-indigo-600' : 'text-slate-300'}`} />
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-800">Assign Source File</span>
                                        <span className="text-[10px] text-slate-400 mt-1 italic">Click or drag to analyze</span>
                                    </div>
                                ) : (
                                    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 relative group">
                                        <button onClick={resetUpload} className="absolute -top-3 -right-3 p-2 bg-white border border-slate-100 rounded-full text-slate-400 hover:text-rose-500 shadow-lg">
                                            <X className="w-4 h-4" />
                                        </button>
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                                <FileSpreadsheet className="w-6 h-6" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-black text-slate-900 truncate uppercase">{selectedFile.name}</p>
                                                <p className="text-[10px] text-slate-500 font-bold">READY TO INDEX</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleSaveToDatabase}
                                            className="w-full py-4 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 active:scale-95"
                                        >
                                            Commit Changes
                                        </button>
                                    </div>
                                )}

                                {/* Validation Mode */}
                                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Layers className="w-4 h-4 text-indigo-500" /> Resolution Mode
                                        </h3>
                                        <button
                                            onClick={() => setAutoDetectMode(!autoDetectMode)}
                                            className={`relative h-6 w-11 rounded-full transition-colors ${autoDetectMode ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                        >
                                            <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${autoDetectMode ? 'translate-x-5' : ''}`} />
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                                        {autoDetectMode ? "System will scan Subject/Topic columns for automatic library placement." : "Manually map all items to a specific DB branch."}
                                    </p>

                                    {!autoDetectMode && (
                                        <div className="mt-6 space-y-4 pt-6 border-t border-slate-50">
                                            <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold" value={subject} onChange={(e) => setSubject(e.target.value)}>
                                                <option value="">Select Subject</option>
                                                {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                            <select disabled={!subject} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold disabled:opacity-50" value={topic} onChange={(e) => setTopic(e.target.value)}>
                                                <option value="">Select Topic</option>
                                                {topicsList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                <button onClick={handleDownloadTemplate} className="w-full py-3.5 border border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-white hover:border-slate-300 transition-all">
                                    <Download className="w-4 h-4" /> Download Template
                                </button>
                            </div>

                            {/* Center: Table View */}
                            <div className="xl:col-span-3">
                                <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden min-h-[600px] flex flex-col">

                                    <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100">
                                                <SearchCode className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">{activeTab === 'unidentified' ? 'Mapping Queue' : 'Activity Stream'}</h2>
                                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{activeTab === 'all' ? 'Processing all content' : activeTab === 'unidentified' ? 'Requires manual classification' : 'Filtered system duplicates'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {activeTab === 'duplicates' && stats.duplicates > 0 && (
                                                <button
                                                    onClick={rejectAllDuplicates}
                                                    className="flex items-center gap-2 px-6 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-rose-700 transition-all shadow-xl shadow-rose-100"
                                                >
                                                    Discard All Duplicates
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Global Mapping Helper - More Minimal */}
                                    {activeTab === 'unidentified' && Object.keys(unresolvedMappings.subjects).some(k => unresolvedMappings.subjects[k] === null) && (
                                        <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                {Object.entries(unresolvedMappings.subjects).filter(([_, id]) => id === null).map(([name]) => (
                                                    <div key={name} className="flex items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Map <span className="text-slate-900">"{name}"</span> to:</span>
                                                        <select
                                                            className="flex-1 bg-slate-50 text-[10px] font-bold px-4 py-2 rounded-xl outline-none border border-slate-200 focus:ring-1 focus:ring-indigo-500 transition-all"
                                                            onChange={(e) => bulkApplyResolution(name, 'subject', parseInt(e.target.value))}
                                                        >
                                                            <option value="">Choose DB Subject...</option>
                                                            {allHierarchy.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex-1 overflow-x-auto custom-scrollbar">
                                        {previewData.length > 0 ? (
                                            <table className="w-full text-left border-collapse table-fixed">
                                                <thead className="sticky top-0 bg-white z-20 border-b border-slate-100">
                                                    <tr>
                                                        <th className="w-16 px-8 py-6">
                                                            <input
                                                                type="checkbox"
                                                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                checked={filteredData.length > 0 && filteredData.every(d => selectedRows.has(d.index))}
                                                                onChange={toggleSelectAll}
                                                            />
                                                        </th>
                                                        <th className="w-[450px] px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Question Narrative</th>
                                                        <th className="w-[350px] px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hierarchy mapping</th>
                                                        <th className="w-[150px] px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Integrity</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {filteredData.map((d) => (
                                                        <tr key={d.index} className={`transition-colors ${selectedRows.has(d.index) ? 'bg-indigo-50/10' : ''}`}>
                                                            <td className="px-8 py-8 align-top">
                                                                <input
                                                                    type="checkbox"
                                                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                    checked={selectedRows.has(d.index)}
                                                                    onChange={() => toggleRowSelection(d.index)}
                                                                />
                                                            </td>
                                                            <td className="px-6 py-8 align-top">
                                                                <div className="max-w-md">
                                                                    <div className="text-[13px] font-medium text-slate-700 leading-relaxed">
                                                                        <MarkdownRenderer content={getRowValue(d.original, ['question', 'text']) || ''} />
                                                                    </div>

                                                                    {/* Options View - Sleeker */}
                                                                    <div className="mt-4">
                                                                        <button
                                                                            onClick={() => setExpandedOptions(prev => {
                                                                                const next = new Set(prev);
                                                                                if (next.has(d.index)) next.delete(d.index);
                                                                                else next.add(d.index);
                                                                                return next;
                                                                            })}
                                                                            className="flex items-center gap-2 text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-700 transition-colors"
                                                                        >
                                                                            {expandedOptions.has(d.index) ? 'Collapse Options' : 'Expand Options'}
                                                                            <ArrowRight className={`w-3 h-3 transition-transform ${expandedOptions.has(d.index) ? 'rotate-90' : ''}`} />
                                                                        </button>

                                                                        {expandedOptions.has(d.index) && (
                                                                            <div className="grid grid-cols-1 gap-1.5 mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                                                                {['A', 'B', 'C', 'D'].map(opt => {
                                                                                    const val = getRowValue(d.original, [`option ${opt.toLowerCase()}`, opt.toLowerCase()]);
                                                                                    const correct = (getRowValue(d.original, ['correct', 'answer']) || '').toString().toUpperCase() === opt;
                                                                                    return (
                                                                                        <div key={opt} className={`flex items-start gap-2 px-3 py-2 rounded-xl text-[11px] ${correct ? 'bg-emerald-50 text-emerald-700 font-bold' : 'bg-slate-50 text-slate-500'}`}>
                                                                                            <span className="opacity-40">{opt}.</span>
                                                                                            <MarkdownRenderer content={val?.toString() || '-'} />
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-8 align-top">
                                                                <div className="space-y-6">
                                                                    {/* Subject Resolution */}
                                                                    <div>
                                                                        <div className="flex justify-between items-center mb-2">
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Excel: {d.excelSubj}</span>
                                                                            {d.resolvedSubjId && !manualResolutions[d.index]?.subjId && (
                                                                                <span className="text-[8px] font-black text-emerald-600 uppercase bg-emerald-50 px-1.5 py-0.5 rounded">Auto-Matched</span>
                                                                            )}
                                                                        </div>

                                                                        <div className="flex gap-2 items-center">
                                                                            <select
                                                                                className={`flex-1 bg-white border ${d.resolvedSubjId ? 'border-slate-200' : 'border-amber-300'} text-[10px] font-bold rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-indigo-500 transition-all`}
                                                                                value={d.resolvedSubjId || ''}
                                                                                onChange={(e) => updateManualResolution(d.index, 'subjId', parseInt(e.target.value) || null)}
                                                                            >
                                                                                <option value="">Map Subject...</option>
                                                                                {allHierarchy.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                                            </select>
                                                                            {manualResolutions[d.index]?.subjId && (
                                                                                <button
                                                                                    title="Apply to all items with same label"
                                                                                    onClick={() => bulkApplyResolution(d.excelSubj, 'subject', manualResolutions[d.index]!.subjId!)}
                                                                                    className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-sm border border-amber-100"
                                                                                >
                                                                                    <Layers className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Topic Resolution */}
                                                                    <div>
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-2">Excel: {d.excelTopic}</p>
                                                                        <div className="flex gap-2 items-center">
                                                                            <select
                                                                                disabled={!d.resolvedSubjId}
                                                                                className={`flex-1 bg-white border ${d.resolvedTopicId ? 'border-slate-200' : 'border-amber-300'} text-[10px] font-bold rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-40 transition-all`}
                                                                                value={d.resolvedTopicId || ''}
                                                                                onChange={(e) => updateManualResolution(d.index, 'topicId', parseInt(e.target.value) || null)}
                                                                            >
                                                                                <option value="">Map Topic...</option>
                                                                                {allHierarchy.topics.filter(t => t.subject_id === d.resolvedSubjId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                                            </select>
                                                                            {manualResolutions[d.index]?.topicId && (
                                                                                <button
                                                                                    title="Apply to all items with same label"
                                                                                    onClick={() => bulkApplyResolution(d.excelTopic, 'topic', manualResolutions[d.index]!.topicId!)}
                                                                                    className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-sm border border-amber-100"
                                                                                >
                                                                                    <Layers className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-8 align-top text-right">
                                                                <div className="flex flex-col items-end gap-3">
                                                                    {d.isValid ? (
                                                                        <div className="flex items-center gap-2 text-emerald-600 font-black text-[9px] uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                                                            <CheckCircle className="w-3.5 h-3.5" /> Ready
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex flex-col items-end gap-1.5">
                                                                            {!d.hierarchyValid && (
                                                                                <div className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full border border-amber-100 text-[8px] font-black uppercase tracking-widest">Unresolved</div>
                                                                            )}
                                                                            {d.dupInfo && (
                                                                                <div className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full border border-rose-100 text-[8px] font-black uppercase tracking-widest">Duplicate</div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div className="h-[600px] flex flex-col items-center justify-center p-12 text-center">
                                                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                                    <FileWarning className="w-10 h-10 text-slate-200" />
                                                </div>
                                                <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest">Library Analyzer Offline</h3>
                                                <p className="text-slate-400 max-w-sm mt-2 font-medium">Please link a spreadsheet to initiate the hierarchical resolution pipeline.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

