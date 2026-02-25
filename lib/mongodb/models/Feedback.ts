import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedback extends Document {
    id: number;
    user_id: string;
    rating: number;
    feedback_text: string;
    is_published: boolean;
    created_at: Date;
}

const FeedbackSchema: Schema = new Schema({
    id: { type: Number, required: true, unique: true },
    user_id: { type: String, required: true, ref: 'User' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    feedback_text: { type: String, required: true },
    is_published: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now }
});

export default mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', FeedbackSchema);
