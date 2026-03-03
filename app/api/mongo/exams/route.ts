// MongoDB API - Exams
// GET: Fetch exams
// POST: Create new exam
// PATCH: Update exam
// DELETE: Delete exam

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb/connection';
import UniversityExam from '@/lib/mongodb/models/UniversityExam';
import ExamSection from '@/lib/mongodb/models/ExamSection';
import ExamQuestion from '@/lib/mongodb/models/ExamQuestion';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const universityId = searchParams.get('university_id');
        const institutionId = searchParams.get('institution_id'); // 'null' string for global, or numeric id
        const examId = searchParams.get('exam_id');
        const activeOnly = searchParams.get('active') === 'true';

        const filter: any = {};
        if (activeOnly) filter.is_active = true;
        if (universityId) filter.university_id = parseInt(universityId);
        if (examId) filter.id = parseInt(examId);

        if (institutionId === 'null') {
            filter.institution_id = null;
        } else if (institutionId === 'mine' || (institutionId && !isNaN(parseInt(institutionId)))) {
            const instId = parseInt(institutionId);
            filter.$or = [
                { institution_id: null },
                { institution_id: instId }
            ];
        } else {
            // Default: ONLY public exams to prevent leakage
            filter.institution_id = null;
        }

        const exams = await UniversityExam.find(filter).sort({ created_at: -1 }).lean();

        return NextResponse.json({ exams, count: exams.length });
    } catch (error: any) {
        console.error('Exams GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role === 'student') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const body = await req.json();

        // Auto-increment ID
        const lastExam = await UniversityExam.findOne().sort({ id: -1 });
        const nextId = (lastExam?.id || 0) + 1;

        const newExam = await UniversityExam.create({
            id: nextId,
            ...body,
            created_at: new Date()
        });

        return NextResponse.json({ success: true, exam: newExam }, { status: 201 });
    } catch (error: any) {
        console.error('Exams POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role === 'student') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) return NextResponse.json({ error: 'Exam ID required' }, { status: 400 });

        const updatedExam = await UniversityExam.findOneAndUpdate(
            { id: parseInt(id) },
            { $set: updates },
            { new: true }
        ).lean();

        if (!updatedExam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });

        return NextResponse.json({ success: true, exam: updatedExam });
    } catch (error: any) {
        console.error('Exams PATCH Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role === 'student') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Exam ID required' }, { status: 400 });

        const examId = parseInt(id);

        // Optional: Delete related sections and questions? 
        // In Supabase it probably has cascade delete, in Mongo we might need to handle it.
        await Promise.all([
            UniversityExam.deleteOne({ id: examId }),
            ExamSection.deleteMany({ exam_id: examId }),
            // Delete questions for those sections
            (async () => {
                const sections = await ExamSection.find({ exam_id: examId }).select('id');
                const sectionIds = sections.map((s: any) => s.id);
                await ExamQuestion.deleteMany({ section_id: { $in: sectionIds } });
            })()
        ]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Exams DELETE Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
