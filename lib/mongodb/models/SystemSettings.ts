import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemSettings extends Document {
    setting_id: string;
    maintenance_mode: boolean;
    maintenance_message: string;
    maintenance_title: string;
    maintenance_time: string;
    maintenance_intensity: string;
    ai_chatbot_active: boolean;
    practice_mcqs_limit: number;
    updated_at: Date;
}

const SystemSettingsSchema: Schema = new Schema({
    setting_id: { type: String, default: 'global_settings', unique: true, index: true },
    maintenance_mode: { type: Boolean, default: false },
    maintenance_message: { type: String, default: 'We are currently performing scheduled maintenance to improve our services. Please check back shortly.' },
    maintenance_title: { type: String, default: 'System Maintenance in Progress' },
    maintenance_time: { type: String, default: '' },
    maintenance_intensity: { type: String, default: 'Standard' },
    ai_chatbot_active: { type: Boolean, default: true },
    practice_mcqs_limit: { type: Number, default: 20 },
    updated_at: { type: Date, default: Date.now }
}, {
    id: false,
    versionKey: false,
    collection: 'platform_settings'
});

export default mongoose.models.AptivoSettings || mongoose.model<ISystemSettings>('AptivoSettings', SystemSettingsSchema);
