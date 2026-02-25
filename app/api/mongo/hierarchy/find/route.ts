import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import { Subject, Topic, Subtopic } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type'); // 'subject', 'topic', 'subtopic'
        const name = searchParams.get('name');
        const parentId = searchParams.get('parentId');

        await connectToDatabase();

        if (type === 'subject') {
            const subject = await Subject.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') }
            }).select('id');
            return NextResponse.json({ id: subject?.id || null });
        }

        if (type === 'topic') {
            const topic = await Topic.findOne({
                subject_id: parseInt(parentId!),
                name: { $regex: new RegExp(`^${name}$`, 'i') }
            }).select('id');
            return NextResponse.json({ id: topic?.id || null });
        }

        if (type === 'subtopic') {
            const subtopic = await Subtopic.findOne({
                topic_id: parseInt(parentId!),
                name: { $regex: new RegExp(`^${name}$`, 'i') }
            }).select('id');
            return NextResponse.json({ id: subtopic?.id || null });
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
