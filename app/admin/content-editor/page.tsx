'use client';

import React from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ContentEditor from '@/components/features/ContentEditor';
import { useUI } from '@/lib/context/UIContext';
import { AuthService } from '@/lib/services/authService';

export default function ContentEditorPage() {
    const [user, setUser] = React.useState<any>(null);
    const { isSidebarCollapsed } = useUI();

    React.useEffect(() => {
        const currentUser = AuthService.getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
        }
    }, []);

    const userRole = user?.role || 'super_admin';

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole={userRole as any} />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name || 'Admin'} userEmail={user?.email || 'admin@aptivo.edu'} />
                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8 flex flex-col min-h-0">
                    <ContentEditor />
                </main>
            </div>
        </div>
    );
}
