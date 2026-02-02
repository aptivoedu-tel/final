'use client';

import React, { useEffect, useState } from 'react';
import {
    Bell, Check, Trash2, Filter, AlertTriangle, Info, CheckCircle, Clock
} from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { NotificationService, Notification } from '@/lib/services/notificationService';

export default function InstitutionNotificationsPage() {
    const [user, setUser] = useState<any>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        const currentUser = AuthService.getCurrentUser();
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('aptivo_user') : null;
        const activeUser = currentUser || (storedUser ? JSON.parse(storedUser) : null);

        if (!activeUser) {
            window.location.href = '/login';
            return;
        }

        setUser(activeUser);

        try {
            const { notifications } = await NotificationService.getUserNotifications(activeUser.id);
            if (notifications) setNotifications(notifications);
        } catch (error) {
            console.error("Error loading notifications:", error);
        } finally {
            setLoading(false);
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
        setProcessing(null);
    };

    const handleMarkAllRead = async () => {
        if (!user) return;
        setProcessing('all');
        const { success } = await NotificationService.markAllAsRead(user.id);

        if (success) {
            setNotifications(notifications.map(n => ({ ...n, read_at: new Date().toISOString() })));
        }
        setProcessing(null);
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'unread') return !n.read_at;
        if (filter === 'read') return !!n.read_at;
        return true;
    });

    const unreadCount = notifications.filter(n => !n.read_at).length;

    const getIcon = (category: string) => {
        switch (category) {
            case 'alert': return <AlertTriangle className="w-5 h-5 text-red-500" />;
            case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'info': default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    const getBgColor = (category: string, read: boolean) => {
        if (read) return 'bg-white hover:bg-gray-50';
        switch (category) {
            case 'alert': return 'bg-red-50/50 hover:bg-red-50 border-l-4 border-red-500';
            case 'success': return 'bg-green-50/50 hover:bg-green-50 border-l-4 border-green-500';
            case 'info': default: return 'bg-blue-50/50 hover:bg-blue-50 border-l-4 border-blue-500';
        }
    };

    const renderMessage = (text: string) => {
        if (!text) return null;
        const parts = text.split(/(\*\*[^\*]+\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-extrabold text-[#111827] drop-shadow-sm">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    if (loading) return null;

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <Sidebar userRole="institution_admin" />
            <Header userName={user?.full_name} userEmail={user?.email} userAvatar={user?.avatar_url} />

            <main className="ml-64 mt-16 p-8">
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
                        <div className="flex items-center gap-3">
                            <div className="bg-white rounded-lg border border-gray-200 p-1 flex">
                                <button
                                    onClick={() => setFilter('all')}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'all' ? 'bg-gray-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setFilter('unread')}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'unread' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Unread
                                </button>
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    disabled={!!processing}
                                    className="px-4 py-2 bg-white border border-gray-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2 shadow-sm"
                                >
                                    <Check className="w-4 h-4" />
                                    Mark all read
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notification List */}
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
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className={`font-black text-slate-800 tracking-tight ${!notification.read_at ? 'text-lg' : 'text-base'}`}>
                                                        {notification.title}
                                                    </h3>
                                                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                                                        {notification.institution_name || (notification.sender_role?.replace('_', ' ') || 'System Update')}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
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
                </div>
            </main>
        </div>
    );
}
