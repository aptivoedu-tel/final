import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb/connection';
import { User, University, Subject, Feedback } from '../../../../lib/mongodb/models';

export async function GET() {
    try {
        console.log('[LandingAPI] Fetching landing data...');
        await connectToDatabase();

        const [universities, subjects, studentCount, feedbacks] = await Promise.all([
            University.find({}).sort({ name: 1 }).lean(),
            Subject.find({ is_active: true }).limit(6).lean(),
            User.countDocuments({ role: 'student' }),
            Feedback.find({ is_published: true })
                .populate('user_id', 'full_name avatar_url role')
                .sort({ created_at: -1 })
                .limit(6)
                .lean()
        ]);

        // Mock avatars if not enough
        const avatars = (feedbacks || [])
            .map((f: any) => f.user_id?.avatar_url)
            .filter(Boolean)
            .slice(0, 4);

        console.log('[LandingAPI] Success, returning data');
        return NextResponse.json({
            universities,
            subjects,
            studentCount,
            feedbacks,
            avatars,
            averageRating: 4.8
        });
    } catch (error: any) {
        console.error('[LandingAPI] ERROR:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
