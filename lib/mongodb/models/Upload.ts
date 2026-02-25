import mongoose, { Schema, Document } from 'mongoose';

export interface IUpload extends Document {
    id: number;
    upload_type?: string;
    file_name?: string;
    file_url?: string;
    file_size_bytes?: number;
    subject_id?: number;
    topic_id?: number;
    subtopic_id?: number;
    status?: string;
    validation_errors?: any;
    processing_log?: string;
    total_rows?: number;
    processed_rows?: number;
    failed_rows?: number;
    created_by?: string;
    created_at: Date;
    completed_at?: Date;
}

const UploadSchema: Schema = new Schema({
    id: { type: Number, required: true, unique: true },
    upload_type: { type: String },
    file_name: { type: String },
    file_url: { type: String },
    file_size_bytes: { type: Number },
    subject_id: { type: Number },
    topic_id: { type: Number },
    subtopic_id: { type: Number },
    status: { type: String, default: 'pending' },
    validation_errors: { type: Schema.Types.Mixed },
    processing_log: { type: String },
    total_rows: { type: Number },
    processed_rows: { type: Number, default: 0 },
    failed_rows: { type: Number, default: 0 },
    created_by: { type: String },
    completed_at: { type: Date },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false }
});

export default mongoose.models.Upload || mongoose.model<IUpload>('Upload', UploadSchema);
