'use client';

import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { Toaster } from 'sonner';

export default function InstitutionAdminLayout({ children }: { children: React.ReactNode }) {
    // In a real app, verify user role here or in middleware
    const userRole = 'institution_admin';

    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            <Sidebar userRole={userRole} />
            <div className="flex-1 flex flex-col overflow-hidden ml-64">
                <Header
                    userName="Institution Admin"
                    userEmail="admin@institution.edu"
                />
                <main className="flex-1 overflow-auto px-8 pb-8 pt-24">
                    {children}
                </main>
            </div>
            <Toaster position="top-right" />
        </div>
    );
}
