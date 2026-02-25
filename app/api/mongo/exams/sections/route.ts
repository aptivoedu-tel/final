import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb/connection';
import ExamSection from '@/lib/mongodb/models/ExamSection';
import ExamQuestion from '@/lib/mongodb/models/ExamQuestion';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const exam_id = searchParams.get('exam_id');

        if (!exam_id) return NextResponse.json({ error: 'Exam ID required' }, { status: 400 });

        const sections = await ExamSection.find({ exam_id: parseInt(exam_id) }).sort({ order_index: 1 }).lean();
        return NextResponse.json({ sections });
    } catch (error: any) {
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

        const lastSection = await ExamSection.findOne().sort({ id: -1 });
        const nextId = (lastSection?.id || 0) + 1;

        const section = await ExamSection.create({
            id: nextId,
            ...body,
            created_at: new Date()
        });

        return NextResponse.json({ success: true, section });
    } catch (error: any) {
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

        const section = await ExamSection.findOneAndUpdate({ id: parseInt(id) }, { $set: updates }, { new: true }).lean();
        return NextResponse.json({ success: true, section });
    } catch (error: any) {
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

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const sectionId = parseInt(id);

        await Promise.all([
            ExamSection.deleteOne({ id: sectionId }),
            ExamQuestion.deleteMany({ section_id: sectionId })
        ]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
