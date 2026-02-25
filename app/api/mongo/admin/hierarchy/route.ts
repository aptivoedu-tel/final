import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb/connection';
import { Subject, Topic, Subtopic } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type'); // 'all', 'subjects', 'topics', 'subtopics'

        await connectToDatabase();

        if (type === 'subjects') {
            const subjects = await Subject.find({ is_active: true }).sort({ name: 1 }).lean();
            return NextResponse.json({ subjects });
        }

        if (type === 'topics') {
            const topics = await Topic.find({ is_active: true }).sort({ name: 1 }).lean();
            return NextResponse.json({ topics });
        }

        if (type === 'subtopics') {
            const subtopics = await Subtopic.find({ is_active: true }).sort({ name: 1 }).lean();
            return NextResponse.json({ subtopics });
        }

        // Default: return counts or a summary if 'all' or no type
        const [subjects, topics, subtopics] = await Promise.all([
            Subject.find({ is_active: true }).sort({ name: 1 }).lean(),
            Topic.find({ is_active: true }).sort({ name: 1 }).lean(),
            Subtopic.find({ is_active: true }).sort({ name: 1 }).lean()
        ]);

        return NextResponse.json({ subjects, topics, subtopics });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
