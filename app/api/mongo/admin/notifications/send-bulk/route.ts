import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb/connection';
import Notification from '@/lib/mongodb/models/Notification';
import NotificationRecipient from '@/lib/mongodb/models/NotificationRecipient';
import { User } from '@/lib/mongodb/models';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        // Only super_admin or institution_admin can send notifications
        if (!session || (session.user as any)?.role === 'student') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { title, message, category, senderRole, institutionId, imageUrl, recipientType } = body;

        await connectToDatabase();

        // 1. Create the notification object
        // Use a numeric ID or let MongoDB handle it? 
        // Our existing Notification model might use numeric IDs based on previous imports
        // For simplicity, let's just use MongoDB _id but if the service expects a number, 
        // we might need a counter. For now, let's use a timestamp-based number.
        const notificationId = Math.floor(Date.now() / 1000);

        const newNotification = await Notification.create({
            id: notificationId,
            title,
            message,
            category: category || 'normal',
            sender_role: senderRole,
            institution_id: institutionId || null,
            image_url: imageUrl || null,
            created_at: new Date()
        });

        // 2. Identify recipients
        let recipientsFilter: any = {};
        if (recipientType === 'all') {
            recipientsFilter = { status: { $in: ['active', 'pending'] } };
        } else if (recipientType === 'admins') {
            recipientsFilter = {
                status: { $in: ['active', 'pending'] },
                role: { $in: ['super_admin', 'institution_admin'] }
            };
        }

        const users = await User.find(recipientsFilter).select('id');
        const recipientsData = users.map(user => ({
            id: Math.floor(Math.random() * 1000000000), // Random ID for the recipient record
            notification_id: notificationId,
            user_id: user.id,
            is_read: false,
            created_at: new Date()
        }));

        // 3. Insert recipients
        if (recipientsData.length > 0) {
            await NotificationRecipient.insertMany(recipientsData);
        }

        return NextResponse.json({ success: true, notificationId });

    } catch (error: any) {
        console.error('Bulk Notification Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
