'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface UIContextType {
    isSidebarOpen: boolean;
    isSidebarCollapsed: boolean;
    isDarkMode: boolean;
    toggleSidebar: () => void;
    closeSidebar: () => void;
    setSidebarCollapsed: (v: boolean) => void;
    toggleDarkMode: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider = ({ children }: { children: ReactNode }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('aptivo_dark_mode') === 'true';
        }
        return false;
    });

    const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
    const closeSidebar = () => setIsSidebarOpen(false);
    const setSidebarCollapsed = (v: boolean) => setIsSidebarCollapsed(v);

    const toggleDarkMode = () => {
        setIsDarkMode(prev => {
            const newValue = !prev;
            localStorage.setItem('aptivo_dark_mode', String(newValue));
            return newValue;
        });
    };

    // Apply dark mode on initial load and changes
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    return (
        <UIContext.Provider value={{
            isSidebarOpen,
            isSidebarCollapsed,
            isDarkMode,
            toggleSidebar,
            closeSidebar,
            setSidebarCollapsed,
            toggleDarkMode
        }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (context === undefined) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};
