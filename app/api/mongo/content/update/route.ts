// MongoDB API - Subtopic/Topic Content Update
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import Topic from '@/lib/mongodb/models/Topic';
import Subtopic from '@/lib/mongodb/models/Subtopic';

export async function PATCH(req: NextRequest) {
    try {
        await connectToDatabase();
        const body = await req.json();
        const { id, type, content_markdown } = body;

        if (!id || !type) {
            return NextResponse.json({ error: 'id and type are required' }, { status: 400 });
        }

        let updated;
        if (type === 'subtopic') {
            updated = await Subtopic.findOneAndUpdate(
                { id: parseInt(id) },
                { content_markdown },
                { new: true }
            );
        } else if (type === 'topic') {
            updated = await Topic.findOneAndUpdate(
                { id: parseInt(id) },
                { content_markdown },
                { new: true }
            );
        } else {
            return NextResponse.json({ error: 'Invalid type. Must be topic or subtopic' }, { status: 400 });
        }

        if (!updated) {
            return NextResponse.json({ error: `${type} not found` }, { status: 404 });
        }

        return NextResponse.json({ success: true, [type]: updated });
    } catch (error: any) {
        console.error('Content Update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
