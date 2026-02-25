import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import { InstitutionUniversityAccess, Subject, Topic, Subtopic } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const universityId = searchParams.get('university_id');
        const institutionId = searchParams.get('institution_id');

        if (!universityId) {
            return NextResponse.json({ error: 'university_id is required' }, { status: 400 });
        }

        const filter: any = {
            university_id: parseInt(universityId),
            is_active: true
        };

        // If institutionId is provided, filter by institution or null (public access)
        if (institutionId && institutionId !== 'null') {
            filter.$or = [
                { institution_id: parseInt(institutionId) },
                { institution_id: null }
            ];
        } else {
            filter.institution_id = null;
        }

        const mappings = await InstitutionUniversityAccess.find(filter).lean();

        // Fetch related entities
        const subjectIds = mappings.map((m: any) => m.subject_id).filter(Boolean);
        const topicIds = mappings.map((m: any) => m.topic_id).filter(Boolean);
        const subtopicIds = mappings.map((m: any) => m.subtopic_id).filter(Boolean);

        const [subjects, topics, subtopics] = await Promise.all([
            Subject.find({ id: { $in: subjectIds } }).lean(),
            Topic.find({ id: { $in: topicIds } }).lean(),
            Subtopic.find({ id: { $in: subtopicIds } }).lean()
        ]);

        const result = mappings.map((m: any) => ({
            ...m,
            subject: subjects.find((s: any) => s.id === m.subject_id),
            topic: topics.find((t: any) => t.id === m.topic_id),
            subtopic: subtopics.find((st: any) => st.id === m.subtopic_id)
        }));

        return NextResponse.json({ mappings: result });
    } catch (error: any) {
        console.error('Content Access Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
