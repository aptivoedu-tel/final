// MongoDB API - Notifications
// GET: Fetch notifications for a user
// PATCH: Mark notifications as read

import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import Notification from '@/lib/mongodb/models/Notification';
import NotificationRecipient from '@/lib/mongodb/models/NotificationRecipient';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('user_id');

        if (!userId) {
            return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
        }

        const recipients = await NotificationRecipient.find({ user_id: userId });
        const notificationIds = recipients.map(r => r.notification_id);

        const notifications = await Notification.find({ id: { $in: notificationIds } })
            .sort({ created_at: -1 })
            .limit(50);

        // Add read status
        const readMap = new Map(recipients.map(r => [r.notification_id, r.is_read]));
        const notificationsWithStatus = notifications.map(n => ({
            ...n.toObject(),
            is_read: readMap.get(n.id) ?? false,
        }));

        const unreadCount = notificationsWithStatus.filter(n => !n.is_read).length;

        return NextResponse.json({ notifications: notificationsWithStatus, unread_count: unreadCount });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        await connectToDatabase();
        const body = await req.json();
        const { user_id, notification_id, mark_all = false } = body;

        if (!user_id) {
            return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
        }

        const filter: any = { user_id };
        if (!mark_all && notification_id) {
            filter.notification_id = notification_id;
        }

        await NotificationRecipient.updateMany(filter, {
            $set: { is_read: true, read_at: new Date() }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
