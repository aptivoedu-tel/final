import mongoose, { Schema, Document } from 'mongoose';

export interface ISubtopicProgress extends Document {
    student_id: string;
    subtopic_id: number;
    is_completed: boolean;
    reading_percentage: number;
    last_accessed_at: Date;
    completed_at?: Date;
}

const SubtopicProgressSchema: Schema = new Schema({
    student_id: { type: String, required: true },
    subtopic_id: { type: Number, required: true },
    is_completed: { type: Boolean, default: false },
    reading_percentage: { type: Number, default: 0 },
    last_accessed_at: { type: Date, default: Date.now },
    completed_at: { type: Date }
});

SubtopicProgressSchema.index({ student_id: 1, subtopic_id: 1 }, { unique: true });

export default mongoose.models.SubtopicProgress || mongoose.model<ISubtopicProgress>('SubtopicProgress', SubtopicProgressSchema);
