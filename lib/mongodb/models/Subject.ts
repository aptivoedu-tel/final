import mongoose, { Schema, Document } from 'mongoose';

export interface ISubject extends Document {
    id: number;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    is_active: boolean;
    display_order: number;
    created_at: Date;
    updated_at: Date;
}

const SubjectSchema: Schema = new Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    icon: { type: String },
    color: { type: String },
    is_active: { type: Boolean, default: true },
    display_order: { type: Number, default: 0 },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export default mongoose.models.Subject || mongoose.model<ISubject>('Subject', SubjectSchema);
