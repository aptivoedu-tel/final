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
                .sort({ created_at: -1 })
                .limit(6)
                .lean()
        ]);

        // Manual join: look up users by their custom 'id' field (UUID string), not _id
        const userIds = [...new Set((feedbacks || []).map((f: any) => f.user_id).filter(Boolean))];
        const users = userIds.length > 0
            ? await User.find({ id: { $in: userIds } }).select('id full_name avatar_url role').lean()
            : [];
        const userMap = Object.fromEntries((users as any[]).map((u: any) => [u.id, u]));

        const enrichedFeedbacks = (feedbacks || []).map((f: any) => ({
            ...f,
            users: userMap[f.user_id] || null,
        }));

        // Avatars from matched users
        const avatars = enrichedFeedbacks
            .map((f: any) => f.users?.avatar_url)
            .filter(Boolean)
            .slice(0, 4);

        console.log('[LandingAPI] Success, returning data');
        return NextResponse.json({
            universities,
            subjects,
            studentCount,
            feedbacks: enrichedFeedbacks,
            avatars,
            averageRating: 4.8
        });
    } catch (error: any) {
        console.error('[LandingAPI] ERROR:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
