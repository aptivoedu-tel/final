'use client';

import React, { useEffect, useState } from 'react';
import {
    Send, Bell, Users, Building2, CheckCircle,
    AlertTriangle, Info, Clock, Loader2, XCircle, Image as ImageIcon, Bold
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { NotificationService } from '@/lib/services/notificationService';
import { AdminDashboardService } from '@/lib/services/adminDashboardService';

export default function AdminNotificationsPage() {
    const [user, setUser] = useState<any>(null);
    const [institutions, setInstitutions] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [category, setCategory] = useState<'info' | 'alert' | 'success'>('info');
    const [targetType, setTargetType] = useState<'all' | 'role' | 'institution'>('all');
    const [targetRole, setTargetRole] = useState<'student' | 'institution_admin'>('student');
    const [targetInstitution, setTargetInstitution] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isBold, setIsBold] = useState(false);

    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const currentUser = AuthService.getCurrentUser();
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('aptivo_user') : null;
        const activeUser = currentUser || (storedUser ? JSON.parse(storedUser) : null);

        if (!activeUser) {
            window.location.href = '/login';
            return;
        }

        setUser(activeUser);

        try {
            // 1. Get Institutions (Role-based)
            if (activeUser.role === 'super_admin') {
                const { data: insts } = await supabase.from('institutions').select('id, name').order('name');
                if (insts) setInstitutions(insts);
            } else if (activeUser.role === 'institution_admin') {
                const { institution } = await AdminDashboardService.getInstitutionDetails(activeUser.id);
                if (institution) {
                    setInstitutions([institution]);
                    setTargetInstitution(institution.id.toString());
                    setTargetType('institution'); // Default for institution admins
                }
            }

            // 2. Fetch History (Mock or real if table exists)
            // For now, we'll just show the local history which updates on send
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    };

    const applyBold = () => {
        const textarea = document.getElementById('notification-message') as HTMLTextAreaElement;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);

        if (selectedText) {
            const newText = text.substring(0, start) + `**${selectedText}**` + text.substring(end);
            setMessage(newText);
        } else {
            // Just toggle bold state for visual hint anyway (or we could just insert **** and move cursor)
            const newText = text.substring(0, start) + `****` + text.substring(end);
            setMessage(newText);
            // Wait for next tick to set cursor
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + 2, start + 2);
            }, 0);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const renderMessage = (text: string) => {
        if (!text) return null;
        const parts = text.split(/(\*\*[^\*]+\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSending(true);
        setStatusMsg(null);

        try {
            let imageUrl = '';

            // 1. Upload Image if present
            if (imageFile) {
                const fileName = `${Date.now()}_${imageFile.name}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('notifications')
                    .upload(fileName, imageFile);

                if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

                const { data: { publicUrl } } = supabase.storage
                    .from('notifications')
                    .getPublicUrl(fileName);

                imageUrl = publicUrl;
            }

            let res;
            if (targetType === 'all') {
                res = await NotificationService.sendToAllUsers({
                    title,
                    message,
                    category,
                    senderRole: user.role,
                    imageUrl
                });
            } else if (targetType === 'institution' && targetInstitution) {
                res = await NotificationService.sendToInstitutionStudents(parseInt(targetInstitution), {
                    title,
                    message,
                    category,
                    senderRole: user.role,
                    imageUrl
                });
            } else {
                res = await NotificationService.sendNotification({
                    title,
                    message,
                    category,
                    senderRole: user.role,
                    imageUrl
                }, [user.id]);
            }

            if (res.success) {
                setStatusMsg({ type: 'success', text: `Notification sent successfully!` });
                setTitle('');
                setMessage('');
                setImageFile(null);
                setImagePreview(null);
                setHistory([{ title, message, category, date: new Date(), target: targetType, image_url: imageUrl } as any, ...history]);
            } else {
                setStatusMsg({ type: 'error', text: res.error || 'Failed to send notification.' });
            }

        } catch (err: any) {
            setStatusMsg({ type: 'error', text: err.message || 'Error sending notification' });
        } finally {
            setSending(false);
        }
    };

    if (loading) return null;

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <Sidebar userRole="super_admin" />
            <Header userName={user?.full_name} userEmail={user?.email} userAvatar={user?.avatar_url} />

            <main className="ml-64 mt-16 p-8">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-slate-800">Notification Center</h1>
                        <p className="text-slate-500">Send announcements and alerts to your students and staff</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Send Form */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <Send className="w-5 h-5 text-indigo-600" />
                                    Compose Notification
                                </h3>

                                {statusMsg && (
                                    <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${statusMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                                        }`}>
                                        {statusMsg.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                        <span className="font-medium">{statusMsg.text}</span>
                                    </div>
                                )}

                                <form onSubmit={handleSend} className="space-y-6">
                                    {/* Target Selection */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <label className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-gray-50 transition-all ${targetType === 'all' ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-100'}`}>
                                            <input type="radio" name="target" className="hidden" checked={targetType === 'all'} onChange={() => setTargetType('all')} />
                                            <Users className={`w-6 h-6 ${targetType === 'all' ? 'text-indigo-600' : 'text-slate-400'}`} />
                                            <span className={`text-sm font-bold ${targetType === 'all' ? 'text-indigo-900' : 'text-slate-500'}`}>All Users</span>
                                        </label>
                                        <label className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-gray-50 transition-all ${targetType === 'role' ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-100'}`}>
                                            <input type="radio" name="target" className="hidden" checked={targetType === 'role'} onChange={() => setTargetType('role')} />
                                            <Users className={`w-6 h-6 ${targetType === 'role' ? 'text-indigo-600' : 'text-slate-400'}`} />
                                            <span className={`text-sm font-bold ${targetType === 'role' ? 'text-indigo-900' : 'text-slate-500'}`}>By Role</span>
                                        </label>
                                        <label className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-gray-50 transition-all ${targetType === 'institution' ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-100'}`}>
                                            <input type="radio" name="target" className="hidden" checked={targetType === 'institution'} onChange={() => setTargetType('institution')} />
                                            <Building2 className={`w-6 h-6 ${targetType === 'institution' ? 'text-indigo-600' : 'text-slate-400'}`} />
                                            <span className={`text-sm font-bold ${targetType === 'institution' ? 'text-indigo-900' : 'text-slate-500'}`}>By Institution</span>
                                        </label>
                                    </div>

                                    {/* Filters based on Target */}
                                    {targetType === 'role' && (
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 animate-in fade-in slide-in-from-top-1">
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Select Role</label>
                                            <select
                                                value={targetRole}
                                                onChange={(e) => setTargetRole(e.target.value as any)}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                                            >
                                                <option value="student">Student</option>
                                                <option value="institution_admin">Institution Admin</option>
                                            </select>
                                        </div>
                                    )}

                                    {targetType === 'institution' && (
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 animate-in fade-in slide-in-from-top-1">
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Select Institution</label>
                                            {user?.role === 'institution_admin' ? (
                                                <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-slate-700 font-medium">
                                                    {institutions[0]?.name || 'Your Institution'}
                                                </div>
                                            ) : (
                                                <select
                                                    value={targetInstitution}
                                                    onChange={(e) => setTargetInstitution(e.target.value)}
                                                    required
                                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                                                >
                                                    <option value="">Select an institution...</option>
                                                    {institutions.map(inst => (
                                                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    )}

                                    {/* Main Content */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Message Category</label>
                                        <div className="flex gap-4">
                                            <button
                                                type="button"
                                                onClick={() => setCategory('info')}
                                                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-2 ${category === 'info' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 text-slate-500 hover:bg-gray-50'}`}
                                            >
                                                <Info className="w-4 h-4" /> Info
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCategory('alert')}
                                                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-2 ${category === 'alert' ? 'bg-red-50 border-red-200 text-red-700' : 'border-gray-200 text-slate-500 hover:bg-gray-50'}`}
                                            >
                                                <AlertTriangle className="w-4 h-4" /> Alert
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCategory('success')}
                                                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-2 ${category === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'border-gray-200 text-slate-500 hover:bg-gray-50'}`}
                                            >
                                                <CheckCircle className="w-4 h-4" /> Success
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            required
                                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                            placeholder="Overview of incoming updates..."
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-sm font-medium text-slate-700">Message</label>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={applyBold}
                                                    className="p-1.5 hover:bg-gray-100 rounded-lg text-slate-600 border border-gray-200"
                                                    title="Bold Text"
                                                >
                                                    <Bold className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <textarea
                                            id="notification-message"
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            required
                                            rows={5}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none"
                                            placeholder="Write your message here... (Use **text** for bold)"
                                        />
                                    </div>

                                    {/* Image Attachment */}
                                    <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200">
                                        <label className="flex flex-col items-center gap-4 cursor-pointer">
                                            {imagePreview ? (
                                                <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg border-2 border-white">
                                                    <img src={imagePreview} className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setImageFile(null);
                                                            setImagePreview(null);
                                                        }}
                                                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                                        <ImageIcon className="w-6 h-6" />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-bold text-slate-700">Attach Image Attachment</p>
                                                        <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB</p>
                                                    </div>
                                                </>
                                            )}
                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                        </label>
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <button
                                            type="submit"
                                            disabled={sending}
                                            className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-200"
                                        >
                                            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                            Send Notification
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Recent History */}
                        <div>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-slate-400" />
                                    Recent History
                                </h3>

                                {history.length > 0 ? (
                                    <div className="space-y-4">
                                        {history.map((item, i) => (
                                            <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${item.category === 'alert' ? 'bg-red-100 text-red-700' :
                                                        item.category === 'success' ? 'bg-green-100 text-green-700' :
                                                            'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {item.category}
                                                    </span>
                                                    <span className="text-xs text-slate-400">{item.date.toLocaleDateString()}</span>
                                                </div>
                                                <h4 className="font-bold text-slate-800 text-sm mb-1">{item.title}</h4>
                                                <div className="text-xs text-slate-500 line-clamp-2">
                                                    {renderMessage(item.message)}
                                                </div>
                                                <div className="mt-2 text-xs font-medium text-slate-500 flex items-center gap-1">
                                                    Target: <span className="text-slate-700 capitalize">{item.target}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-slate-400 border border-dashed border-gray-200 rounded-xl">
                                        <Send className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No recent notifications</p>
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
