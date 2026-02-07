'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
    User, Mail, Camera, Save, Lock, MapPin,
    Building2, Shield, Activity, Phone,
    CheckCircle, XCircle
} from 'lucide-react';
import { useLoading } from '@/lib/context/LoadingContext';

import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { ProfileService, ProfileData } from '@/lib/services/profileService';
import { useUI } from '@/lib/context/UIContext';

export default function AdminProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [institutions, setInstitutions] = useState<any[]>([]);
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();

    const { isSidebarCollapsed } = useUI();

    // Form States
    const [fullName, setFullName] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setGlobalLoading(true, 'Accessing security clearance...');

        const currentUser = AuthService.getCurrentUser();
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('aptivo_user') : null;
        const activeUser = currentUser || (storedUser ? JSON.parse(storedUser) : null);

        if (!activeUser) {
            window.location.href = '/login';
            return;
        }

        setUser(activeUser);

        try {
            const [profileRes, instRes] = await Promise.all([
                ProfileService.getProfile(activeUser.id),
                ProfileService.getAdminInstitutions(activeUser.id)
            ]);

            if (profileRes.profile) {
                setProfile(profileRes.profile);
                setFullName(profileRes.profile.full_name);
            }
            if (instRes.institutions) setInstitutions(instRes.institutions);

        } catch (error) {
            console.error("Error loading profile:", error);
        } finally {
            setTimeout(() => setGlobalLoading(false), 800);
        }
    };


    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setGlobalLoading(true, 'Updating System Records...');
        setMessage(null);


        if (!profile) return;

        const { success, error } = await ProfileService.updateProfile(profile.id, {
            full_name: fullName
        });

        if (success) {
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            const updatedUser = { ...user, full_name: fullName };
            localStorage.setItem('aptivo_user', JSON.stringify(updatedUser));
            setUser(updatedUser);
        } else {
            setMessage({ type: 'error', text: error || 'Failed to update profile' });
        }
        setGlobalLoading(false);
    };


    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile) return;

        setGlobalLoading(true, 'Publishing Identity Image...');
        setMessage(null);


        const { avatarUrl, error } = await ProfileService.uploadAvatar(profile.id, file);

        if (avatarUrl) {
            setProfile({ ...profile, avatar_url: avatarUrl });
            setMessage({ type: 'success', text: 'Avatar uploaded successfully!' });
            const updatedUser = { ...user, avatar_url: avatarUrl };
            localStorage.setItem('aptivo_user', JSON.stringify(updatedUser));
            setUser(updatedUser);
        } else {
            setMessage({ type: 'error', text: error || 'Failed to upload avatar' });
        }
        setGlobalLoading(false);
    };


    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword || !currentPassword || !profile) return;

        setGlobalLoading(true, 'Synchronizing Security Credentials...');
        setMessage(null);

        const { success, error } = await ProfileService.changePassword(profile.id, {
            currentPassword,
            newPassword
        });

        if (success) {
            setMessage({ type: 'success', text: 'Password changed successfully!' });
            setCurrentPassword('');
            setNewPassword('');
        } else {
            setMessage({ type: 'error', text: error || 'Failed to change password' });
        }
        setGlobalLoading(false);
    };

    if (loading) return null;

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <Sidebar userRole="super_admin" />
            <Header userName={user?.full_name} userEmail={user?.email} userAvatar={user?.avatar_url} />

            <main className={`${isSidebarCollapsed ? 'ml-28' : 'ml-80'} mt-16 p-8 transition-all duration-300`}>
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-slate-800">Admin Profile</h1>
                        <p className="text-slate-500">Manage your administrative account and institutions</p>
                    </div>

                    {message && (
                        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                            <span className="font-medium">{message.text}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Center Column: Profile & Settings */}
                        <div className="lg:col-span-2 space-y-8">

                            {/* Profile Card */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                                <form onSubmit={handleUpdateProfile}>
                                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 mb-8">
                                        {/* Avatar Section */}
                                        <div className="relative group">
                                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100">
                                                {profile?.avatar_url ? (
                                                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-teal-50 text-teal-300">
                                                        <User className="w-16 h-16" />
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="absolute bottom-0 right-0 bg-teal-600 text-white p-2.5 rounded-full shadow-lg hover:bg-teal-700 transition-colors"
                                            >
                                                <Camera className="w-5 h-5" />
                                            </button>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                hidden
                                                accept="image/*"
                                                onChange={handleAvatarUpload}
                                            />
                                        </div>

                                        {/* Name & Email Display */}
                                        <div className="flex-1 text-center sm:text-left">
                                            <h2 className="text-2xl font-bold text-slate-800 mb-1">{profile?.full_name}</h2>
                                            <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-500 mb-4">
                                                <Mail className="w-4 h-4" />
                                                <span>{profile?.email}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                                <span className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                                    <Shield className="w-3 h-3" />
                                                    {profile?.role.replace('_', ' ')}
                                                </span>
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${profile?.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                                                    }`}>
                                                    {profile?.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                                            <input
                                                type="text"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                                                placeholder="Enter your full name"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-8 flex justify-end">
                                        <button
                                            type="submit"
                                            className="px-6 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                                        >
                                            <Save className="w-4 h-4" />
                                            Save Changes
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Security Section */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-slate-400" />
                                    Security
                                </h3>
                                <form onSubmit={handleChangePassword}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
                                            <input
                                                type="password"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-6 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={!newPassword || !currentPassword}
                                            className="px-6 py-2.5 bg-white border border-gray-200 text-slate-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                                        >
                                            Change Password
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Right Column: Managed Institutions */}
                        <div className="space-y-8">

                            {/* Managed Institutions */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-slate-400" />
                                    Managed Institutions
                                </h3>
                                {institutions.length > 0 ? (
                                    <div className="space-y-4">
                                        {institutions.map((item, i) => (
                                            <div key={i} className="flex flex-col p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                                        {item.institutions.logo_url ? (
                                                            <img src={item.institutions.logo_url} alt="" className="w-full h-full object-contain rounded-lg" />
                                                        ) : (
                                                            <Building2 className="w-5 h-5 text-slate-400" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-sm">{item.institutions.name}</h4>
                                                        <p className="text-xs text-slate-500 capitalize">{item.institutions.institution_type}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 mt-2 pt-2 border-t border-gray-100">
                                                    {item.institutions.contact_email && (
                                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                                            <Mail className="w-3 h-3" />
                                                            {item.institutions.contact_email}
                                                        </div>
                                                    )}
                                                    {item.institutions.contact_phone && (
                                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                                            <Phone className="w-3 h-3" />
                                                            {item.institutions.contact_phone}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-slate-400 border border-dashed border-gray-200 rounded-xl">
                                        <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No institutions assigned</p>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
