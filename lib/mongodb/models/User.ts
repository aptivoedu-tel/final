import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    id: string; // Keep old UUID for transition
    email: string;
    password?: string;
    full_name: string;
    role: 'super_admin' | 'institution_admin' | 'student';
    status: 'active' | 'inactive' | 'suspended' | 'pending';
    avatar_url?: string;
    email_verified: boolean;
    is_solo: boolean;
    institution_id?: number;
    student_id_code?: string;
    created_at: Date;
    updated_at: Date;
}

const UserSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    full_name: { type: String, required: true },
    role: { type: String, enum: ['super_admin', 'institution_admin', 'student'], default: 'student' },
    status: { type: String, default: 'pending' },
    avatar_url: { type: String },
    email_verified: { type: Boolean, default: false },
    is_solo: { type: Boolean, default: false },
    institution_id: { type: Number },
    student_id_code: { type: String },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
