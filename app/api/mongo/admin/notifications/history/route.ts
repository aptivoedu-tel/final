import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb/connection';
import Notification from '@/lib/mongodb/models/Notification';
import NotificationRecipient from '@/lib/mongodb/models/NotificationRecipient';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role === 'student') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const senderRole = searchParams.get('sender_role');
        const institutionId = searchParams.get('institution_id');

        await connectToDatabase();

        const filter: any = {};
        if (senderRole) filter.sender_role = senderRole;
        if (institutionId) filter.institution_id = parseInt(institutionId);

        const notifications = await Notification.find(filter)
            .sort({ created_at: -1 })
            .limit(50)
            .lean();

        // Add recipient counts for history view
        const history = await Promise.all(notifications.map(async (n: any) => {
            const recipientCount = await NotificationRecipient.countDocuments({ notification_id: n.id });
            const readCount = await NotificationRecipient.countDocuments({ notification_id: n.id, is_read: true });

            return {
                ...n,
                recipientCount,
                readCount,
                target: n.sender_role === 'super_admin' ? 'Global' : 'Institutional'
            };
        }));

        return NextResponse.json({ history });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
