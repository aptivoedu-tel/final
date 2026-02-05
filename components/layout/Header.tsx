'use client';

import React, { useState, useEffect } from 'react';
import { Search, Bell, User, ChevronDown, CheckCircle, AlertTriangle, Info, Book, GraduationCap, FileText, University as UniIcon, Loader2, ChevronRight, X, Menu } from 'lucide-react';
import { useUI } from '@/lib/context/UIContext';
import { AuthService } from '@/lib/services/authService';
import { getInitials, getAvatarColor } from '@/lib/utils';
import { NotificationService } from '@/lib/services/notificationService';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface HeaderProps {
    userName?: string;
    userEmail?: string;
    userAvatar?: string; // Standardize on userAvatar but support avatarUrl just in case
    avatarUrl?: string;  // Keep for backwards compatibility if needed
    isPremium?: boolean;
}

const Header: React.FC<HeaderProps> = ({ userName, userEmail, userAvatar, avatarUrl, isPremium = false }) => {
    const { toggleSidebar, isSidebarCollapsed, isSidebarOpen } = useUI();
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

    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            const user = AuthService.getCurrentUser();
            if (user) {
                setUserRole(user.role);
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
                const isSuperAdmin = userRole === 'super_admin';
                const isInstitutionAdmin = userRole === 'institution_admin';

                // Search Unis
                const { data: unis } = await supabase.from('universities').select('id, name').ilike('name', `%${q}%`).limit(3);
                unis?.forEach(u => {
                    let link = `/university?id=${u.id}`;
                    if (isSuperAdmin) link = `/admin/universities?id=${u.id}`;
                    else if (isInstitutionAdmin) link = `/institution-admin/universities?id=${u.id}`;

                    results.push({
                        id: u.id,
                        title: u.name,
                        type: 'university',
                        link
                    });
                });

                // Search Subjects
                const { data: subs } = await supabase.from('subjects').select('id, name').ilike('name', `%${q}%`).limit(3);
                subs?.forEach(s => {
                    let link = `/university?search=${encodeURIComponent(s.name)}`;
                    if (isSuperAdmin) link = `/admin/content-editor?subject=${s.id}`;

                    results.push({
                        id: s.id,
                        title: s.name,
                        type: 'subject',
                        link
                    });
                });

                // Search Topics
                const { data: topics } = await supabase.from('topics').select('id, name').ilike('name', `%${q}%`).limit(3);
                topics?.forEach(t => {
                    let link = `/university?search=${encodeURIComponent(t.name)}`;
                    if (isSuperAdmin) link = `/admin/content-editor?topic=${t.id}`;

                    results.push({
                        id: t.id,
                        title: t.name,
                        type: 'topic',
                        link
                    });
                });

                // Search Subtopics
                const { data: subtopics } = await supabase.from('subtopics').select('id, name').ilike('name', `%${q}%`).limit(3);
                subtopics?.forEach(st => {
                    let link = `/university?search=${encodeURIComponent(st.name)}`;
                    if (isSuperAdmin) link = `/admin/content-editor?subtopic=${st.id}`;

                    results.push({
                        id: st.id,
                        title: st.name,
                        type: 'subtopic',
                        link
                    });
                });

                setSearchResults(results);
            } catch (err) {
                console.error(err);
            } finally {
                setIsSearching(false);
            }
        };

        const timer = setTimeout(performLiveSearch, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, userRole]);

    const router = useRouter();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            setShowSearchDropdown(false);
            router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
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
        <header className={`fixed top-4 right-4 h-16 lg:h-14 rounded-2xl border z-40 transition-all duration-300 shadow-xl
            bg-white/95 backdrop-blur-md border-slate-200/80
            ${isSidebarCollapsed ? 'lg:left-24 left-4' : 'lg:left-72 left-4'}
            ${isSidebarOpen ? 'max-lg:opacity-0 max-lg:pointer-events-none' : 'max-lg:opacity-100'}
        `}>
            <div className="h-full px-4 lg:px-5 flex items-center justify-between gap-4">
                <button
                    onClick={toggleSidebar}
                    className="p-2 mr-2 rounded-lg lg:hidden transition-colors text-slate-600 hover:bg-slate-100"
                >
                    <Menu className="w-5 h-5" />
                </button>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => searchQuery.trim() && setShowSearchDropdown(true)}
                            className="w-full pl-8 lg:pl-10 pr-8 py-1.5 lg:py-2 rounded-xl border text-[11px] lg:text-sm transition-all focus:outline-none focus:ring-2 bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400 focus:ring-teal-500/20 focus:border-teal-500"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => { setSearchQuery(''); setShowSearchDropdown(false); }}
                                className="absolute right-2 lg:right-4 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors hover:bg-slate-200"
                            >
                                <X className="w-3 h-3 lg:w-4 lg:h-4 text-slate-500" />
                            </button>
                        )}

                        {/* Search Results Dropdown */}
                        {showSearchDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quick Results</span>
                                    {isSearching && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
                                </div>
                                <div className="max-h-[400px] overflow-y-auto">
                                    {searchResults.length > 0 ? (
                                        searchResults.map((res, i) => (
                                            <Link
                                                key={i}
                                                href={res.link}
                                                onClick={() => setShowSearchDropdown(false)}
                                                className="flex items-center justify-between p-4 hover:bg-primary/5 transition-colors group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-white transition-colors">
                                                        {res.type === 'university' && <UniIcon className="w-4 h-4 text-primary-dark" />}
                                                        {res.type === 'subject' && <Book className="w-4 h-4 text-primary-dark" />}
                                                        {res.type === 'topic' && <GraduationCap className="w-4 h-4 text-primary-dark" />}
                                                        {res.type === 'subtopic' && <FileText className="w-4 h-4 text-primary-dark" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-700">{res.title}</p>
                                                        <p className="text-[10px] uppercase font-black tracking-tighter text-slate-400">{res.type}</p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
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
                                        className="w-full p-4 bg-primary text-white text-xs font-black uppercase tracking-widest hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
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
                <div className="flex items-center gap-2 lg:gap-4 shrink-0">
                    {/* Notifications */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="relative p-2.5 rounded-xl transition-all active:scale-95 hover:bg-slate-100"
                        >
                            <Bell className="w-5 h-5 stroke-[2.5] text-slate-800" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 border-2 shadow-sm scale-110 border-white">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notifications Dropdown */}
                        {showNotifications && (
                            <div className="absolute right-[-45px] sm:right-0 mt-2 w-[calc(100vw-2.5rem)] sm:w-80 rounded-2xl shadow-xl border overflow-hidden animate-scale-in z-50 bg-white border-gray-200">
                                <div className="p-4 border-b flex justify-between items-center border-gray-100">
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
                                                className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.read_at ? 'bg-primary/5' : ''}`}
                                            >
                                                <div className="flex gap-3">
                                                    <div className="mt-0.5 shrink-0">{getIcon(notif.category)}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-semibold text-gray-900 truncate">{notif.title}</h4>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[9px] uppercase font-bold tracking-wider text-primary-dark bg-primary/10 px-1.5 py-0.5 rounded">
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
                                        className="text-sm font-medium text-primary-dark hover:text-primary"
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
                            className="flex items-center gap-3 px-3 py-2 rounded-full transition-colors hover:bg-gray-100"
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
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-black leading-tight text-slate-900">{userName || 'Student User'}</p>
                                <p className="text-[10px] font-bold truncate max-w-[120px] text-slate-600">{userEmail || 'student@stanford.edu'}</p>
                                {isPremium && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                                        Premium
                                    </span>
                                )}
                            </div>
                            <ChevronDown className="w-4 h-4 hidden md:block text-gray-600" />
                        </button>

                        {/* User Dropdown */}
                        {showUserMenu && (
                            <div className="absolute right-0 mt-2 w-64 rounded-2xl shadow-xl border overflow-hidden animate-scale-in bg-white border-gray-200">
                                <div className="p-4 border-b border-gray-100">
                                    <p className="font-semibold text-gray-900">{userName}</p>
                                    <p className="text-sm mt-0.5 text-gray-500">{userEmail}</p>
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
