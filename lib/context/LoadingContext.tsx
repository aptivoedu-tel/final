'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import Loader from '@/components/ui/Loader';
import { usePathname, useSearchParams } from 'next/navigation';

interface LoadingContextType {
    isLoading: boolean;
    setLoading: (loading: boolean, text?: string) => void;
    startLoading: (text?: string) => void;
    stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

function LoadingManager() {
    const { setLoading } = useLoading();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Reset loading on route change to prevent stuck loaders
        const timer = setTimeout(() => {
            setLoading(false);
        }, 500); // Small buffer

        return () => clearTimeout(timer);
    }, [pathname, searchParams, setLoading]);

    return null;
}

export function LoadingProvider({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoadingState] = useState(false);
    const [loadingText, setLoadingText] = useState('Loading...');

    const setLoading = (loading: boolean, text: string = 'Loading...') => {
        setLoadingText(text);
        setIsLoadingState(loading);
    };

    const startLoading = (text: string = 'Loading...') => {
        setLoadingText(text);
        setIsLoadingState(true);
    };

    const stopLoading = () => {
        setIsLoadingState(false);
    };

    return (
        <LoadingContext.Provider value={{ isLoading, setLoading, startLoading, stopLoading }}>
            {children}
            {isLoading && (
                <div className="fixed inset-0 z-[99999] bg-white/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
                    <Loader size="lg" text={loadingText} />
                </div>
            )}
            <React.Suspense fallback={null}>
                <LoadingManager />
            </React.Suspense>
        </LoadingContext.Provider>
    );
}

export function useLoading() {
    const context = useContext(LoadingContext);
    if (!context) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context;
}
