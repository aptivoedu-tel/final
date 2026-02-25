import mongoose, { Schema, Document } from 'mongoose';

export interface IUniversityExam extends Document {
    id: number;
    university_id?: number;
    institution_id?: number;
    name: string;
    exam_type: 'mock' | 'module' | 'final';
    total_duration: number;
    allow_continue_after_time_up: boolean;
    allow_reattempt: boolean;
    auto_submit: boolean;
    result_release_setting: string;
    is_active: boolean;
    negative_marking: number;
    total_marks: number;
    passing_marks: number;
    created_by?: string;
    start_time?: Date;
    end_time?: Date;
    created_at: Date;
    updated_at: Date;
}

const UniversityExamSchema: Schema = new Schema({
    id: { type: Number, required: true, unique: true },
    university_id: { type: Number },
    institution_id: { type: Number },
    name: { type: String, required: true },
    exam_type: { type: String, enum: ['mock', 'module', 'final'] },
    total_duration: { type: Number, default: 120 },
    allow_continue_after_time_up: { type: Boolean, default: false },
    allow_reattempt: { type: Boolean, default: true },
    auto_submit: { type: Boolean, default: true },
    result_release_setting: { type: String, default: 'instant' },
    is_active: { type: Boolean, default: true },
    negative_marking: { type: Number, default: 0 },
    total_marks: { type: Number, default: 100 },
    passing_marks: { type: Number, default: 40 },
    created_by: { type: String },
    start_time: { type: Date },
    end_time: { type: Date },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export default mongoose.models.UniversityExam || mongoose.model<IUniversityExam>('UniversityExam', UniversityExamSchema);
