import mongoose, { Schema, Document } from 'mongoose';

export interface IUniversityContentAccess extends Document {
    id: number;
    university_id: number;
    institution_id?: number;
    subject_id?: number;
    topic_id?: number;
    subtopic_id?: number;
    is_active: boolean;
    session_limit?: number;
    difficulty_level?: string;
    allowed_difficulties?: string[];
    created_at: Date;
}

const UniversityContentAccessSchema: Schema = new Schema({
    id: { type: Number, required: true, unique: true },
    university_id: { type: Number, required: true },
    institution_id: { type: Number, default: null },
    subject_id: { type: Number },
    topic_id: { type: Number },
    subtopic_id: { type: Number },
    is_active: { type: Boolean, default: true },
    session_limit: { type: Number, default: 10 },
    difficulty_level: { type: String, default: 'all' },
    allowed_difficulties: { type: [String], default: ['easy', 'medium', 'hard'] },
    created_at: { type: Date, default: Date.now },
});

UniversityContentAccessSchema.index({ university_id: 1, institution_id: 1, subject_id: 1, topic_id: 1, subtopic_id: 1 }, { unique: true });
UniversityContentAccessSchema.index({ university_id: 1 });

export default mongoose.models.UniversityContentAccess || mongoose.model<IUniversityContentAccess>('UniversityContentAccess', UniversityContentAccessSchema);
