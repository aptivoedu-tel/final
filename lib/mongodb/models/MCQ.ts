import mongoose, { Schema, Document } from 'mongoose';

export interface IMCQ extends Document {
    id: number;
    subtopic_id?: number;
    topic_id?: number;
    passage_id?: number;
    question: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: string;
    explanation?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    upload_id?: number;
    is_active: boolean;
    question_image_url?: string;
    explanation_url?: string;
    question_hash?: string;
    created_at: Date;
}

const MCQSchema: Schema = new Schema({
    id: { type: Number, required: true, unique: true },
    subtopic_id: { type: Number },
    topic_id: { type: Number },
    passage_id: { type: Number },
    question: { type: String, required: true },
    option_a: { type: String, required: true },
    option_b: { type: String, required: true },
    option_c: { type: String, required: true },
    option_d: { type: String, required: true },
    correct_option: { type: String, required: true },
    explanation: { type: String },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    upload_id: { type: Number },
    is_active: { type: Boolean, default: true },
    question_image_url: { type: String },
    explanation_url: { type: String },
    question_hash: { type: String },
    created_at: { type: Date, default: Date.now },
});

export default mongoose.models.MCQ || mongoose.model<IMCQ>('MCQ', MCQSchema);
