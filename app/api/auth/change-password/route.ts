// MongoDB-only: Password change API
// Used by ProfileService.changePassword

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/mongodb/connection';
import { User } from '@/lib/mongodb/models';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { currentPassword, newPassword } = await request.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: 'Both current and new password are required' }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
        }

        await connectToDatabase();
        const user = await User.findOne({ email: session.user.email });

        if (!user || !user.password) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
        }

        const hashedNew = await bcrypt.hash(newPassword, 12);
        user.password = hashedNew;
        user.updated_at = new Date();
        await user.save();

        return NextResponse.json({ success: true, message: 'Password changed successfully' });
    } catch (error: any) {
        console.error('[ChangePassword] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
