import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb/connection';
import { User } from '@/lib/mongodb/models';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const user = await User.findOne({ email: session.user.email }).lean();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Enforce email verification for student role
        if (user.role === 'student' && !user.email_verified) {
            return NextResponse.json({ error: 'Email not verified' }, { status: 403 });
        }

        return NextResponse.json({ user });
    } catch (error: any) {
        console.error('API /auth/me Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
