import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
    id: number;
    user_id?: string;
    title: string;
    message: string;
    type?: string;
    category?: 'important' | 'alert' | 'normal';
    sender_role?: string;
    institution_id?: number;
    is_read: boolean;
    image_url?: string;
    created_at: Date;
}

const NotificationSchema: Schema = new Schema({
    id: { type: Number, required: true, unique: true },
    user_id: { type: String },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: 'system' },
    category: { type: String, enum: ['important', 'alert', 'normal'], default: 'normal' },
    sender_role: { type: String },
    institution_id: { type: Number },
    is_read: { type: Boolean, default: false },
    image_url: { type: String },
    created_at: { type: Date, default: Date.now },
});

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
