'use client';

import React, { useState, useEffect } from 'react';
import { Search, Bell, User, ChevronDown, CheckCircle, AlertTriangle, Info, Book, GraduationCap, FileText, University as UniIcon, Loader2, ChevronRight, X } from 'lucide-react';
import { AuthService } from '@/lib/services/authService';
import { getInitials, getAvatarColor } from '@/lib/utils';
import { NotificationService } from '@/lib/services/notificationService';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

interface HeaderProps {
    userName?: string;
    userEmail?: string;
    userAvatar?: string; // Standardize on userAvatar but support avatarUrl just in case
    avatarUrl?: string;  // Keep for backwards compatibility if needed
    isPremium?: boolean;
}

const Header: React.FC<HeaderProps> = ({ userName, userEmail, userAvatar, avatarUrl, isPremium = false }) => {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [recentNotifications, setRecentNotifications] = useState<any[]>([]);

    // Live Search State
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);

    const displayAvatar = userAvatar || avatarUrl;

    useEffect(() => {
        const fetchNotifications = async () => {
            const user = AuthService.getCurrentUser();
            if (user) {
                const { count } = await NotificationService.getUnreadCount(user.id);
                setUnreadCount(count);

                // Also get recent ones for dropdown
                const { notifications } = await NotificationService.getUserNotifications(user.id);
                if (notifications) {
                    setRecentNotifications(notifications.slice(0, 5));
                }
            }
        };

        fetchNotifications();

        // 1. Setup Real-time subscription
        const user = AuthService.getCurrentUser();
        if (!user) return;

        const channel = supabase
            .channel(`notifs-${user.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'notification_recipients',
                filter: `user_id=eq.${user.id}`
                // Correct syntax for filter: it needs to be a string that matches the format expected by Supabase
            }, () => {
                fetchNotifications();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        const performLiveSearch = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                setShowSearchDropdown(false);
                return;
            }

            setIsSearching(true);
            setShowSearchDropdown(true);

            try {
                const results: any[] = [];
                const q = searchQuery.toLowerCase();

                // Search Unis
                const { data: unis } = await supabase.from('universities').select('id, name').ilike('name', `%${q}%`).limit(3);
                unis?.forEach(u => results.push({ id: u.id, title: u.name, type: 'university', link: '/university' }));

                // Search Subjects
                const { data: subs } = await supabase.from('subjects').select('id, name').ilike('name', `%${q}%`).limit(3);
                subs?.forEach(s => results.push({ id: s.id, title: s.name, type: 'subject', link: '/university' }));

                // Search Topics
                const { data: topics } = await supabase.from('topics').select('id, name').ilike('name', `%${q}%`).limit(3);
                topics?.forEach(t => results.push({ id: t.id, title: t.name, type: 'topic', link: '/university' }));

                setSearchResults(results);
            } catch (err) {
                console.error(err);
            } finally {
                setIsSearching(false);
            }
        };

        const timer = setTimeout(performLiveSearch, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            setShowSearchDropdown(false);
            window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
        }
    };

    const getIcon = (category: string) => {
        switch (category) {
            case 'alert': return <AlertTriangle className="w-4 h-4 text-red-500" />;
            case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'info': default: return <Info className="w-4 h-4 text-blue-500" />;
        }
    };

    const renderMessage = (text: string) => {
        if (!text) return null;
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    return (
        <header className="fixed top-0 left-64 right-0 h-16 bg-white/80 backdrop-blur-lg border-b border-gray-200 z-30">
            <div className="h-full px-6 flex items-center justify-between">
                {/* Search Bar */}
                <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search curricula, topics, or questions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => searchQuery.trim() && setShowSearchDropdown(true)}
                            className="w-full pl-12 pr-12 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => { setSearchQuery(''); setShowSearchDropdown(false); }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 hover:bg-gray-200 p-1 rounded-full transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        )}

                        {/* Search Results Dropdown */}
                        {showSearchDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quick Results</span>
                                    {isSearching && <Loader2 className="w-3 h-3 text-indigo-600 animate-spin" />}
                                </div>
                                <div className="max-h-[400px] overflow-y-auto">
                                    {searchResults.length > 0 ? (
                                        searchResults.map((res, i) => (
                                            <Link
                                                key={i}
                                                href={res.link}
                                                onClick={() => setShowSearchDropdown(false)}
                                                className="flex items-center justify-between p-4 hover:bg-indigo-50/50 transition-colors group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-white transition-colors">
                                                        {res.type === 'university' && <UniIcon className="w-4 h-4 text-indigo-500" />}
                                                        {res.type === 'subject' && <Book className="w-4 h-4 text-purple-500" />}
                                                        {res.type === 'topic' && <GraduationCap className="w-4 h-4 text-blue-500" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-700">{res.title}</p>
                                                        <p className="text-[10px] uppercase font-black tracking-tighter text-slate-400">{res.type}</p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                                            </Link>
                                        ))
                                    ) : !isSearching ? (
                                        <div className="p-8 text-center">
                                            <p className="text-sm text-slate-400 font-medium italic">No instant matches found</p>
                                        </div>
                                    ) : null}
                                </div>
                                {searchQuery.trim() && (
                                    <button
                                        onClick={handleSearch}
                                        className="w-full p-4 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        See all results for "{searchQuery}"
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </form>

                {/* Right Section */}
                <div className="flex items-center gap-4 ml-6">
                    {/* Notifications */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-all active:scale-95"
                        >
                            <Bell className="w-5 h-5 text-slate-600" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 border-2 border-white shadow-sm scale-110 animate-pulse">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notifications Dropdown */}
                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden animate-scale-in z-50">
                                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                                    <span className="font-semibold text-gray-900">Notifications</span>
                                    {unreadCount > 0 && (
                                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                                            {unreadCount} new
                                        </span>
                                    )}
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {recentNotifications.length > 0 ? (
                                        recentNotifications.map((notif, i) => (
                                            <div
                                                key={i}
                                                onClick={async () => {
                                                    const user = AuthService.getCurrentUser();
                                                    if (!notif.read_at && user) {
                                                        await NotificationService.markAsRead(notif.id, user.id);
                                                    }

                                                    if (user?.role === 'student') {
                                                        window.location.href = '/notifications';
                                                    } else if (user?.role === 'institution_admin') {
                                                        window.location.href = '/institution-admin/notifications';
                                                    } else {
                                                        window.location.href = '/admin/notifications';
                                                    }
                                                }}
                                                className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.read_at ? 'bg-indigo-50/30' : ''}`}
                                            >
                                                <div className="flex gap-3">
                                                    <div className="mt-0.5 shrink-0">{getIcon(notif.category)}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-semibold text-gray-900 truncate">{notif.title}</h4>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                                                {notif.institution_name || notif.sender_role?.replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{renderMessage(notif.message)}</p>
                                                        <span className="text-[10px] text-gray-400 mt-2 block">
                                                            {new Date(notif.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    {notif.image_url && (
                                                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 shrink-0 shadow-sm mt-1">
                                                            <img src={notif.image_url} className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center text-gray-400">
                                            <p className="text-sm">No recent notifications</p>
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                                    <button
                                        onClick={() => {
                                            const user = AuthService.getCurrentUser();
                                            if (user?.role === 'student') window.location.href = '/notifications';
                                            else if (user?.role === 'institution_admin') window.location.href = '/institution-admin/notifications';
                                            else window.location.href = '/admin/notifications';
                                        }}
                                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                                    >
                                        View All Notifications
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User Profile */}
                    <div className="relative">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center gap-3 px-3 py-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            {displayAvatar ? (
                                <img
                                    src={displayAvatar}
                                    alt={userName}
                                    className="w-8 h-8 rounded-full object-cover"
                                />
                            ) : (
                                <div className={`w-8 h-8 rounded-full ${getAvatarColor(userName)} flex items-center justify-center`}>
                                    <span className="text-white text-sm font-semibold">
                                        {getInitials(userName)}
                                    </span>
                                </div>
                            )}
                            <div className="text-left hidden md:block">
                                <p className="text-sm font-medium text-gray-900">{userName}</p>
                                {isPremium && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                                        Premium
                                    </span>
                                )}
                            </div>
                            <ChevronDown className="w-4 h-4 text-gray-600 hidden md:block" />
                        </button>

                        {/* User Dropdown */}
                        {showUserMenu && (
                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden animate-scale-in">
                                <div className="p-4 border-b border-gray-100">
                                    <p className="font-semibold text-gray-900">{userName}</p>
                                    <p className="text-sm text-gray-500 mt-0.5">{userEmail}</p>
                                </div>
                                <div className="p-2">
                                    <a
                                        href="/profile"
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <User className="w-4 h-4 text-gray-600" />
                                        <span className="text-sm text-gray-700">View Profile</span>
                                    </a>
                                    <button
                                        onClick={async () => {
                                            await AuthService.logout();
                                            window.location.href = '/login';
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                                    >
                                        <span className="text-sm font-medium">Sign Out</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
