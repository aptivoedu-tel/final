import mongoose, { Schema, Document } from 'mongoose';

export interface IInstitutionAdmin extends Document {
    user_id: string; // The ID from User collection
    institution_id: number;
    assigned_at: Date;
    created_at: Date;
    updated_at: Date;
}

const InstitutionAdminSchema: Schema = new Schema({
    user_id: { type: String, required: true },
    institution_id: { type: Number, required: true },
    assigned_at: { type: Date, default: Date.now },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Compound index to ensure a user is only assigned once to an institution
InstitutionAdminSchema.index({ user_id: 1, institution_id: 1 }, { unique: true });

export default mongoose.models.InstitutionAdmin || mongoose.model<IInstitutionAdmin>('InstitutionAdmin', InstitutionAdminSchema);
