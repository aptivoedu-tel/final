'use client';

import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { Toaster } from 'sonner';
import { AuthService } from '@/lib/services/authService';

import { useUI } from '@/lib/context/UIContext';

import Footer from '@/components/shared/Footer';

export default function InstitutionAdminLayout({ children }: { children: React.ReactNode }) {
    const userRole = 'institution_admin';
    const { isSidebarCollapsed } = useUI();
    const [user, setUser] = React.useState<{ full_name: string; email: string } | null>(null);

    React.useEffect(() => {
        const currentUser = AuthService.getCurrentUser();
        if (currentUser) {
            setUser({
                full_name: currentUser.full_name,
                email: currentUser.email
            });
        }
    }, []);

    return (
        <div className="flex h-screen bg-gray-50 font-sans transition-all duration-300">
            <Sidebar userRole={userRole} />
            <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header
                    userName={user?.full_name}
                    userEmail={user?.email}
                />
                <main className="flex-1 overflow-auto px-8 pb-8 pt-28 lg:pt-24">
                    {children}
                    <Footer />
                </main>
            </div>
            <Toaster position="top-right" />
        </div>
    );
}
