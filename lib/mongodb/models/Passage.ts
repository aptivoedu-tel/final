import mongoose, { Schema, Document } from 'mongoose';

export interface IPassage extends Document {
    id: number;
    title?: string;
    content: string;
    created_at: Date;
}

const PassageSchema: Schema = new Schema({
    id: { type: Number, required: true, unique: true },
    title: { type: String },
    content: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
});

export default mongoose.models.Passage || mongoose.model<IPassage>('Passage', PassageSchema);
