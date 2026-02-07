'use client';

import React, { useEffect, useState } from 'react';
import {
    Bell, Check, Trash2, Filter, AlertTriangle, Info, CheckCircle, Clock, Send, Users, User, Image as ImageIcon, XCircle, Bold, ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { NotificationService, Notification } from '@/lib/services/notificationService';
import { useUI } from '@/lib/context/UIContext';
import Loader from '@/components/ui/Loader';
import { useLoading } from '@/lib/context/LoadingContext';


export default function InstitutionNotificationsPage() {
    const [user, setUser] = useState<any>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const [activeTab, setActiveTab] = useState<'inbox' | 'compose' | 'history'>('inbox');
    const [sentHistory, setSentHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
    const [processing, setProcessing] = useState<string | null>(null);
    const { isSidebarCollapsed } = useUI();


    // Compose State
    const [students, setStudents] = useState<any[]>([]);
    const [targetType, setTargetType] = useState<'all' | 'individual'>('all');
    const [selectedStudent, setSelectedStudent] = useState('');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [category, setCategory] = useState<'info' | 'alert' | 'success'>('info');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadNotifications();
    }, []);

    useEffect(() => {
        if (activeTab === 'history') {
            loadHistory();
        }
    }, [activeTab]);

    const loadHistory = async () => {
        const currentUser = AuthService.getCurrentUser() as any;
        if (!currentUser || !currentUser.institution_id) return;

        setGlobalLoading(true, 'Accessing broadcast archives...');
        try {

            const { history } = await NotificationService.getSentHistory({
                senderRole: 'institution_admin',
                institutionId: currentUser.institution_id
            });
            if (history) setSentHistory(history);
        } catch (error) {
            console.error("Error loading history:", error);
        } finally {
            setGlobalLoading(false);
        }
    };


    const loadNotifications = async () => {
        setGlobalLoading(true, 'Accessing Institutional Communications...');
        const currentUser = AuthService.getCurrentUser();

        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('aptivo_user') : null;
        const activeUser = currentUser || (storedUser ? JSON.parse(storedUser) : null);

        if (!activeUser) {
            window.location.href = '/login';
            return;
        }

        setUser(activeUser);

        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) return;

            const { data: profile } = await supabase
                .from('users')
                .select('institution_id')
                .eq('id', authUser.id)
                .single();

            let instId = profile?.institution_id;

            if (!instId) {
                // FALLBACK: Try checking institution_admins table
                const { data: adminLink } = await supabase
                    .from('institution_admins')
                    .select('institution_id')
                    .eq('user_id', authUser.id)
                    .maybeSingle();

                if (adminLink?.institution_id) {
                    console.log("Rescued institution link from institution_admins");
                    instId = adminLink.institution_id;
                    // Update user state so handleSend works
                    setUser((prev: any) => prev ? { ...prev, institution_id: instId } : prev);
                    // Proactively update the users table for next time
                    await supabase.from('users').update({ institution_id: instId }).eq('id', authUser.id);
                }
            }

            const { notifications } = await NotificationService.getUserNotifications(activeUser.id);
            if (notifications) setNotifications(notifications);

            // Fetch students for compose
            if (instId) {
                const { data: stds } = await supabase
                    .from('users')
                    .select('id, full_name, email')
                    .eq('institution_id', instId)
                    .eq('role', 'student')
                    .eq('status', 'active');
                if (stds) setStudents(stds);
            }
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setTimeout(() => setGlobalLoading(false), 800);
        }
    };


    const handleMarkAsRead = async (id: number) => {
        if (!user) return;
        const notification = notifications.find(n => n.id === id);
        if (notification?.read_at) return;

        setProcessing(id.toString());
        const { success } = await NotificationService.markAsRead(id, user.id);

        if (success) {
            setNotifications(notifications.map(n =>
                n.id === id ? { ...n, read_at: new Date().toISOString() } : n
            ));
        }
        setGlobalLoading(false);
    };


    const handleMarkAllRead = async () => {
        if (!user) return;
        setGlobalLoading(true, 'Clearing Notifications...');
        const { success } = await NotificationService.markAllAsRead(user.id);


        if (success) {
            setNotifications(notifications.map(n => ({ ...n, read_at: new Date().toISOString() })));
        }
        setGlobalLoading(false);
    };


    const filteredNotifications = notifications.filter(n => {
        if (filter === 'unread') return !n.read_at;
        if (filter === 'read') return !!n.read_at;
        return true;
    });

    const unreadCount = notifications.filter(n => !n.read_at).length;

    const getBgColor = (category: string, isRead: boolean) => {
        if (isRead) return 'bg-white opacity-80';
        switch (category) {
            case 'alert': return 'bg-rose-50/50 border-rose-100';
            case 'success': return 'bg-emerald-50/50 border-emerald-100';
            default: return 'bg-indigo-50/50 border-indigo-100';
        }
    };

    const getIcon = (category: string) => {
        switch (category) {
            case 'alert': return <AlertTriangle className="w-6 h-6 text-rose-500" />;
            case 'success': return <CheckCircle className="w-6 h-6 text-emerald-500" />;
            default: return <Info className="w-6 h-6 text-indigo-500" />;
        }
    };

    const renderMessage = (text: string) => {
        if (!text) return null;
        return text.split('\n').map((line, i) => (
            <React.Fragment key={i}>
                {line}
                <br />
            </React.Fragment>
        ));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setGlobalLoading(true, 'Dispatching Educational Broadcast...');
        setSending(true);
        setStatusMsg(null);

        try {
            const currentUser = AuthService.getCurrentUser() as any;
            if (!currentUser || !currentUser.institution_id) {
                throw new Error("Missing institutional clearance");
            }

            let imageUrl = '';
            if (imageFile) {
                const { url, error: uploadError } = await NotificationService.uploadNotificationImage(imageFile);
                if (uploadError) throw new Error(uploadError);
                imageUrl = url || '';
            }

            const { success, error } = await NotificationService.sendNotification({
                title,
                message,
                category,
                imageUrl,
                targetType,
                targetId: targetType === 'individual' ? selectedStudent : undefined,
                senderRole: 'institution_admin',
                institutionId: currentUser.institution_id
            });

            if (success) {
                setStatusMsg({ type: 'success', text: 'Broadcast dispatched successfully!' });
                setTitle('');
                setMessage('');
                setImageFile(null);
                setImagePreview(null);
                loadHistory();
            } else {
                throw new Error(error || "Failed to send notification");
            }
        } catch (err: any) {
            console.error(err);
            setStatusMsg({ type: 'error', text: err.message });
        } finally {
            setGlobalLoading(false);
            setSending(false);
        }
    };

    if (loading) return null;

    return (

        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole="institution_admin" />
            <div className="flex-1 flex flex-col">
                <Header userName={user?.full_name} userEmail={user?.email} userAvatar={user?.avatar_url} />

                <main className={`${isSidebarCollapsed ? 'lg:ml-24' : 'lg:ml-72'} pt-24 p-4 lg:p-8 transition-all duration-300`}>
                    <div className="max-w-4xl mx-auto">
                        {/* Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                    Notifications
                                    {unreadCount > 0 && (
                                        <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                                            {unreadCount} New
                                        </span>
                                    )}
                                </h1>
                                <p className="text-slate-500 mt-1">Updates and announcements for your institution access</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="bg-white rounded-lg border border-gray-200 p-1 flex w-full sm:w-auto">
                                    <button
                                        onClick={() => setActiveTab('inbox')}
                                        className={`flex-1 sm:flex-none px-4 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all ${activeTab === 'inbox' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
                                    >
                                        Inbox
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('compose')}
                                        className={`flex-1 sm:flex-none px-4 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all ${activeTab === 'compose' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
                                    >
                                        Compose
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('history')}
                                        className={`flex-1 sm:flex-none px-4 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
                                    >
                                        History
                                    </button>
                                </div>
                                {activeTab === 'inbox' && (
                                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                        <div className="bg-white rounded-lg border border-gray-200 p-1 flex">
                                            <button
                                                onClick={() => setFilter('all')}
                                                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${filter === 'all' ? 'bg-gray-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                All
                                            </button>
                                            <button
                                                onClick={() => setFilter('unread')}
                                                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${filter === 'unread' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                Unread
                                            </button>
                                        </div>
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={handleMarkAllRead}
                                                className="px-3 py-1.5 bg-white border border-gray-200 text-slate-600 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-50 flex items-center gap-2 shadow-sm"
                                            >
                                                <Check className="w-3 h-3" />
                                                Mark all
                                            </button>

                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {activeTab === 'inbox' && (
                            <div className="space-y-4">
                                {filteredNotifications.length > 0 ? (
                                    filteredNotifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            onClick={() => handleMarkAsRead(notification.id)}
                                            className={`relative p-6 rounded-2xl shadow-sm border border-gray-100 transition-all cursor-pointer ${getBgColor(notification.category || 'info', !!notification.read_at)}`}
                                        >
                                            <div className="flex items-start gap-5">
                                                <div className={`mt-1 p-3 rounded-2xl bg-white shadow-sm border border-gray-100`}>
                                                    {getIcon(notification.category || 'info')}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-2">
                                                        <div>
                                                            <h3 className={`font-black text-slate-800 tracking-tight leading-tight ${!notification.read_at ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`}>
                                                                {notification.title}
                                                            </h3>
                                                            <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-slate-400">
                                                                {notification.institution_name || (notification.sender_role?.replace('_', ' ') || 'System Update')}
                                                            </span>
                                                        </div>
                                                        <span className="text-[9px] sm:text-[10px] font-black text-slate-400 flex items-center gap-1.5 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-100 shadow-sm w-fit">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(notification.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>

                                                    <p className="text-slate-600 text-sm leading-relaxed mb-4 whitespace-pre-wrap">
                                                        {renderMessage(notification.message)}
                                                    </p>

                                                    {notification.image_url && (
                                                        <div className="mb-4 rounded-2xl overflow-hidden border-4 border-white shadow-xl max-w-lg">
                                                            <img
                                                                src={notification.image_url}
                                                                alt="Attachment"
                                                                className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500"
                                                            />
                                                        </div>
                                                    )}

                                                    {!notification.read_at && (
                                                        <div className="flex justify-end">
                                                            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <CheckCircle className="w-3 h-3" /> Click to mark as read
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                                        <Bell className="w-12 h-12 mx-auto text-slate-200 mb-4" />
                                        <h3 className="text-lg font-bold text-slate-700 mb-1">No notifications</h3>
                                        <p className="text-slate-400 max-w-xs mx-auto">
                                            {filter === 'unread' ? "You're all caught up! No new notifications." : "You haven't received any notifications yet."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'compose' && (
                            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-[#1e1b4b] p-8 text-white relative">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
                                    <h2 className="text-xl font-black flex items-center gap-3 text-white">
                                        <Send className="w-6 h-6 text-indigo-400" />
                                        Broadcast Announcement
                                    </h2>
                                    <p className="text-indigo-200 text-xs mt-1 font-medium italic opacity-80 underline decoration-indigo-500/30 underline-offset-4">Only students of your institution will receive this.</p>
                                </div>

                                <form onSubmit={handleSend} className="p-8 space-y-6">
                                    {statusMsg && (
                                        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in zoom-in-95 duration-300 ${statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                                            {statusMsg.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                            <span className="font-bold text-sm tracking-tight">{statusMsg.text}</span>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setTargetType('all')}
                                            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${targetType === 'all' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 text-slate-400 hover:border-indigo-100'}`}
                                        >
                                            <Users className={`w-6 h-6 ${targetType === 'all' ? 'text-indigo-600' : ''}`} />
                                            <span className="text-xs font-black uppercase tracking-widest">All Students</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTargetType('individual')}
                                            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${targetType === 'individual' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 text-slate-400 hover:border-indigo-100'}`}
                                        >
                                            <User className={`w-6 h-6 ${targetType === 'individual' ? 'text-indigo-600' : ''}`} />
                                            <span className="text-xs font-black uppercase tracking-widest">Individual</span>
                                        </button>
                                    </div>

                                    {targetType === 'individual' && (
                                        <div className="animate-in slide-in-from-top-2">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Select Recipient</label>
                                            <select
                                                value={selectedStudent}
                                                onChange={(e) => setSelectedStudent(e.target.value)}
                                                required
                                                className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-indigo-600 outline-none transition-all font-bold text-slate-700 shadow-inner"
                                            >
                                                <option value="">Search student name...</option>
                                                {students.map(s => (
                                                    <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Category & Importance</label>
                                        <div className="flex gap-2">
                                            {[
                                                { id: 'info', icon: Info, color: 'blue' },
                                                { id: 'alert', icon: AlertTriangle, color: 'rose' },
                                                { id: 'success', icon: CheckCircle, color: 'emerald' }
                                            ].map(cat => (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => setCategory(cat.id as any)}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${category === cat.id ? `border-${cat.color}-500 bg-${cat.color}-50 text-${cat.color}-700 font-black` : 'border-transparent bg-gray-50 text-slate-400 opacity-60'}`}
                                                >
                                                    <cat.icon className="w-4 h-4" />
                                                    <span className="text-[10px] uppercase tracking-wider">{cat.id}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Headline</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            required
                                            className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-indigo-600 outline-none transition-all font-bold text-slate-700 shadow-inner"
                                            placeholder="e.g., Campus Maintenance Tomorrow"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Announcement Message</label>
                                        <textarea
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            required
                                            rows={6}
                                            className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-indigo-600 outline-none transition-all font-medium text-slate-700 shadow-inner resize-none"
                                            placeholder="Type your message here... Use **text** for emphasis."
                                        />
                                    </div>

                                    <div className="border-2 border-dashed border-gray-100 rounded-[2rem] p-8 text-center bg-slate-50 relative group">
                                        {imagePreview ? (
                                            <div className="relative inline-block group">
                                                <img src={imagePreview} className="max-h-48 rounded-2xl shadow-2xl ring-4 ring-white" />
                                                <button
                                                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                                                    className="absolute -top-3 -right-3 p-2 bg-rose-500 text-white rounded-full shadow-lg hover:scale-110 transition-transform"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="cursor-pointer">
                                                <div className="w-16 h-16 bg-white rounded-3xl shadow-sm border border-gray-100 flex items-center justify-center mx-auto mb-4 text-slate-300 group-hover:text-indigo-500 transition-colors">
                                                    <ImageIcon className="w-8 h-8" />
                                                </div>
                                                <p className="text-sm font-black text-slate-700">Attach Media Blast</p>
                                                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Enhance engagement with visuals</p>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                            </label>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full py-5 bg-[#1e1b4b] text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                    >
                                        <Send className="w-5 h-5" />
                                        Dispatch Broadcast
                                    </button>

                                </form>
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="space-y-6">
                                {sentHistory.length > 0 ? (

                                    sentHistory.map((item) => (
                                        <div key={item.id} className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl transition-all group">
                                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${item.category === 'alert' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                            {item.category || 'System'}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400">
                                                            {new Date(item.created_at).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight mb-2">{item.title}</h3>
                                                    <p className="text-slate-600 text-sm whitespace-pre-wrap">{item.message}</p>
                                                </div>
                                                <div className="flex flex-col items-center sm:items-end shrink-0">
                                                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex flex-col items-center justify-center border border-indigo-100 mb-2">
                                                        <Users className="w-5 h-5 text-indigo-600" />
                                                        <span className="text-[10px] font-black text-indigo-600">{item.recipientCount}</span>
                                                    </div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Recipients</p>
                                                </div>
                                            </div>

                                            <div className="border-t border-slate-50 pt-6">
                                                <button
                                                    onClick={() => {
                                                        const el = document.getElementById(`recipients-${item.id}`);
                                                        if (el) el.classList.toggle('hidden');
                                                    }}
                                                    className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all"
                                                >
                                                    View Recipient Details <ChevronRight className="w-3 h-3" />
                                                </button>

                                                <div id={`recipients-${item.id}`} className="hidden mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in slide-in-from-top-2">
                                                    {item.recipients?.map((r: any) => (
                                                        <div key={r.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-xs font-black text-slate-400 shadow-sm">
                                                                {r.name?.[0] || '?'}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-bold text-slate-800 truncate">{r.name || 'Unknown'}</p>
                                                                <p className="text-[10px] text-slate-400 truncate">{r.email}</p>
                                                            </div>
                                                            {r.isRead ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Clock className="w-3 h-3 text-slate-300" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                                        <Send className="w-12 h-12 mx-auto text-slate-200 mb-4" />
                                        <h3 className="text-lg font-bold text-slate-700 mb-1">No Broadcast History</h3>
                                        <p className="text-slate-400 max-w-xs mx-auto">You haven't sent any institution-wide notifications yet.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
