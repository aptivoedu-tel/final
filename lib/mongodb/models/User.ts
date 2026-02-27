import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    id: string;
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
    provider?: string;
    // Email verification
    verification_token?: string;
    verification_token_expiry?: Date;
    // Password reset
    reset_token?: string;
    reset_token_expiry?: Date;
    // Set-password for Google users
    set_password_token?: string;
    set_password_token_expiry?: Date;
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
    provider: { type: String, default: 'credentials' },
    // Tokens
    verification_token: { type: String },
    verification_token_expiry: { type: Date },
    reset_token: { type: String },
    reset_token_expiry: { type: Date },
    set_password_token: { type: String },
    set_password_token_expiry: { type: Date },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
