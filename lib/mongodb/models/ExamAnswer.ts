import mongoose, { Schema, Document } from 'mongoose';

export interface IExamAnswer extends Document {
    id: number;
    attempt_id: string;
    question_id: number;
    answer?: any;
    is_correct?: boolean;
    marks_awarded: number;
    created_at: Date;
}

const ExamAnswerSchema: Schema = new Schema({
    id: { type: Number, required: true, unique: true },
    attempt_id: { type: String, required: true },
    question_id: { type: Number, required: true },
    answer: { type: Schema.Types.Mixed },
    is_correct: { type: Boolean },
    marks_awarded: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now },
});

export default mongoose.models.ExamAnswer || mongoose.model<IExamAnswer>('ExamAnswer', ExamAnswerSchema);
