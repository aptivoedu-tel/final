import mongoose, { Schema, Document } from 'mongoose';

export interface IPracticeAttempt extends Document {
    id: string;
    student_id: string;
    practice_set_id?: string;
    topic: string;
    total_questions: number;
    correct: number;
    incorrect: number;
    avg_time_seconds?: number;
    overthink_count?: number;
    rush_count?: number;
    university_id?: number;
    created_at: Date;
}

const PracticeAttemptSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true },
    student_id: { type: String, required: true },
    practice_set_id: { type: String },
    topic: { type: String, required: true },
    total_questions: { type: Number, required: true },
    correct: { type: Number, required: true },
    incorrect: { type: Number, required: true },
    avg_time_seconds: { type: Number },
    overthink_count: { type: Number, default: 0 },
    rush_count: { type: Number, default: 0 },
    university_id: { type: Number },
    created_at: { type: Date, default: Date.now },
});

export default mongoose.models.PracticeAttempt || mongoose.model<IPracticeAttempt>('PracticeAttempt', PracticeAttemptSchema);
