import mongoose, { Schema, Document } from 'mongoose';

export interface IExamQuestion extends Document {
    id: number;
    section_id: number;
    passage_id?: number;
    question_text: string;
    image_url?: string;
    image_type: string;
    question_type: 'mcq_single' | 'mcq_multiple' | 'true_false' | 'numerical' | 'essay' | 'passage';
    options?: any;
    correct_answer: any;
    marks: number;
    difficulty?: string;
    order_index: number;
    explanation?: string;
    created_at: Date;
}

const ExamQuestionSchema: Schema = new Schema({
    id: { type: Number, required: true, unique: true },
    section_id: { type: Number, required: true },
    passage_id: { type: Number },
    question_text: { type: String, required: true },
    image_url: { type: String },
    image_type: { type: String, default: 'direct' },
    question_type: { type: String, enum: ['mcq_single', 'mcq_multiple', 'true_false', 'numerical', 'essay', 'passage'], default: 'mcq_single' },
    options: { type: Schema.Types.Mixed },
    correct_answer: { type: Schema.Types.Mixed },
    marks: { type: Number, default: 1.0 },
    difficulty: { type: String },
    order_index: { type: Number, default: 0 },
    explanation: { type: String },
    created_at: { type: Date, default: Date.now },
});

export default mongoose.models.ExamQuestion || mongoose.model<IExamQuestion>('ExamQuestion', ExamQuestionSchema);
