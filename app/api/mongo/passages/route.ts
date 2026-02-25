import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import Passage from '@/lib/mongodb/models/Passage';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const subtopic_id = searchParams.get('subtopic_id');

        const filter: any = {};
        if (subtopic_id) filter.subtopic_id = parseInt(subtopic_id);

        const passages = await Passage.find(filter).sort({ created_at: -1 });
        return NextResponse.json({ passages });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const body = await req.json();

        const last = await Passage.findOne().sort({ id: -1 });
        const newId = (last?.id || 0) + 1;

        const passage = await Passage.create({
            id: newId,
            ...body,
            created_at: new Date()
        });
        return NextResponse.json({ passage }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        await connectToDatabase();
        const body = await req.json();
        const { id, ...update } = body;

        const passage = await Passage.findOneAndUpdate({ id: parseInt(id) }, update, { new: true });
        return NextResponse.json({ passage });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        await Passage.deleteOne({ id: parseInt(id!) });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
