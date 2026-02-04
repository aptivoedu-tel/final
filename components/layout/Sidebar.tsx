'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    BookOpen,
    Target,
    TrendingUp,
    FolderTree,
    Users,
    University,
    LogOut,
    UploadCloud,
    FileText,
    Network,
    Bell,
    Building2,
    X,
    GraduationCap,
    Search,
    Sun,
    Moon,
    MessageSquare
} from 'lucide-react';
import { useUI } from '@/lib/context/UIContext';
import { AuthService } from '@/lib/services/authService';

interface SidebarProps {
    userRole: 'super_admin' | 'institution_admin' | 'student';
}

const Sidebar: React.FC<SidebarProps> = ({ userRole }) => {
    const { isSidebarOpen, closeSidebar, isSidebarCollapsed, setSidebarCollapsed } = useUI();
    const pathname = usePathname();

    const isActive = (path: string, exact = false) => {
        if (exact) return pathname === path;
        // special case for root dashboard paths to prevent double highlighting
        if (path === '/admin/dashboard' || path === '/institution-admin' || path === '/dashboard') {
            return pathname === path;
        }
        return pathname === path || pathname.startsWith(path + '/');
    };

    const handleLogout = async () => {
        await AuthService.logout();
        window.location.href = '/login';
    };

    const isSuperAdmin = userRole === 'super_admin';
    const isAdmin = userRole !== 'student';

    // Force expanded state for Super Admin
    useEffect(() => {
        if (isSuperAdmin) {
            setSidebarCollapsed(false);
        }
    }, [isSuperAdmin, setSidebarCollapsed]);

    // Navigation items based on user role
    const getNavItems = () => {
        const studentItems = [
            { icon: Search, label: 'Search...', href: '/search', section: 'General' },
            { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', section: 'General' },
            { icon: University, label: 'University Library', href: '/university', section: 'General' },
            { icon: TrendingUp, label: 'Progress', href: '/progress', section: 'General' },
            { icon: Bell, label: 'Notifications', href: '/notifications', section: 'General' },
            { icon: Users, label: 'Profile', href: '/profile', section: 'General' },
        ];

        const adminItems = [
            { icon: Search, label: 'Search...', href: '/admin/search', section: 'Main' },
            { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard', section: 'Main' },
            { icon: Bell, label: 'Notifications', href: '/admin/notifications', section: 'Main' },
            { icon: TrendingUp, label: 'Analytics', href: '/admin/analytics', section: 'Main' },

            { header: 'ECOSYSTEM' },
            { icon: University, label: 'Universities', href: '/admin/universities', section: 'Ecosystem' },
            { icon: Building2, label: 'Institutions', href: '/admin/institutions', section: 'Ecosystem' },
            { icon: UploadCloud, label: 'Excel Uploader', href: '/admin/excel-uploader', section: 'Ecosystem' },

            { header: 'HIERARCHY FORGE' },
            { icon: Network, label: 'Hierarchy Manager', href: '/admin/hierarchy-manager', section: 'Hierarchy' },
            { icon: FileText, label: 'Content Editor', href: '/admin/content-editor', section: 'Hierarchy' },
            { icon: BookOpen, label: 'Content Library', href: '/admin/content-library', section: 'Hierarchy' },
            { icon: Target, label: 'Question Bank', href: '/admin/question-bank', section: 'Hierarchy' },
            { icon: FolderTree, label: 'Uni. Content Mapper', href: '/admin/university-mapper', section: 'Hierarchy' },

            { header: 'ACCOUNT' },
            { icon: Users, label: 'Profile', href: '/admin/profile', section: 'Account' },
            { icon: MessageSquare, label: 'Feedback', href: '/admin/feedbacks', section: 'Account' },
        ];

        const institutionItems = [
            { icon: Search, label: 'Search...', href: '/institution-admin/search', section: 'Main' },
            { icon: LayoutDashboard, label: 'Dashboard', href: '/institution-admin', section: 'Main' },
            { icon: Users, label: 'Manage Students', href: '/institution-admin/students', section: 'Main' },
            { icon: Building2, label: 'University Access', href: '/institution-admin/universities', section: 'Main' },
            { icon: Bell, label: 'Notifications', href: '/institution-admin/notifications', section: 'Main' },
            { icon: TrendingUp, label: 'Analytics', href: '/institution-admin/analytics', section: 'Main' },
        ];

        if (userRole === 'student') return studentItems;
        if (userRole === 'institution_admin') return institutionItems;
        return adminItems;
    };

    const navItems = getNavItems();

    // Color Palette Constants
    const deepOlive = '#1A2517';
    const softSage = '#ACC8A2';

    return (
        <>
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 lg:hidden"
                    onClick={closeSidebar}
                />
            )}

            <aside
                onMouseEnter={() => !isSuperAdmin && setSidebarCollapsed(false)}
                onMouseLeave={() => !isSuperAdmin && setSidebarCollapsed(true)}
                className={`fixed top-4 bottom-4 flex flex-col z-50 transition-all duration-300 transform 
                ${isSidebarOpen
                        ? 'left-4 translate-x-0'
                        : '-translate-x-full left-0 lg:left-4 lg:translate-x-0'
                    }
                bg-white border-slate-200/80
                ${isSidebarCollapsed ? 'w-[72px]' : 'w-64'}
                rounded-[1.5rem] shadow-2xl border
            `}>
                {/* Logo */}
                <div className={`p-4 h-20 border-b flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} border-slate-100`}>
                    <Link href={isAdmin ? "/admin/dashboard" : "/dashboard"} className="flex items-center gap-3" onClick={closeSidebar}>
                        <div className="w-10 h-10 min-w-[40px] rounded-xl flex items-center justify-center bg-teal-600 text-white">
                            <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="animate-in fade-in slide-in-from-left-2 duration-200">
                                <span className="text-lg font-bold block leading-tight text-slate-800">
                                    Aptivo
                                </span>
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                    {isAdmin ? 'Portal Admin' : 'Student Portal'}
                                </span>
                            </div>
                        )}
                    </Link>
                    {!isSidebarCollapsed && (
                        <button
                            onClick={closeSidebar}
                            className="p-1.5 rounded-lg lg:hidden ml-auto text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                    <div className="space-y-3">
                        {navItems.map((item: any, i) => {
                            if (item.header) {
                                return !isSidebarCollapsed && (
                                    <div key={i} className="px-4 mt-8 mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                        {item.header}
                                    </div>
                                );
                            }

                            const Icon = item.icon;
                            const active = isActive(item.href);
                            const isSearch = item.label === 'Search...';

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    title={isSidebarCollapsed ? item.label : ''}
                                    onClick={() => closeSidebar()}
                                    className={`
                                        flex items-center transition-all duration-300 group
                                        ${isSidebarCollapsed ? 'px-1' : 'px-3'}
                                        py-3 rounded-2xl
                                        ${active
                                            ? 'bg-teal-600 text-white shadow-xl shadow-teal-100'
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-teal-600'
                                        }
                                        ${isSearch ? 'mb-8 bg-slate-50 border border-slate-100 font-bold' : ''}
                                    `}
                                >
                                    <div className="w-10 flex-shrink-0 flex items-center justify-center">
                                        <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
                                    </div>
                                    {!isSidebarCollapsed && (
                                        <span className="ml-2 text-sm font-bold whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
                                            {item.label}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                <div className="p-3 border-t border-slate-100">
                    <button
                        onClick={handleLogout}
                        title={isSidebarCollapsed ? "Logout" : ""}
                        className={`
                            flex items-center transition-all duration-300 w-full group py-3 rounded-2xl
                            ${isSidebarCollapsed ? 'px-1' : 'px-3'}
                            text-slate-500 hover:bg-red-50 hover:text-red-600
                        `}
                    >
                        <div className="w-10 flex-shrink-0 flex items-center justify-center">
                            <LogOut className="w-5 h-5 stroke-[1.5]" />
                        </div>
                        {!isSidebarCollapsed && (
                            <span className="ml-2 text-sm font-bold whitespace-nowrap">Logout</span>
                        )}
                    </button>
                </div>
            </aside >
        </>
    );
};

export default Sidebar;
