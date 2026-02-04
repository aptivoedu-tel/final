'use client';

import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { Toaster } from 'sonner';

import { useUI } from '@/lib/context/UIContext';

export default function InstitutionAdminLayout({ children }: { children: React.ReactNode }) {
    // In a real app, verify user role here or in middleware
    const userRole = 'institution_admin';
    const { isSidebarCollapsed } = useUI();

    return (
        <div className="flex h-screen bg-gray-50 font-sans transition-all duration-300">
            <Sidebar userRole={userRole} />
            <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header
                    userName="Institution Admin"
                    userEmail="admin@institution.edu"
                />
                <main className="flex-1 overflow-auto px-8 pb-8 pt-28 lg:pt-24">
                    {children}
                </main>
            </div>
            <Toaster position="top-right" />
        </div>
    );
}
