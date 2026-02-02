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
    Building2
} from 'lucide-react';
import { AuthService } from '@/lib/services/authService';

interface SidebarProps {
    userRole: 'super_admin' | 'institution_admin' | 'student';
}

const Sidebar: React.FC<SidebarProps> = ({ userRole }) => {
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
            { icon: Building2, label: 'Manage Universities', href: '/admin/universities', section: 'Main' },
            { icon: Building2, label: 'Manage Institutions', href: '/admin/institutions', section: 'Main' },
            { icon: University, label: 'Uni. Content Mapper', href: '/admin/university-mapper', section: 'Main' },
            { icon: FileText, label: 'Content Editor', href: '/admin/content-editor', section: 'Main' },
            { icon: Network, label: 'Hierarchy Manager', href: '/admin/hierarchy-manager', section: 'Main' },
            { icon: UploadCloud, label: 'Excel Uploader', href: '/admin/excel-uploader', section: 'Main' },
            { icon: Bell, label: 'Notifications', href: '/admin/notifications', section: 'Main' },
            { icon: TrendingUp, label: 'Analytics', href: '/admin/analytics', section: 'Main' },
            { icon: Users, label: 'Profile', href: '/admin/profile', section: 'Main' },
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
        <aside className={`fixed left-0 top-0 h-full w-64 border-r flex flex-col z-40 transition-colors ${isAdmin ? 'bg-[#1e1b4b] border-[#312e81]' : 'bg-white border-gray-200'
            }`}>
            {/* Logo */}
            <div className={`p-6 border-b ${isAdmin ? 'border-[#312e81]' : 'border-gray-200'}`}>
                <Link href={isAdmin ? "/admin/dashboard" : "/dashboard"} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                        <span className="text-white font-bold text-xl">A</span>
                    </div>
                    <div>
                        <span className={`text-xl font-bold block leading-none ${isAdmin ? 'text-white' : 'gradient-text'}`}>
                            {isAdmin ? 'Aptivo Admin' : 'Aptivo'}
                        </span>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4">
                <div className="space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1
                                    ${isAdmin
                                        ? (active
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20 font-medium'
                                            : 'text-indigo-200 hover:bg-[#312e81] hover:text-white')
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
            <div className={`p-4 border-t ${isAdmin ? 'border-[#312e81]' : 'border-gray-200'}`}>
                <button
                    onClick={handleLogout}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full ${isAdmin
                        ? 'text-indigo-200 hover:bg-[#312e81] hover:text-white'
                        : 'text-gray-600 hover:bg-red-50 hover:text-red-600'
                        }`}
                >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-medium">Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
