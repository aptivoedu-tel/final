import mongoose, { Schema, Document } from 'mongoose';

export interface IStudentUniversityEnrollment extends Document {
    id: number;
    user_id: string; // auth.users UUID
    university_id: number;
    status: 'pending' | 'approved' | 'waitlisted' | 'rejected';
    verified_at?: Date;
    created_at: Date;
}

const StudentUniversityEnrollmentSchema: Schema = new Schema({
    id: { type: Number, required: true, unique: true },
    user_id: { type: String, required: true },
    university_id: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'approved', 'waitlisted', 'rejected'], default: 'approved' },
    verified_at: { type: Date },
    created_at: { type: Date, default: Date.now },
});

StudentUniversityEnrollmentSchema.index({ user_id: 1, university_id: 1 }, { unique: true });

export default mongoose.models.StudentUniversityEnrollment || mongoose.model<IStudentUniversityEnrollment>('StudentUniversityEnrollment', StudentUniversityEnrollmentSchema);
