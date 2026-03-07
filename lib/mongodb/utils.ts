import mongoose from 'mongoose';

/**
 * Robust way to get the next numeric ID for a model.
 * Note: Even with this, unique indexing is the final source of truth.
 * Using findOne().sort() in a single request is okay, but across concurrent requests it's risky.
 * Ideally, use a counters collection.
 */
export async function getNextId(Model: mongoose.Model<any>, field: string = 'id'): Promise<number> {
    const last = await Model.findOne({}, { [field]: 1 }).sort({ [field]: -1 });
    return (last?.[field] || 0) + 1;
}

/**
 * Atomic counter implementation for numeric IDs
 */
export async function getAtomicId(name: string): Promise<number> {
    const Counter = mongoose.models.Counter || mongoose.model('Counter', new mongoose.Schema({
        _id: { type: String, required: true },
        seq: { type: Number, default: 0 }
    }));

    const counter = await Counter.findOneAndUpdate(
        { _id: name },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return counter.seq;
}
