'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    BookOpen,
    Target,
    Brain,
    TrendingUp,
    FolderTree,
    Users,
    Settings,
    FileUp,
    University,
    LogOut,
    UploadCloud,
    FileText,
    Network,
    Bell,
    Building2,
    MessageSquare,
    X
} from 'lucide-react';
import { useUI } from '@/lib/context/UIContext';
import { AuthService } from '@/lib/services/authService';

interface SidebarProps {
    userRole: 'super_admin' | 'institution_admin' | 'student';
}

const Sidebar: React.FC<SidebarProps> = ({ userRole }) => {
    const { isSidebarOpen, closeSidebar } = useUI();
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    const handleLogout = async () => {
        await AuthService.logout();
        window.location.href = '/login';
    };

    // Navigation items based on user role
    const getNavItems = () => {
        const studentItems = [
            { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', section: 'General' },
            { icon: University, label: 'University Practice', href: '/university', section: 'General' },
            { icon: Target, label: 'Practice', href: '/practice', section: 'General' },
            { icon: TrendingUp, label: 'Progress', href: '/progress', section: 'General' },
            { icon: Bell, label: 'Notifications', href: '/notifications', section: 'General' },
            { icon: Users, label: 'Profile', href: '/profile', section: 'General' },
        ];

        const adminItems = [
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
            { icon: MessageSquare, label: 'User Feedback', href: '/admin/feedbacks', section: 'Account' },
        ];

        const institutionItems = [
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
    const isAdmin = userRole !== 'student';

    return (
        <>
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={closeSidebar}
                />
            )}

            <aside className={`fixed top-0 bottom-0 left-0 w-64 border-r flex flex-col z-50 transition-all duration-300 transform 
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                ${isAdmin ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-gray-200'}
            `}>
                {/* Logo */}
                <div className={`p-6 border-b flex items-center justify-between ${isAdmin ? 'border-slate-700' : 'border-gray-200'}`}>
                    <Link href={isAdmin ? "/admin/dashboard" : "/dashboard"} className="flex items-center gap-3" onClick={closeSidebar}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                            <span className="text-white font-bold text-xl">A</span>
                        </div>
                        <div>
                            <span className={`text-xl font-bold block leading-none ${isAdmin ? 'text-white' : 'gradient-text'}`}>
                                {isAdmin ? 'Aptivo Admin' : 'Aptivo'}
                            </span>
                        </div>
                    </Link>
                    <button
                        onClick={closeSidebar}
                        className={`p-1 rounded-lg lg:hidden ${isAdmin ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <div className="space-y-1">
                        {navItems.map((item: any, i) => {
                            if (item.header) {
                                return (
                                    <div key={i} className={`px-4 mt-6 mb-2 text-[10px] font-black uppercase tracking-widest ${isAdmin ? 'text-slate-500' : 'text-gray-400'}`}>
                                        {item.header}
                                    </div>
                                );
                            }

                            const Icon = item.icon;
                            const active = isActive(item.href);

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => closeSidebar()}
                                    className={`
                                        flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1
                                        ${isAdmin
                                            ? (active
                                                ? 'bg-primary text-white shadow-lg shadow-primary/20 font-medium'
                                                : 'text-slate-400 hover:bg-slate-800 hover:text-white')
                                            : (active
                                                ? 'bg-primary/10 text-primary-dark font-medium'
                                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900')
                                        }
                                    `}
                                >
                                    <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : ''}`} />
                                    <span className="text-sm">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* User Section */}
                <div className={`p-4 border-t ${isAdmin ? 'border-slate-700' : 'border-gray-200'}`}>
                    <button
                        onClick={handleLogout}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full ${isAdmin
                            ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            : 'text-gray-600 hover:bg-red-50 hover:text-red-600'
                            }`}
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="text-sm font-medium">Logout</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
