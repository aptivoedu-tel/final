import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb/connection';
import { StudentUniversityEnrollment, University } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('student_id');
        if (!studentId) return NextResponse.json({ error: 'Missing student_id' }, { status: 400 });

        await connectToDatabase();

        const enrollments = await StudentUniversityEnrollment.find({
            student_id: studentId,
            is_active: true
        }).lean();

        const universityIds = enrollments.map((e: any) => e.university_id);
        const universities = await University.find({ id: { $in: universityIds } }).lean();

        const formatted = enrollments.map((e: any) => ({
            enrollment_date: e.enrollment_date,
            is_active: e.is_active,
            universities: universities.find((u: any) => u.id === e.university_id)
        })).filter(item => item.universities);

        return NextResponse.json({ universities: formatted });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('student_id');
        const universityId = searchParams.get('university_id');

        if (!studentId || !universityId) {
            return NextResponse.json({ error: 'Missing student_id or university_id' }, { status: 400 });
        }

        await connectToDatabase();

        await StudentUniversityEnrollment.deleteOne({
            student_id: studentId,
            university_id: parseInt(universityId)
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { student_id, university_id, institution_id, status } = body;

        if (!student_id || !university_id) {
            return NextResponse.json({ error: 'Missing student_id or university_id' }, { status: 400 });
        }

        await connectToDatabase();

        const enrollment = await StudentUniversityEnrollment.findOneAndUpdate(
            { student_id, university_id: parseInt(university_id) },
            {
                $set: {
                    institution_id: institution_id ? parseInt(institution_id) : null,
                    status: status || (institution_id ? 'approved' : 'pending'),
                    is_active: true,
                    enrollment_date: new Date()
                }
            },
            { upsert: true, new: true }
        );

        return NextResponse.json({ enrollment });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
