import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemSettings extends Document {
    maintenance_mode: boolean;
    maintenance_message: string;
    maintenance_title: string;
    maintenance_time: string;
    maintenance_intensity: string;
    ai_chatbot_active: boolean;
    updated_at: Date;
}

const SystemSettingsSchema: Schema = new Schema({
    id: { type: String, default: 'global_settings', unique: true },
    maintenance_mode: { type: Boolean, default: false },
    maintenance_message: { type: String, default: 'We are currently performing scheduled maintenance to improve our services. Please check back shortly.' },
    maintenance_title: { type: String, default: 'System Maintenance in Progress' },
    maintenance_time: { type: String, default: '' },
    maintenance_intensity: { type: String, default: 'Standard' },
    ai_chatbot_active: { type: Boolean, default: true },
    updated_at: { type: Date, default: Date.now }
});

export default mongoose.models.SystemSettings || mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);
