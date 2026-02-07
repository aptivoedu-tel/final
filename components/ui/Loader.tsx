'use client';

import React from 'react';
import { GraduationCap } from 'lucide-react';

interface LoaderProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    text?: string;
    fullScreen?: boolean;
}

export default function Loader({ size = 'md', text, fullScreen = false }: LoaderProps) {
    const sizeMap = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-20 h-20',
        xl: 'w-32 h-32'
    };

    const iconSizeMap = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-10 h-10',
        xl: 'w-16 h-16'
    };

    const content = (
        <div className="flex flex-col items-center justify-center gap-6 animate-in fade-in duration-500" aria-busy="true" role="status">
            <div className={`relative ${sizeMap[size]} flex items-center justify-center`}>
                {/* Revolving Circle */}
                <div className="absolute inset-0 border-4 border-emerald-50 rounded-full" />
                <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin" />

                {/* Mortarboard Logo */}
                <div className="relative z-10 text-emerald-600">
                    <GraduationCap className={iconSizeMap[size]} />
                </div>

                {/* Pulsing Glow */}
                <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-xl animate-pulse" />
            </div>

            {text && (
                <p className="text-emerald-800 font-black text-[10px] lg:text-xs uppercase tracking-[0.2em] animate-pulse">
                    {text}
                </p>
            )}
            <span className="sr-only">Loading...</span>
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 z-[9999] bg-white/90 backdrop-blur-md flex items-center justify-center">
                {content}
            </div>
        );
    }

    return content;
}
