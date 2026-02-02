'use client';

import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, ChevronRight, School, GraduationCap } from 'lucide-react';
import { AuthService } from '@/lib/services/authService';
import { supabase } from '@/lib/supabase/client';

export default function OnboardingPage() {
    const [universities, setUniversities] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const currentUser = AuthService.getCurrentUser();
        if (!currentUser) {
            window.location.href = '/login';
            return;
        }
        setUser(currentUser);
        loadUniversities();
    }, []);

    const loadUniversities = async () => {
        try {
            const { data, error } = await supabase
                .from('universities')
                .select('*')
                .eq('status', 'active');

            if (data) {
                setUniversities(data);
            } else {
                // Fallback data if table is empty
                setUniversities([
                    { id: '1', name: 'Stanford University', domain: 'stanford.edu', type: 'university', logo_url: null },
                    { id: '2', name: 'MIT', domain: 'mit.edu', type: 'university', logo_url: null },
                    { id: '3', name: 'Harvard University', domain: 'harvard.edu', type: 'university', logo_url: null },
                    { id: '4', name: 'Berkeley', domain: 'berkeley.edu', type: 'university', logo_url: null },
                ]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(uid => uid !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleComplete = async () => {
        setSubmitting(true);
        try {
            // Enroll in selected universities
            // Ideally calls a service method, here direct DB for demo
            const enrollments = selectedIds.map(uniId => ({
                student_id: user.id,
                university_id: uniId,
                status: 'pending_verification', // Or active if domain matches
                enrolled_at: new Date().toISOString()
            }));

            // In real implementation: AuthService.enrollMultiple(enrollments)
            // For now, simulate success and redirect
            await new Promise(r => setTimeout(r, 1500));

            window.location.href = '/dashboard';
        } catch (error) {
            alert('Failed to complete setup');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="spinner w-12 h-12"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Progress Steps */}
                <div className="flex items-center justify-between mb-8 px-8">
                    <div className={`flex flex-col items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-gray-400'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-2 ${step >= 1 ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300'
                            }`}>1</div>
                        <span className="text-sm font-medium">Account</span>
                    </div>
                    <div className={`flex-1 h-1 mx-4 ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`} />
                    <div className={`flex flex-col items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-gray-400'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-2 ${step >= 2 ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300'
                            }`}>2</div>
                        <span className="text-sm font-medium">Universities</span>
                    </div>
                    <div className={`flex-1 h-1 mx-4 ${step >= 3 ? 'bg-primary' : 'bg-gray-200'}`} />
                    <div className={`flex flex-col items-center gap-2 ${step >= 3 ? 'text-primary' : 'text-gray-400'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-2 ${step >= 3 ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300'
                            }`}>3</div>
                        <span className="text-sm font-medium">Complete</span>
                    </div>
                </div>

                {/* Card */}
                <div className="glass-surface p-8 animate-scale-in">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary mb-2">
                            Select Your Institutions
                        </h1>
                        <p className="text-gray-600">
                            Choose the universities or institutions you are affiliated with.
                            We'll customize your learning experience based on their curriculum.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-h-[400px] overflow-y-auto p-2">
                        {universities.map((uni) => (
                            <div
                                key={uni.id}
                                onClick={() => toggleSelection(uni.id)}
                                className={`
                  relative p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-4
                  ${selectedIds.includes(uni.id)
                                        ? 'border-primary bg-primary/5 shadow-md'
                                        : 'border-gray-100 bg-white hover:border-primary/30 hover:bg-gray-50'
                                    }
                `}
                            >
                                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                  ${selectedIds.includes(uni.id) ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}
                `}>
                                    <School className="w-6 h-6" />
                                </div>

                                <div className="flex-1">
                                    <h3 className={`font-bold ${selectedIds.includes(uni.id) ? 'text-primary-dark' : 'text-gray-900'}`}>
                                        {uni.name}
                                    </h3>
                                    {uni.domain && (
                                        <p className="text-xs text-gray-500 mt-1">{uni.domain}</p>
                                    )}
                                </div>

                                {selectedIds.includes(uni.id) && (
                                    <div className="absolute top-4 right-4 text-primary">
                                        <CheckCircle2 className="w-5 h-5 fill-primary text-white" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                            {selectedIds.length} institution{selectedIds.length !== 1 ? 's' : ''} selected
                        </p>
                        <button
                            onClick={handleComplete}
                            disabled={submitting || selectedIds.length === 0}
                            className="btn btn-primary px-8"
                        >
                            {submitting ? (
                                <div className="spinner w-5 h-5" />
                            ) : (
                                <>
                                    Continue to Dashboard
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
