import mongoose, { Schema, Document } from 'mongoose';

export interface IPracticeSession extends Document {
    id: number;
    student_id: string;
    subtopic_id?: number;
    topic_id?: number;
    university_id?: number;
    session_type: string;
    started_at: Date;
    completed_at?: Date;
    total_questions: number;
    correct_answers: number;
    wrong_answers: number;
    skipped_questions: number;
    score_percentage?: number;
    time_spent_seconds: number;
    is_completed: boolean;
    mcq_ids?: number[];
}

const PracticeSessionSchema: Schema = new Schema({
    id: { type: Number, required: true, unique: true },
    student_id: { type: String, required: true },
    subtopic_id: { type: Number },
    topic_id: { type: Number },
    university_id: { type: Number },
    session_type: { type: String, default: 'practice' },
    started_at: { type: Date, default: Date.now },
    completed_at: { type: Date },
    total_questions: { type: Number, default: 0 },
    correct_answers: { type: Number, default: 0 },
    wrong_answers: { type: Number, default: 0 },
    skipped_questions: { type: Number, default: 0 },
    score_percentage: { type: Number },
    time_spent_seconds: { type: Number, default: 0 },
    is_completed: { type: Boolean, default: false },
    mcq_ids: [{ type: Number }],
});

export default mongoose.models.PracticeSession || mongoose.model<IPracticeSession>('PracticeSession', PracticeSessionSchema);
