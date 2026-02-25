import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb/connection';
import University from '@/lib/mongodb/models/University';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(req.url);
        const isActive = searchParams.get('active');
        const isPublic = searchParams.get('public');
        const limit = parseInt(searchParams.get('limit') || '50');

        const filter: any = {};
        if (isActive === 'true') filter.is_active = true;
        if (isPublic === 'true') filter.is_public = true;

        const universities = await University.find(filter)
            .sort({ name: 1 })
            .limit(limit)
            .lean();

        return NextResponse.json({ universities, count: universities.length });
    } catch (error: any) {
        console.error('Universities Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const body = await req.json();

        // Get next ID
        const lastUni = await University.findOne().sort({ id: -1 });
        const nextId = (lastUni?.id || 0) + 1;

        const newUniversity = await University.create({
            id: nextId,
            ...body,
            created_at: new Date(),
        });

        return NextResponse.json({ success: true, university: newUniversity }, { status: 201 });
    } catch (error: any) {
        console.error('Create University Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        await connectToDatabase();

        const updated = await University.findOneAndUpdate(
            { id: parseInt(id) },
            { $set: updates },
            { new: true }
        ).lean();

        if (!updated) return NextResponse.json({ error: 'University not found' }, { status: 404 });

        return NextResponse.json({ success: true, university: updated });

    } catch (error: any) {
        console.error('Update University Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        await connectToDatabase();

        await University.findOneAndDelete({ id: parseInt(id) });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Delete University Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
