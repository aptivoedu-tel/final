'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUI } from '@/lib/context/UIContext';
import { AuthService } from '@/lib/services/authService';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import UniversityExamManager from '@/components/features/UniversityExamManager';

export default function UniversityExamsPage() {
    const params = useParams();
    const router = useRouter();
    const { isSidebarCollapsed } = useUI();
    const [user, setUser] = React.useState<any>(null);
    const uniId = parseInt(params.uniId as string);

    React.useEffect(() => {
        const currentUser = AuthService.getCurrentUser();
        if (currentUser) setUser(currentUser);
    }, []);

    const userRole = user?.role || 'super_admin';

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">
            <Sidebar userRole={userRole as any} />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header userName={user?.full_name || 'Admin'} userEmail={user?.email || 'admin@aptivo.edu'} />
                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8 flex flex-col min-h-0">
                    <UniversityExamManager
                        uniId={uniId}
                        userRole={userRole}
                        onBack={() => router.push('/admin/universities')}
                    />
                </main>
            </div>
        </div>
    );
}
