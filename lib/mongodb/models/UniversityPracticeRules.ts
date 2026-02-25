import mongoose, { Schema, Document } from 'mongoose';

export interface IUniversityPracticeRules extends Document {
    id: number;
    university_id: number;
    rule_type: string;
    rule_value: string;
    is_active: boolean;
    created_at: Date;
}

const UniversityPracticeRulesSchema: Schema = new Schema({
    id: { type: Number, required: true, unique: true },
    university_id: { type: Number, required: true },
    rule_type: { type: String, required: true },
    rule_value: { type: String, required: true },
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
});

export default mongoose.models.UniversityPracticeRules || mongoose.model<IUniversityPracticeRules>('UniversityPracticeRules', UniversityPracticeRulesSchema);
