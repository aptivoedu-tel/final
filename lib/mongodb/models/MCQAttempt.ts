import mongoose, { Schema, Document } from 'mongoose';

export interface IMCQAttempt extends Document {
    id: number;
    practice_session_id?: number;
    mcq_id: number;
    student_id: string;
    selected_option?: string;
    is_correct: boolean;
    time_spent_seconds: number;
    created_at: Date;
}

const MCQAttemptSchema: Schema = new Schema({
    id: { type: Number, required: true, unique: true },
    practice_session_id: { type: Number },
    mcq_id: { type: Number, required: true },
    student_id: { type: String, required: true },
    selected_option: { type: String },
    is_correct: { type: Boolean, default: false },
    time_spent_seconds: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now },
});

export default mongoose.models.MCQAttempt || mongoose.model<IMCQAttempt>('MCQAttempt', MCQAttemptSchema);
