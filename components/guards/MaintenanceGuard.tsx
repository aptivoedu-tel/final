'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthService } from '@/lib/services/authService';
import { useLoading } from '@/lib/context/LoadingContext';

export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        const checkMaintenance = async () => {
            // Bypass list: Never block maintenance, login, or auth routes
            const bypassRoutes = ['/maintenance', '/login', '/api/auth'];
            if (bypassRoutes.some(route => pathname.startsWith(route))) {
                setIsAuthorized(true);
                return;
            }

            try {
                // Synchronize session to ensure we have current user role
                const user = await AuthService.syncSession();

                const res = await fetch(`/api/mongo/admin/settings?t=${Date.now()}`, {
                    cache: 'no-store',
                    headers: { 'Pragma': 'no-cache' }
                });
                if (res.ok) {
                    const data = await res.json();
                    const isMaintMode = !!data.settings?.maintenance_mode;
                    const isSuperAdmin = user?.role === 'super_admin';

                    // LOG for debugging (can be removed later)
                    console.log('[MaintenanceGuard] Status:', { isMaintMode, userRole: user?.role, isSuperAdmin });

                    if (isMaintMode && !isSuperAdmin) {
                        // Regular users get sent to maintenance
                        setIsAuthorized(false);
                        if (pathname !== '/maintenance') {
                            router.replace('/maintenance');
                        }
                    } else {
                        // All good (Mode OFF or User is Super Admin)
                        setIsAuthorized(true);
                        if (!isMaintMode && pathname === '/maintenance') {
                            router.replace('/');
                        }
                    }
                } else {
                    setIsAuthorized(true);
                }
            } catch (error) {
                console.error('Maintenance check failed:', error);
                setIsAuthorized(true);
            }
        };

        checkMaintenance();
    }, [pathname, router]);

    // If we're authorized or on a bypass route, show content
    // Otherwise, show nothing (while redirecting) or a loader
    if (isAuthorized === null) return null; // Or a loading spinner
    if (isAuthorized === false && pathname !== '/maintenance') return null;

    return <>{children}</>;
}
