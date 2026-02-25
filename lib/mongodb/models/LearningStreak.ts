import mongoose, { Schema, Document } from 'mongoose';

export interface ILearningStreak extends Document {
    id: number;
    student_id: string;
    streak_date: string; // ISO date string YYYY-MM-DD
    created_at: Date;
}

const LearningStreakSchema: Schema = new Schema({
    id: { type: Number, required: true, unique: true },
    student_id: { type: String, required: true, ref: 'User' },
    streak_date: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
});

export default mongoose.models.LearningStreak || mongoose.model<ILearningStreak>('LearningStreak', LearningStreakSchema);
