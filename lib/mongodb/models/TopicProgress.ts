import mongoose, { Schema, Document } from 'mongoose';

export interface ITopicProgress extends Document {
    student_id: string;
    topic_id: number;
    is_completed: boolean;
    reading_percentage: number;
    last_accessed_at: Date;
    completed_at?: Date;
}

const TopicProgressSchema: Schema = new Schema({
    student_id: { type: String, required: true },
    topic_id: { type: Number, required: true },
    is_completed: { type: Boolean, default: false },
    reading_percentage: { type: Number, default: 0 },
    last_accessed_at: { type: Date, default: Date.now },
    completed_at: { type: Date }
});

TopicProgressSchema.index({ student_id: 1, topic_id: 1 }, { unique: true });

export default mongoose.models.TopicProgress || mongoose.model<ITopicProgress>('TopicProgress', TopicProgressSchema);
