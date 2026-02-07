'use client';

import React, { useState } from 'react';
import { Upload, FileSpreadsheet, FileText, CheckCircle, XCircle, AlertTriangle, Download, Eye } from 'lucide-react';
import { ExcelUploadService, MCQRow } from '@/lib/services/excelUploadService';
import { MarkdownService } from '@/lib/services/markdownService';
import { ContentService } from '@/lib/services/contentService';
import { AuthService } from '@/lib/services/authService';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';


export default function UniversalUploader() {
    const [activeTab, setActiveTab] = useState<'excel' | 'markdown'>('excel');

    // Common State
    const [subjects, setSubjects] = useState<any[]>([]);
    const [topics, setTopics] = useState<any[]>([]);
    const [subtopics, setSubtopics] = useState<any[]>([]);

    const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
    const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
    const [selectedSubtopic, setSelectedSubtopic] = useState<number | null>(null);

    const [file, setFile] = useState<File | null>(null);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'parsing' | 'previewing' | 'uploading' | 'success' | 'error'>('idle');
    const [uploadResult, setUploadResult] = useState<any>(null);

    // Excel Specific State
    const [parsedMCQs, setParsedMCQs] = useState<MCQRow[]>([]);
    const [validationErrors, setValidationErrors] = useState<any[]>([]);

    // Markdown Specific State
    const [markdownContent, setMarkdownContent] = useState('');
    const [markdownPreview, setMarkdownPreview] = useState(false);

    // Load subjects on mount
    React.useEffect(() => {
        loadSubjects();
    }, []);

    const loadSubjects = async () => {
        const data = await ContentService.getAllSubjects();
        setSubjects(data);
    };

    const loadTopics = async (subjectId: number) => {
        const data = await ContentService.getTopicsBySubject(subjectId);
        setTopics(data);
        setSubtopics([]);
    };

    const loadSubtopics = async (topicId: number) => {
        const data = await ContentService.getSubtopicsByTopic(topicId);
        setSubtopics(data);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setUploadStatus('parsing');
        setUploadResult(null);

        if (activeTab === 'excel') {
            // Handle Excel
            const validation = ExcelUploadService.validateFile(selectedFile);
            if (!validation.valid) {
                alert(validation.error);
                setUploadStatus('idle');
                return;
            }

            const { data, errors } = await ExcelUploadService.parseExcelFile(selectedFile);
            setParsedMCQs(data);
            setValidationErrors(errors);

            if (errors.length > 0) {
                setUploadStatus('error');
            } else {
                setUploadStatus('previewing');
            }

        } else {
            // Handle Markdown
            const validation = MarkdownService.validateFile(selectedFile);
            if (!validation.valid) {
                alert(validation.error);
                setUploadStatus('idle');
                return;
            }

            try {
                const content = await MarkdownService.readMarkdownFile(selectedFile);
                setMarkdownContent(content);
                setUploadStatus('previewing');
            } catch (err) {
                alert('Failed to read file');
                setUploadStatus('error');
            }
        }
    };

    const handleUpload = async () => {
        if (!selectedSubtopic) {
            alert('Please select a subtopic');
            return;
        }

        const user = AuthService.getCurrentUser();
        if (!user) {
            alert('Please login to upload content');
            return;
        }

        setUploadStatus('uploading');

        if (activeTab === 'excel') {
            const result = await ExcelUploadService.uploadMCQs(
                parsedMCQs,
                selectedSubtopic,
                user.id,
                file?.name || 'unknown.xlsx'
            );
            setUploadResult(result);
            setUploadStatus(result.success ? 'success' : 'error');
        } else {
            const result = await MarkdownService.updateMarkdown(
                selectedSubtopic,
                markdownContent
            );
            setUploadResult({
                success: result.success,
                message: result.success ? 'Markdown content updated successfully' : result.error
            });
            setUploadStatus(result.success ? 'success' : 'error');
        }
    };

    const resetUpload = () => {
        setFile(null);
        setParsedMCQs([]);
        setValidationErrors([]);
        setMarkdownContent('');
        setUploadStatus('idle');
        setUploadResult(null);
        setSelectedSubject(null);
        setSelectedTopic(null);
        setSelectedSubtopic(null);
    };

    const downloadTemplate = () => {
        if (activeTab === 'excel') {
            const template = `question,image_url,option_a,option_b,option_c,option_d,correct_option,explanation,explanation_url,difficulty
What is 2+2?,https://example.com/image.jpg,2,3,4,5,C,Two plus two equals four,https://example.com/explain,easy
Which planet is closest to the Sun?,,Mercury,Venus,Earth,Mars,A,Mercury is the first planet from the Sun,,medium`;

            const blob = new Blob([template], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'mcq_upload_template.csv';
            a.click();
        } else {
            const template = `# Study Guide Title

## Introduction
Write your introduction here...

## Key Concepts
- Concept 1
- Concept 2

![Diagram Name](https://example.com/image.jpg)

## Summary
Conclusion here...`;

            const blob = new Blob([template], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'content_template.md';
            a.click();
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="glass-surface p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Content Uploader</h1>
                        <p className="text-gray-600">Upload MCQs or Study Material to your curriculum</p>
                    </div>
                    <button onClick={downloadTemplate} className="btn btn-secondary">
                        <Download className="w-4 h-4" />
                        Download {activeTab === 'excel' ? 'CSV' : 'MD'} Template
                    </button>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-4 mb-8">
                    <button
                        onClick={() => { setActiveTab('excel'); resetUpload(); }}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'excel'
                            ? 'bg-primary text-white shadow-lg shadow-primary/25'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <FileSpreadsheet className="w-5 h-5" />
                        Excel MCQs
                    </button>
                    <button
                        onClick={() => { setActiveTab('markdown'); resetUpload(); }}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'markdown'
                            ? 'bg-secondary text-white shadow-lg shadow-secondary/25'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        <FileText className="w-5 h-5" />
                        Markdown Content
                    </button>
                </div>

                {/* Content Hierarchy Selection */}
                {uploadStatus === 'idle' && (
                    <div className="mb-8 p-6 bg-gray-50/50 rounded-xl border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Select Target Subtopic</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Subject */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                                <select
                                    value={selectedSubject || ''}
                                    onChange={(e) => {
                                        const id = Number(e.target.value);
                                        setSelectedSubject(id);
                                        setSelectedTopic(null);
                                        setSelectedSubtopic(null);
                                        loadTopics(id);
                                    }}
                                    className="input bg-white"
                                >
                                    <option value="">Select Subject</option>
                                    {subjects.map(subject => (
                                        <option key={subject.id} value={subject.id}>{subject.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Topic */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
                                <select
                                    value={selectedTopic || ''}
                                    onChange={(e) => {
                                        const id = Number(e.target.value);
                                        setSelectedTopic(id);
                                        setSelectedSubtopic(null);
                                        loadSubtopics(id);
                                    }}
                                    className="input bg-white"
                                    disabled={!selectedSubject}
                                >
                                    <option value="">Select Topic</option>
                                    {topics.map(topic => (
                                        <option key={topic.id} value={topic.id}>{topic.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Subtopic */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Subtopic</label>
                                <select
                                    value={selectedSubtopic || ''}
                                    onChange={(e) => setSelectedSubtopic(Number(e.target.value))}
                                    className="input bg-white"
                                    disabled={!selectedTopic}
                                >
                                    <option value="">Select Subtopic</option>
                                    {subtopics.map(subtopic => (
                                        <option key={subtopic.id} value={subtopic.id}>{subtopic.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* File Upload Area */}
                {uploadStatus === 'idle' && selectedSubtopic && (
                    <div className="animate-fade-in">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">2. Upload File</h3>
                        <div className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer group ${activeTab === 'excel' ? 'border-primary/30 hover:border-primary' : 'border-secondary/30 hover:border-secondary'
                            }`}>
                            <input
                                type="file"
                                accept={activeTab === 'excel' ? ".xlsx,.xls" : ".md,.mdx,.markdown"}
                                onChange={handleFileSelect}
                                className="hidden"
                                id="file-upload"
                            />
                            <label htmlFor="file-upload" className="cursor-pointer w-full h-full block">
                                {activeTab === 'excel' ? (
                                    <FileSpreadsheet className="w-16 h-16 text-primary/40 group-hover:text-primary transition-colors mx-auto mb-4" />
                                ) : (
                                    <FileText className="w-16 h-16 text-secondary/40 group-hover:text-secondary transition-colors mx-auto mb-4" />
                                )}
                                <p className="text-lg font-medium text-gray-900 mb-2">
                                    Click to upload {activeTab === 'excel' ? 'Excel Spreadsheet' : 'Markdown File'}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {activeTab === 'excel' ? 'Supports .xlsx, .xls (max 10MB)' : 'Supports .md, .mdx (max 5MB)'}
                                </p>
                            </label>
                        </div>
                    </div>
                )}

                {/* Preview Section */}
                {uploadStatus === 'previewing' && (
                    <div className="animate-slide-in">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Preview {activeTab === 'excel' ? 'MCQs' : 'Content'}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {activeTab === 'excel'
                                        ? `Found ${parsedMCQs.length} items`
                                        : `${markdownContent.length} characters`}
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={resetUpload} className="btn btn-secondary">Cancel</button>
                                <button onClick={handleUpload} className="btn btn-primary">
                                    <Upload className="w-4 h-4" />
                                    Confirm Upload
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-6 max-h-[500px] overflow-y-auto shadow-inner">
                            {activeTab === 'excel' ? (
                                <div className="space-y-4">
                                    {ExcelUploadService.getPreviewData(parsedMCQs).map((mcq, index) => (
                                        <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                            <p className="font-medium text-gray-900 mb-3">{index + 1}. {mcq.question}</p>
                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                {['A', 'B', 'C', 'D'].map((opt) => (
                                                    <div key={opt} className={`p-2 rounded text-sm ${mcq.correct_option === opt ? 'bg-green-100 border border-green-200 text-green-800' : 'bg-white border border-gray-200'
                                                        }`}>
                                                        <span className="font-bold mr-2">{opt})</span>
                                                        {mcq[`option_${opt.toLowerCase()}` as keyof MCQRow]}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-2 mt-2">
                                                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                                                    {mcq.difficulty || 'medium'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <article className="prose prose-slate max-w-none">
                                    <MarkdownRenderer content={markdownContent} />

                                </article>
                            )}
                        </div>
                    </div>
                )}

                {/* Success/Error States */}
                {uploadStatus === 'success' && (
                    <div className="text-center py-12 animate-scale-in">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Upload Successful!</h3>
                        <p className="text-gray-600 mb-6">
                            {activeTab === 'excel'
                                ? `Successfully processed ${uploadResult?.processedRows} MCQs`
                                : 'Study content has been updated successfully'}
                        </p>
                        <button onClick={resetUpload} className="btn btn-primary">
                            Upload Another
                        </button>
                    </div>
                )}

                {/* Loading State */}
                {(uploadStatus === 'parsing' || uploadStatus === 'uploading') && (
                    <div className="text-center py-20">
                        <div className="spinner w-12 h-12 mx-auto mb-4"></div>
                        <p className="text-lg font-medium text-gray-900">
                            {uploadStatus === 'parsing' ? 'Processing File...' : 'Uploading to Database...'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
