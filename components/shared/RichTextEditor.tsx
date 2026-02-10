'use client';

import React, { useRef } from 'react';
import {
    Bold, Italic, List, Heading1, Heading2, Quote, Code,
    Link as LinkIcon, Table as TableIcon, Image as ImageIcon,
    Eye, Edit3, Columns
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import { supabase } from '@/lib/supabase/client';
import { useLoading } from '@/lib/context/LoadingContext';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    height?: string;
    showPreviewInitially?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
    value,
    onChange,
    placeholder = 'Type here...',
    label,
    height = 'h-48',
    showPreviewInitially = false
}) => {
    const [viewMode, setViewMode] = React.useState<'edit' | 'split' | 'preview'>(showPreviewInitially ? 'preview' : 'edit');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { setLoading: setGlobalLoading } = useLoading();

    const insertFormat = (type: string) => {
        if (!textareaRef.current) return;
        const textarea = textareaRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const beforeSelection = text.substring(0, start);
        const selection = text.substring(start, end);
        const afterSelection = text.substring(end);

        let before = '', after = '';

        switch (type) {
            case 'bold': before = '**'; after = '**'; break;
            case 'italic': before = '_'; after = '_'; break;
            case 'h1': before = '# '; after = ''; break;
            case 'h2': before = '## '; after = ''; break;
            case 'ul': before = '- '; after = ''; break;
            case 'ol': before = '1. '; after = ''; break;
            case 'quote': before = '> '; after = ''; break;
            case 'code': before = '`'; after = '`'; break;
            case 'codeblock': before = '```\n'; after = '\n```'; break;
            case 'link': before = '['; after = '](url)'; break;
            case 'image': before = '!['; after = '](url)'; break;
            case 'table':
                before = '\n| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |\n';
                after = '';
                break;
            case 'math': before = '$'; after = '$'; break;
            case 'mathblock': before = '\n$$\n'; after = '\n$$\n'; break;
        }

        const newText = beforeSelection + before + selection + after + afterSelection;
        onChange(newText);

        setTimeout(() => {
            textarea.focus();
            if (selection.length > 0) {
                textarea.setSelectionRange(start + before.length, end + before.length);
            } else {
                textarea.setSelectionRange(start + before.length, start + before.length);
            }
        }, 0);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setGlobalLoading(true, 'Uploading Asset...');
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const filePath = `questions/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('lessons') // Reusing lessons bucket
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('lessons')
                .getPublicUrl(filePath);

            const imageMarkdown = `\n![Image Description](${publicUrl})\n`;
            onChange(value + imageMarkdown);
        } catch (error: any) {
            alert('Error uploading image: ' + error.message);
        } finally {
            setGlobalLoading(false);
            if (e.target) e.target.value = '';
        }
    };

    return (
        <div className="flex flex-col w-full border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm transition-all focus-within:ring-2 focus-within:ring-teal-500/10 focus-within:border-teal-500/50">
            {/* Toolbar */}
            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1">
                    <button type="button" onClick={() => insertFormat('bold')} className="p-1.5 hover:bg-white rounded text-slate-500 hover:text-teal-600 transition-colors" title="Bold"><Bold className="w-4 h-4" /></button>
                    <button type="button" onClick={() => insertFormat('italic')} className="p-1.5 hover:bg-white rounded text-slate-500 hover:text-teal-600 transition-colors" title="Italic"><Italic className="w-4 h-4" /></button>
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                    <button type="button" onClick={() => insertFormat('h1')} className="p-1.5 hover:bg-white rounded text-slate-500 hover:text-teal-600 transition-colors" title="Heading 1"><Heading1 className="w-4 h-4" /></button>
                    <button type="button" onClick={() => insertFormat('h2')} className="p-1.5 hover:bg-white rounded text-slate-500 hover:text-teal-600 transition-colors" title="Heading 2"><Heading2 className="w-4 h-4" /></button>
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                    <button type="button" onClick={() => insertFormat('ul')} className="p-1.5 hover:bg-white rounded text-slate-500 hover:text-teal-600 transition-colors" title="List"><List className="w-4 h-4" /></button>
                    <button type="button" onClick={() => insertFormat('quote')} className="p-1.5 hover:bg-white rounded text-slate-500 hover:text-teal-600 transition-colors" title="Quote"><Quote className="w-4 h-4" /></button>
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                    <button type="button" onClick={() => insertFormat('code')} className="p-1.5 hover:bg-white rounded text-slate-500 hover:text-teal-600 transition-colors" title="Code"><Code className="w-4 h-4" /></button>
                    <button type="button" onClick={() => insertFormat('link')} className="p-1.5 hover:bg-white rounded text-slate-500 hover:text-teal-600 transition-colors" title="Link"><LinkIcon className="w-4 h-4" /></button>
                    <div className="relative">
                        <button type="button" onClick={() => document.getElementById('rich-image-upload')?.click()} className="p-1.5 hover:bg-white rounded text-slate-500 hover:text-teal-600 transition-colors" title="Image"><ImageIcon className="w-4 h-4" /></button>
                        <input id="rich-image-upload" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </div>
                    <button type="button" onClick={() => insertFormat('table')} className="p-1.5 hover:bg-white rounded text-slate-500 hover:text-teal-600 transition-colors" title="Table"><TableIcon className="w-4 h-4" /></button>
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                    <button type="button" onClick={() => insertFormat('math')} className="p-1.5 hover:bg-white rounded text-slate-500 hover:text-teal-600 font-serif italic font-black text-sm transition-colors" title="LaTeX Formula">Σ</button>
                    <button type="button" onClick={() => insertFormat('mathblock')} className="p-1.5 hover:bg-white rounded text-slate-500 hover:text-teal-600 font-black text-[10px] transition-colors" title="LaTeX Block">$$</button>
                </div>

                <div className="flex bg-white rounded-lg p-1 border border-slate-200 ml-4">
                    <button type="button" onClick={() => setViewMode('edit')} className={`p-1.5 rounded-md transition-all ${viewMode === 'edit' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => setViewMode('split')} className={`p-1.5 rounded-md transition-all ${viewMode === 'split' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Split View"><Columns className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => setViewMode('preview')} className={`p-1.5 rounded-md transition-all ${viewMode === 'preview' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Preview"><Eye className="w-3.5 h-3.5" /></button>
                </div>
            </div>

            {/* Editor Area */}
            <div className={`flex flex-col sm:flex-row ${height} min-h-[150px]`}>
                {(viewMode === 'edit' || viewMode === 'split') && (
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className={`flex-1 p-4 resize-none focus:outline-none font-mono text-sm text-slate-800 leading-relaxed custom-scrollbar ${viewMode === 'split' ? 'border-r border-slate-100' : ''}`}
                        spellCheck={false}
                    />
                )}
                {(viewMode === 'preview' || viewMode === 'split') && (
                    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar bg-slate-50/30">
                        {value ? (
                            <MarkdownRenderer content={value} />
                        ) : (
                            <p className="text-slate-300 italic text-sm">Preview will appear here</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RichTextEditor;
