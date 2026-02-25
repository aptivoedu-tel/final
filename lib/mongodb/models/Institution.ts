import mongoose, { Schema, Document } from 'mongoose';

export interface IInstitution extends Document {
    id: number;
    name: string;
    institution_type: string;
    domain?: string;
    contact_email?: string;
    contact_phone?: string;
    address?: string;
    logo_url?: string;
    is_active: boolean;
    status: 'pending' | 'approved' | 'rejected' | 'blocked';
    admin_name?: string;
    admin_email?: string;
    created_at: Date;
    updated_at: Date;
}

const InstitutionSchema: Schema = new Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    institution_type: { type: String },
    domain: { type: String },
    contact_email: { type: String },
    contact_phone: { type: String },
    address: { type: String },
    logo_url: { type: String },
    is_active: { type: Boolean, default: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'blocked'], default: 'pending' },
    admin_name: { type: String },
    admin_email: { type: String },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export default mongoose.models.Institution || mongoose.model<IInstitution>('Institution', InstitutionSchema);
