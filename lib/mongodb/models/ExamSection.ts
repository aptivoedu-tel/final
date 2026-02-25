import mongoose, { Schema, Document } from 'mongoose';

export interface IExamSection extends Document {
    id: number;
    exam_id: number;
    name: string;
    section_duration?: number;
    num_questions: number;
    weightage: number;
    order_index: number;
    negative_marking: number;
    default_marks_per_question: number;
    created_at: Date;
}

const ExamSectionSchema: Schema = new Schema({
    id: { type: Number, required: true, unique: true },
    exam_id: { type: Number, required: true },
    name: { type: String, required: true },
    section_duration: { type: Number },
    num_questions: { type: Number, default: 0 },
    weightage: { type: Number, default: 1.0 },
    order_index: { type: Number, default: 0 },
    negative_marking: { type: Number, default: 0 },
    default_marks_per_question: { type: Number, default: 1 },
    created_at: { type: Date, default: Date.now },
});

export default mongoose.models.ExamSection || mongoose.model<IExamSection>('ExamSection', ExamSectionSchema);
