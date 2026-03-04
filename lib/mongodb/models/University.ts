import mongoose, { Schema, Document } from 'mongoose';

export interface IUniversity extends Document {
    id: number;
    name: string;
    domain?: string;
    country?: string;
    state?: string;
    city?: string;
    description?: string;
    logo_url?: string;
    is_active: boolean;
    is_public: boolean;
    test_pattern_markdown?: string;
    created_at: Date;
    updated_at: Date;
}

const UniversitySchema: Schema = new Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    domain: { type: String },
    country: { type: String },
    state: { type: String },
    city: { type: String },
    description: { type: String },
    logo_url: { type: String },
    is_active: { type: Boolean, default: true },
    is_public: { type: Boolean, default: true },
    show_on_landing: { type: Boolean, default: true },
    test_pattern_markdown: { type: String },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

export default mongoose.models.University || mongoose.model<IUniversity>('University', UniversitySchema);
