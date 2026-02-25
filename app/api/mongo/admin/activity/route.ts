import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb/connection';
import { ActivityLog, User } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '10');

        await connectToDatabase();

        const logs = await ActivityLog.find()
            .sort({ created_at: -1 })
            .limit(limit)
            .lean();

        // Populate user info manually since we might not have refs set up perfectly
        const userIds = logs.map(l => l.user_id);
        const users = await User.find({ id: { $in: userIds } }).select('id full_name role').lean();
        const userMap = new Map(users.map(u => [u.id, u]));

        const activities = logs.map(log => {
            const user = userMap.get(log.user_id);
            return {
                ...log,
                users: user ? { full_name: user.full_name, role: user.role } : null
            };
        });

        return NextResponse.json({ activities });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { activity_type, activity_data } = await req.json();
        const userId = session.user.id; // Corrected to use ID from session

        await connectToDatabase();
        await ActivityLog.create({
            user_id: userId,
            activity_type,
            activity_data,
            created_at: new Date()
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
