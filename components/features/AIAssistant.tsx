'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Bot, User, Sparkles, Maximize2, MoveDiagonal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// --- PhysicsRAG API Config ---
const EDGE_FUNCTION_URL = "https://cxfdymwobhddzuymxirl.supabase.co/functions/v1/physics-rag";
const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_TOKEN || ""; // Removed hardcoded token for security

const ENHANCED_PROMPT_INSTRUCTIONS = `
[INSTRUCTIONS:
1. You are a Physics expert tutor. Answer this question thoroughly and accurately.
2. Use the retrieved textbook context as a SUPPLEMENT — it may be incomplete or only partially relevant. That is fine.
3. ALWAYS answer using your own comprehensive physics knowledge FIRST, then enrich with any relevant details from the retrieved context.
4. NEVER say "the context does not contain", "I cannot find", "not in the provided context", or anything similar. NEVER refuse to answer.
5. If the retrieved context is about a related topic, connect it to the question naturally.
6. If the retrieved context is completely irrelevant, simply ignore it and answer from your own knowledge — do NOT mention that the context was unhelpful.
7. Give a complete, well-structured answer: use headings (##, ###), bold (**key terms**), bullet points, numbered steps for derivations, and LaTeX for all equations ($...$ inline, $$...$$ display). Use proper physics notation (\\vec{}, \\frac{}{}, Greek letters, units with \\text{}).
8. Include real-world examples and applications when relevant.
9. Mention which chapter/topic this belongs to in the Punjab Board Physics syllabus if you know.
10. NEVER use ASCII art, text-based diagrams, or box-drawing characters (─ │ ┌ ┐ |— etc.) for diagrams — they render badly here. Instead describe diagrams using structured bullet lists, Markdown tables (| Component | Type | Bias |), or textual flow with arrows (→, ←, ⇌).]`;

interface Message {
    role: 'bot' | 'user';
    content: string;
    sources?: any[];
    question?: string; // Original question for search links
}

// --- Search Links Helper ---
const generateSearchLinks = (question: string) => {
    const stopWords = /\b(what|how|why|when|where|which|who|does|is|are|was|were|the|a|an|of|in|for|to|and|or|explain|describe|define|tell|me|about|can|you|concept|please|its)\b/gi;
    const topic = question.replace(stopWords, '').replace(/[^\w\s]/g, '').trim().replace(/\s+/g, ' ');
    const encoded = encodeURIComponent(topic + ' physics');
    const encodedQ = encodeURIComponent(question);

    return [
        { name: 'Google', url: `https://www.google.com/search?q=${encodedQ}`, icon: '🔍', color: '#4285F4' },
        { name: 'Khan Academy', url: `https://www.khanacademy.org/search?referer=%2F&page_search_query=${encoded}`, icon: '🎓', color: '#14BF96' },
        { name: 'Wikipedia', url: `https://en.wikipedia.org/w/index.php?search=${encoded}`, icon: '📖', color: '#636466' },
        { name: 'YouTube', url: `https://www.youtube.com/results?search_query=${encoded}+explained`, icon: '▶️', color: '#FF0000' }
    ];
};

export const AIAssistant: React.FC = () => {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'bot',
            content: "Hi there! I'm your Aptivo AI Assistant. Ask me anything from your Physics textbook — I'll find the relevant sections and give you a detailed answer in real time! 📖"
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [size, setSize] = useState({ width: 440, height: 640 }); // slightly larger default
    const [isResizing, setIsResizing] = useState(false);
    const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
    const chatBodyRef = useRef<HTMLDivElement>(null);
    const assistantRef = useRef<HTMLDivElement>(null);

    // Hide AI Assistant during exams
    const isExamPage = pathname?.includes('/exam/');

    // Scroll to bottom when messages change
    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages, streamingContent, isTyping]);

    // Preprocess LaTeX from string to protect it from Markdown parser
    const preprocessLaTeX = (content: string) => {
        if (!content) return '';
        return content
            .replace(/\\\[([\s\S]*?)\\\]/g, (_, tex) => `$$${tex}$$`) // \[ \] -> $$ $$
            .replace(/\\\(([\s\S]*?)\\\)/g, (_, tex) => `$${tex}$`);   // \( \) -> $ $
    };

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (assistantRef.current && !assistantRef.current.contains(event.target as Node) && !isResizing) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, isResizing]);

    // Resize logic
    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        resizeStart.current = {
            x: e.clientX,
            y: e.clientY,
            w: size.width,
            h: size.height
        };
    };

    useEffect(() => {
        const handleResizeMove = (e: MouseEvent) => {
            if (!isResizing) return;

            const deltaX = resizeStart.current.x - e.clientX;
            const deltaY = resizeStart.current.y - e.clientY;

            setSize({
                width: Math.max(340, Math.min(window.innerWidth - 60, resizeStart.current.w + deltaX)),
                height: Math.max(400, Math.min(window.innerHeight - 140, resizeStart.current.h + deltaY))
            });
        };

        const handleResizeEnd = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleResizeMove);
            window.addEventListener('mouseup', handleResizeEnd);
        }

        return () => {
            window.removeEventListener('mousemove', handleResizeMove);
            window.removeEventListener('mouseup', handleResizeEnd);
        };
    }, [isResizing]);

    if (isExamPage) return null;

    const handleSend = async (text: string = input) => {
        if (!text.trim() || isTyping) return;

        const userMessage: Message = { role: 'user', content: text };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);
        setStreamingContent('');

        try {
            const enhancedQuestion = `${text}\n\n${ENHANCED_PROMPT_INSTRUCTIONS}`;

            const response = await fetch(EDGE_FUNCTION_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question: enhancedQuestion,
                    stream: true,
                    top_k: 5,
                    github_token: GITHUB_TOKEN,
                }),
            });

            if (!response.ok) throw new Error('Failed to connect to AI Assistant');

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = '';
            let buffer = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep the last partial line in buffer

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const eventData = line.slice(6).trim();
                                if (!eventData) continue;

                                const event = JSON.parse(eventData);
                                if (event.type === 'token') {
                                    accumulatedContent += event.token;
                                    setStreamingContent(accumulatedContent);
                                }
                            } catch (e) {
                                // console.warn('Stream parse error:', e, 'Line:', line);
                            }
                        }
                    }
                }
            }

            setMessages(prev => [...prev, { role: 'bot', content: accumulatedContent, question: text }]);
            setStreamingContent('');
        } catch (error) {
            console.error('AI Error:', error);
            setMessages(prev => [...prev, { role: 'bot', content: 'Sorry, I encountered an error. Please try again later.' }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleQuickAction = (msg: string) => {
        handleSend(msg);
    };

    return (
        <div className="ai-assistant-wrapper" ref={assistantRef}>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`ai-toggle-btn ${isOpen ? 'active' : ''}`}
                aria-label="Toggle AI Assistant"
            >
                <motion.div
                    animate={{ rotate: isOpen ? 360 : 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="flex items-center justify-center w-full h-full"
                >
                    <img src="/ai-assistant.gif" alt="AI" className="ai-btn-gif" />
                </motion.div>
            </button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={`ai-chat-window open ${isResizing ? 'resizing' : ''}`}
                        style={{ width: size.width, height: size.height }}
                    >
                        {/* Resize handle (top-left) */}
                        <div
                            className="ai-resize-handle"
                            onMouseDown={handleResizeStart}
                        >
                            <MoveDiagonal size={14} className="ai-resize-icon" />
                        </div>

                        {/* Header */}
                        <div className="ai-chat-header">
                            <div className="ai-chat-header__left">
                                <div className="ai-avatar">
                                    <Bot size={20} />
                                </div>
                                <div>
                                    <h3 className="ai-chat-header__title">Aptivo AI</h3>
                                    <span className="ai-chat-header__status">
                                        <span className="status-dot"></span> Online
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="ai-chat-header__close"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="ai-chat-body" ref={chatBodyRef}>
                            <div className="ai-welcome-card">
                                <div className="ai-welcome-icon">🚀</div>
                                <h4>Hi there! I&apos;m your Aptivo AI Assistant</h4>
                                <p>Ask me anything about Physics, and I&apos;ll help you understand!</p>
                            </div>

                            {/* Quick Actions */}
                            <div className="ai-quick-actions">
                                <button className="ai-chip" onClick={() => handleQuickAction("What is Newton's second law of motion?")}>🚀 Newton&apos;s Laws</button>
                                <button className="ai-chip" onClick={() => handleQuickAction("Explain nuclear fusion")}>☀️ Nuclear Fusion</button>
                                <button className="ai-chip" onClick={() => handleQuickAction("What is Ohm's law?")}>⚡ Ohm&apos;s Law</button>
                                <button className="ai-chip" onClick={() => handleQuickAction("Explain electromagnetic induction")}>🧲 EM Induction</button>
                            </div>

                            {/* Messages */}
                            {messages.map((msg, i) => (
                                <div key={i} className={`ai-message ${msg.role === 'bot' ? 'ai-message--bot' : 'ai-message--user'}`}>
                                    <div className="ai-message__avatar">
                                        {msg.role === 'bot' ? <Bot size={16} /> : <User size={16} />}
                                    </div>
                                    <div className="ai-message__bubble">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm, remarkMath]}
                                            rehypePlugins={[rehypeKatex]}
                                        >
                                            {preprocessLaTeX(msg.content)}
                                        </ReactMarkdown>
                                    </div>
                                    {msg.role === 'bot' && msg.question && (
                                        <div className="ai-web-links">
                                            <div className="ai-web-links__header">Explore more:</div>
                                            <div className="ai-web-links__list">
                                                {generateSearchLinks(msg.question).map((link, idx) => (
                                                    <a
                                                        key={idx}
                                                        href={link.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="ai-web-link"
                                                        style={{ color: link.color } as any}
                                                    >
                                                        <span className="ai-web-link__icon">{link.icon}</span>
                                                        <span className="ai-web-link__name">{link.name}</span>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Streaming Content */}
                            {streamingContent && (
                                <div className="ai-message ai-message--bot">
                                    <div className="ai-message__avatar">
                                        <Bot size={16} />
                                    </div>
                                    <div className="ai-message__bubble">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm, remarkMath]}
                                            rehypePlugins={[rehypeKatex]}
                                        >
                                            {preprocessLaTeX(streamingContent)}
                                        </ReactMarkdown>
                                        <span className="ai-stream-cursor"></span>
                                    </div>
                                </div>
                            )}

                            {/* Typing Indicator */}
                            {isTyping && !streamingContent && (
                                <div className="ai-typing">
                                    <div className="ai-typing__dots">
                                        <div className="ai-typing__dot"></div>
                                        <div className="ai-typing__dot"></div>
                                        <div className="ai-typing__dot"></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="ai-chat-footer">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSend();
                                }}
                                className="ai-input-wrapper"
                            >
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask Aptivo AI anything..."
                                    className="ai-input"
                                    autoComplete="off"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isTyping}
                                    className={`ai-send-btn ${(!input.trim() || isTyping) ? 'ai-send-btn--disabled' : ''}`}
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                            <div className="ai-footer-note-container">
                                <p className="ai-footer-note">Powered by <strong>Aptivo AI</strong></p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                .ai-assistant-wrapper {
                    font-family: 'Inter', sans-serif;
                }
                /* Any custom styles not in ai-assistant.css can go here */
            `}</style>
        </div>
    );
};

export default AIAssistant;
