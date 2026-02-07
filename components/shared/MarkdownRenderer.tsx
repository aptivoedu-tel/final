'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
    return (
        <div className={`prose prose-slate max-w-none ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
                rehypePlugins={[
                    [rehypeKatex, { strict: false, trust: true }],
                    rehypeRaw
                ]}
                components={{
                    // Style images with resizing support
                    img: ({ node, ...props }) => {
                        const altParts = props.alt?.split('|') || [];
                        const altText = altParts[0];
                        const width = altParts[1];
                        return (
                            <span className="block my-8 text-center">
                                <img
                                    {...props}
                                    alt={altText}
                                    style={{
                                        width: width ? (width.includes('%') ? width : `${width}px`) : 'auto',
                                        maxWidth: '100%',
                                        display: 'block',
                                        margin: '0 auto'
                                    }}
                                    className="rounded-2xl shadow-xl border border-slate-100 transition-transform hover:scale-[1.01]"
                                />
                                {altText && <span className="block text-center text-xs text-slate-400 mt-3 font-medium">{altText}</span>}
                            </span>
                        );
                    },
                    // Style tables for a premium look
                    table: ({ node, ...props }) => (
                        <div className="my-8 overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
                            <table className="w-full border-collapse text-sm" {...props} />
                        </div>
                    ),
                    thead: ({ node, ...props }) => <thead className="bg-slate-50/80 backdrop-blur-sm" {...props} />,
                    th: ({ node, ...props }) => (
                        <th className="border-b border-slate-100 px-6 py-4 font-black text-slate-700 text-left uppercase tracking-widest text-[10px]" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                        <td className="border-b border-slate-50 px-6 py-4 text-slate-600 font-medium" {...props} />
                    ),
                    // Style headings
                    h1: ({ node, ...props }) => <h1 className="text-3xl font-black text-slate-900 mb-6 mt-12 tracking-tight pb-2 border-b-2 border-indigo-500/10" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-2xl font-black text-slate-800 mb-4 mt-8 tracking-tight flex items-center gap-3 before:w-1 before:h-6 before:bg-indigo-500 before:rounded-full" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-xl font-bold text-slate-800 mb-3 mt-6 tracking-tight" {...props} />,
                    // Style blockquotes
                    blockquote: ({ node, ...props }) => (
                        <blockquote className="border-l-4 border-indigo-500 bg-indigo-50/30 px-6 py-4 rounded-r-2xl my-6 italic text-slate-700 font-medium" {...props} />
                    ),
                    // Style math blocks
                    div: ({ node, className, children, ...props }) => {
                        if (className?.includes('math-display')) {
                            return (
                                <div className="flex justify-center my-10 overflow-x-auto py-8 bg-slate-50/50 rounded-2xl border border-slate-100 shadow-inner group relative" {...props}>
                                    <div className="absolute top-2 right-4 text-[8px] font-black text-slate-300 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Equation</div>
                                    {children}
                                </div>
                            );
                        }
                        return <div className={className} {...props}>{children}</div>;
                    },
                    // Style strong text
                    strong: ({ node, ...props }) => <strong className="font-black text-slate-900" {...props} />,
                    // Style links
                    a: ({ node, ...props }) => <a className="text-indigo-600 font-bold hover:text-indigo-700 underline decoration-indigo-200 underline-offset-4 decoration-2 transition-colors" {...props} />
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownRenderer;
