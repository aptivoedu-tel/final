// MongoDB feedback API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb/connection';
import Feedback from '@/lib/mongodb/models/Feedback';
import User from '@/lib/mongodb/models/User';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { user_id, rating, feedback_text } = body;

        if (!feedback_text?.trim()) {
            return NextResponse.json({ error: 'Feedback text is required' }, { status: 400 });
        }

        await connectToDatabase();

        // Get next numeric ID
        const last = await Feedback.findOne().sort({ id: -1 });
        const nextId = (last?.id || 0) + 1;

        const newFeedback = await Feedback.create({
            id: nextId,
            user_id,
            rating: rating || 5,
            feedback_text: feedback_text.trim(),
            is_published: false,
            created_at: new Date(),
        });

        return NextResponse.json({ success: true, feedback: newFeedback });
    } catch (error: any) {
        console.error('[Feedback] POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role === 'student') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        // Ensure User model is registered for population
        if (!User) { /* trigger register if needed */ }

        const feedbacks = await Feedback.find()
            .sort({ created_at: -1 })
            .limit(100)
            .lean();

        // Manual join using custom 'id' field (UUID string), not MongoDB _id
        const userIds = [...new Set(feedbacks.map((f: any) => f.user_id).filter(Boolean))];
        const users = userIds.length > 0
            ? await User.find({ id: { $in: userIds } }).select('id full_name email role').lean()
            : [];
        const userMap = Object.fromEntries((users as any[]).map((u: any) => [u.id, u]));

        const mappedFeedbacks = feedbacks.map((f: any) => ({
            ...f,
            user: userMap[f.user_id] || null,
        }));

        return NextResponse.json({ feedbacks: mappedFeedbacks });
    } catch (error: any) {
        console.error('[Feedback] GET Error:', error);
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
        const { id, is_published } = body;

        if (id === undefined) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        await connectToDatabase();

        const updated = await Feedback.findOneAndUpdate(
            { id: parseInt(id) },
            { $set: { is_published } },
            { new: true }
        );

        if (!updated) {
            return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, feedback: updated });

    } catch (error: any) {
        console.error('[Feedback] PATCH Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
