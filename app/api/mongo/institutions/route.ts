// MongoDB API - Institutions
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import Institution from '@/lib/mongodb/models/Institution';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const activeOnly = searchParams.get('active') === 'true';

        const filter: any = {};
        if (activeOnly) filter.is_active = true;

        const institutions = await Institution.find(filter).sort({ name: 1 });
        return NextResponse.json({ institutions });
    } catch (error: any) {
        console.error('Institutions GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const body = await req.json();

        const last = await Institution.findOne().sort({ id: -1 });
        const newId = (last?.id || 0) + 1;

        const institution = await Institution.create({ id: newId, ...body });
        return NextResponse.json({ institution }, { status: 201 });
    } catch (error: any) {
        console.error('Institution POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        await connectToDatabase();
        const body = await req.json();
        const { id, ...update } = body;

        const institution = await Institution.findOneAndUpdate({ id }, update, { new: true });
        if (!institution) return NextResponse.json({ error: 'Institution not found' }, { status: 404 });

        return NextResponse.json({ institution });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        await Institution.deleteOne({ id: parseInt(id) });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
