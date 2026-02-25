import mongoose, { Schema, Document } from 'mongoose';

export interface INotificationRecipient extends Document {
    id: number;
    notification_id: number;
    user_id: string;
    is_read: boolean;
    read_at?: Date;
    created_at: Date;
}

const NotificationRecipientSchema: Schema = new Schema({
    id: { type: Number, required: true, unique: true },
    notification_id: { type: Number, required: true, ref: 'Notification' },
    user_id: { type: String, required: true, ref: 'User' },
    is_read: { type: Boolean, default: false },
    read_at: { type: Date },
    created_at: { type: Date, default: Date.now }
});

export default mongoose.models.NotificationRecipient || mongoose.model<INotificationRecipient>('NotificationRecipient', NotificationRecipientSchema);
