'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
    User, Mail, Camera, Save, Lock, MapPin,
    Calendar, GraduationCap, Shield, Activity,
    CheckCircle, XCircle, Loader2
} from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthService } from '@/lib/services/authService';
import { ProfileService, ProfileData } from '@/lib/services/profileService';

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [universities, setUniversities] = useState<any[]>([]);
    const [activity, setActivity] = useState<any[]>([]);
    const [learningStats, setLearningStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

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
        const currentUser = AuthService.getCurrentUser();
        // Fallback for dev if needed
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('aptivo_user') : null;

        const activeUser = currentUser || (storedUser ? JSON.parse(storedUser) : null);

        if (!activeUser) {
            window.location.href = '/login';
            return;
        }

        setUser(activeUser);

        try {
            const [profileRes, uniRes, statsRes, activityRes] = await Promise.all([
                ProfileService.getProfile(activeUser.id),
                ProfileService.getStudentUniversities(activeUser.id),
                ProfileService.getStudentLearningStats(activeUser.id),
                ProfileService.getUserActivity(activeUser.id)
            ]);

            if (profileRes.profile) {
                setProfile(profileRes.profile);
                setFullName(profileRes.profile.full_name);
            }
            if (uniRes.universities) setUniversities(uniRes.universities);
            if (statsRes.stats) setLearningStats(statsRes.stats);
            if (activityRes.activities) setActivity(activityRes.activities);

        } catch (error) {
            console.error("Error loading profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        if (!profile) return;

        const { success, error } = await ProfileService.updateProfile(profile.id, {
            full_name: fullName
        });

        if (success) {
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            // Update local storage user if needed
            const updatedUser = { ...user, full_name: fullName };
            localStorage.setItem('aptivo_user', JSON.stringify(updatedUser));
            setUser(updatedUser);
        } else {
            setMessage({ type: 'error', text: error || 'Failed to update profile' });
        }
        setSaving(false);
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile) return;

        setUploading(true);
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
        setUploading(false);
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword || !currentPassword || !profile) return;

        setSaving(true);
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
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <Sidebar userRole={user?.role || 'student'} />
            <Header userName={user?.full_name} userEmail={user?.email} userAvatar={user?.avatar_url} />

            <main className="ml-64 mt-16 p-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
                        <p className="text-slate-500">Manage your account settings and preferences</p>
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
                                                    <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-300">
                                                        <User className="w-16 h-16" />
                                                    </div>
                                                )}
                                                {uploading && (
                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2.5 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
                                                disabled={uploading}
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
                                                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">
                                                    {profile?.role}
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
                                                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                                placeholder="Enter your full name"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-8 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {saving ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Save className="w-4 h-4" />
                                            )}
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
                                                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-6 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={saving || !newPassword || !currentPassword}
                                            className="px-6 py-2.5 bg-white border border-gray-200 text-slate-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                                        >
                                            Change Password
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Right Column: Stats & Info */}
                        <div className="space-y-8">

                            {/* Learning Stats */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-indigo-500" />
                                    Learning Overview
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                <CheckCircle className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-500">Total Sessions</p>
                                                <p className="font-bold text-slate-800">{learningStats?.totalSessions || 0}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                                                <Calendar className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-500">Learning Streak</p>
                                                <p className="font-bold text-slate-800">{learningStats?.currentStreak || 0} days</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                                                <Trophy className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-500">Average Score</p>
                                                <p className="font-bold text-slate-800">{learningStats?.averageScore || 0}%</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Enrolled Universities */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <GraduationCap className="w-5 h-5 text-slate-400" />
                                    Enrollments
                                </h3>
                                {universities.length > 0 ? (
                                    <div className="space-y-4">
                                        {universities.map((item, i) => (
                                            <div key={i} className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl">
                                                <img
                                                    src={item.universities.logo_url || `https://ui-avatars.com/api/?name=${item.universities.name}&background=random`}
                                                    alt={item.universities.name}
                                                    className="w-10 h-10 rounded-lg object-contain"
                                                />
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-sm">{item.universities.name}</h4>
                                                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {item.universities.city}, {item.universities.country}
                                                    </div>
                                                    <span className="inline-block mt-2 px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-bold">
                                                        Active
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-slate-400 border border-dashed border-gray-200 rounded-xl">
                                        <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No university enrollments</p>
                                    </div>
                                )}
                            </div>

                            {/* Recent Activity */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-slate-400" />
                                    Recent Activity
                                </h3>
                                {activity.length > 0 ? (
                                    <div className="relative pl-4 border-l-2 border-gray-100 space-y-6">
                                        {activity.map((item, i) => (
                                            <div key={i} className="relative">
                                                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-indigo-600 border-2 border-white shadow-sm"></div>
                                                <p className="text-sm text-slate-800 font-medium">{item.activity_type.replace(/_/g, ' ')}</p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {new Date(item.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400">No recent activity</p>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

// Icon component helper
function Trophy(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
    );
}
