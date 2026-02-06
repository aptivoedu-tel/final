'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import UniversityExamManager from '@/components/features/UniversityExamManager';

export default function InstitutionUniversityExamsPage() {
    const params = useParams();
    const router = useRouter();
    const uniId = parseInt(params.uniId as string);

    return (
        <UniversityExamManager
            uniId={uniId}
            userRole="institution_admin"
            onBack={() => router.push('/institution-admin/universities')}
        />
    );
}
