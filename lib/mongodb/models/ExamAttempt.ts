import mongoose, { Schema, Document } from 'mongoose';

export interface IExamAttempt extends Document {
    id: string;
    exam_id: number;
    student_id: string;
    status: 'in_progress' | 'completed' | 'submitted';
    score: number;
    total_marks: number;
    start_time: Date;
    end_time?: Date;
    time_spent_seconds?: number;
    time_remaining?: number;
    created_at: Date;
}

const ExamAttemptSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true },
    exam_id: { type: Number, required: true },
    student_id: { type: String, required: true },
    status: { type: String, enum: ['in_progress', 'completed', 'submitted'], default: 'in_progress' },
    score: { type: Number, default: 0 },
    total_marks: { type: Number, default: 0 },
    start_time: { type: Date, default: Date.now },
    end_time: { type: Date },
    time_spent_seconds: { type: Number, default: 0 },
    time_remaining: { type: Number },
    created_at: { type: Date, default: Date.now },
});

export default mongoose.models.ExamAttempt || mongoose.model<IExamAttempt>('ExamAttempt', ExamAttemptSchema);
