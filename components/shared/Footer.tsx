import React from 'react';
import Link from 'next/link';
import { Facebook, Instagram, Linkedin, GraduationCap } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="w-full max-w-[95%] xl:max-w-7xl mx-auto mb-6 bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-[2rem] shadow-sm py-5 mt-auto transition-all hover:shadow-md hover:border-slate-300/60">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
                {/* Left: Aptivo */}
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-teal-600 rounded flex items-center justify-center text-white">
                        <GraduationCap className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-slate-900 tracking-tight">Aptivo</span>
                    <span className="text-xs text-slate-400 font-medium ml-2">© 2026 Aptivo. All rights reserved.</span>
                </div>

                {/* Right: Social Logos */}
                <div className="flex items-center gap-6">
                    <Link
                        href="https://www.facebook.com/share/17EjFzZJWo/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-blue-600 transition-colors"
                    >
                        <Facebook className="w-5 h-5" />
                    </Link>
                    <Link
                        href="https://www.instagram.com/aptivo.education"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-pink-600 transition-colors"
                    >
                        <Instagram className="w-5 h-5" />
                    </Link>
                    <Link
                        href="https://www.linkedin.com/company/aptivoedu"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-blue-700 transition-colors"
                    >
                        <Linkedin className="w-5 h-5" />
                    </Link>
                </div>
            </div>
        </footer>
    );
}
