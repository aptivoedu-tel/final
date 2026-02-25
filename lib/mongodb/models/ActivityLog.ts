import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLog extends Document {
    id: number;
    user_id?: string;
    activity_type: string;
    created_at: Date;
}

const ActivityLogSchema: Schema = new Schema({
    id: { type: Number, required: true, unique: true },
    user_id: { type: String },
    activity_type: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
});

export default mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
