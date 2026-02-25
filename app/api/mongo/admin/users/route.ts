import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb/connection';
import { User, Institution } from '@/lib/mongodb/models';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role === 'student') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        const { searchParams } = new URL(req.url);
        const role = searchParams.get('role');
        const institutionId = searchParams.get('institution_id');
        const query = searchParams.get('q');

        const filter: any = {};
        if (role && role !== 'all') {
            if (role === 'admin') {
                filter.role = { $in: ['super_admin', 'institution_admin'] };
            } else {
                filter.role = role;
            }
        }
        if (institutionId) filter.institution_id = parseInt(institutionId);
        if (query) {
            filter.$or = [
                { full_name: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ];
        }

        const users = await User.find(filter)
            .sort({ created_at: -1 })
            .limit(100)
            .lean();

        // Get institutions for these users
        // Collect all related institution IDs
        const instIds = Array.from(new Set(users.map(u => u.institution_id!).filter(Boolean)));

        const institutions = await Institution.find({ id: { $in: instIds } }).lean();
        const instMap = new Map(institutions.map(i => [i.id, i]));

        const usersWithInst = users.map(u => ({
            ...u,
            institution: u.institution_id ? instMap.get(u.institution_id) : null
        }));

        return NextResponse.json({ users: usersWithInst });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role === 'student') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { userId, ...updates } = body;

        if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

        await connectToDatabase();

        const updatedUser = await User.findOneAndUpdate(
            { id: userId },
            { $set: updates },
            { new: true }
        ).lean();

        if (!updatedUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        return NextResponse.json({ success: true, user: updatedUser });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
