'use client';

import { useEffect, Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Loader from '@/components/ui/Loader';
import { AuthService } from '@/lib/services/authService';
import { ProfileService } from '@/lib/services/profileService';
import { supabase } from '@/lib/supabase/client';

function PracticeRouter() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const resolveAndRedirect = async () => {
            const topicName = searchParams.get('topic');
            const subtopicId = searchParams.get('subtopicId');
            const topicIdParam = searchParams.get('topicId');

            const user = AuthService.getCurrentUser();
            if (!user) {
                router.push('/login');
                return;
            }

            try {
                // 1. Get the student's enrolled universities
                const { universities, error: enrollmentError } = await ProfileService.getStudentUniversities(user.id);

                if (enrollmentError || !universities || universities.length === 0) {
                    // Not enrolled in any university, go to library to pick one
                    router.push('/university');
                    return;
                }

                // Use the first active university for routing
                const universityId = universities[0].universities.id;

                // 2. Decide where to go
                if (subtopicId) {
                    // Direct subtopic practice
                    router.push(`/university/${universityId}/practice/${subtopicId}`);
                } else if (topicIdParam) {
                    // We have the topic ID directly from analytics!
                    router.push(`/university/${universityId}/practice/topic/${topicIdParam}`);
                } else if (topicName) {
                    // Legacy name fallback (still keep for safety)
                    // Find topic ID by name to route to topic-level practice
                    const { data: topicData } = await supabase
                        .from('topics')
                        .select('id')
                        .eq('name', topicName)
                        .maybeSingle();

                    if (topicData) {
                        router.push(`/university/${universityId}/practice/topic/${topicData.id}`);
                    } else {
                        router.push(`/university/${universityId}`);
                    }
                } else {
                    // Fallback to university landing
                    router.push(`/university/${universityId}`);
                }
            } catch (err) {
                console.error('Routing error:', err);
                router.push('/university');
            }
        };

        resolveAndRedirect();
    }, [searchParams, router]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="text-center space-y-4">
                    <p className="text-red-500 font-bold">{error}</p>
                    <button
                        onClick={() => router.push('/university')}
                        className="px-6 py-2 bg-teal-600 text-white rounded-xl font-bold"
                    >
                        Back to Library
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white">
            <div className="space-y-6 text-center">
                <Loader size="lg" text="MAPPING SESSION..." />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2 mx-auto max-w-xs animate-pulse">Syncing performance heuristics</p>
            </div>
        </div>
    );
}

export default function PracticePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PracticeRouter />
        </Suspense>
    );
}
