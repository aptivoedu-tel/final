import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb/connection';
import { MCQ } from '@/lib/mongodb/models';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const { mcqs } = await req.json();
        await connectToDatabase();

        const details: any = {
            inFile: 0,
            exact: 0,
            similar: 0,
            items: []
        };

        const seenNormalized = new Map<string, number>();
        const itemsToHash: { idx: number, question: string, normalized: string }[] = [];

        // 1. In-file check
        mcqs.forEach((mcq: any, idx: number) => {
            const normalized = mcq.question.toLowerCase().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim();
            if (seenNormalized.has(normalized)) {
                details.inFile++;
                details.items.push({
                    index: idx,
                    question: mcq.question,
                    type: 'in-file'
                });
            } else {
                seenNormalized.set(normalized, idx);
                itemsToHash.push({ idx, question: mcq.question, normalized });
            }
        });

        if (itemsToHash.length === 0) return NextResponse.json(details);

        // 2. Exact DB check
        const hashes = itemsToHash.map(item => ({
            ...item,
            hash: crypto.createHash('sha256').update(item.normalized).digest('hex')
        }));

        const dbHashes = await MCQ.find({
            question_hash: { $in: hashes.map(h => h.hash) }
        }).select('question_hash').lean();

        const existingHashSet = new Set(dbHashes.map(h => h.question_hash));

        hashes.forEach(h => {
            if (existingHashSet.has(h.hash)) {
                details.exact++;
                details.items.push({
                    index: h.idx,
                    question: h.question,
                    type: 'exact'
                });
            }
        });

        // 3. Similarity check (Simplified for MongoDB for now - could use Atlas Search later)
        // For now, we'll skip complex fuzzy text similarity in the basic migration
        // but it could be implemented with $text or Atlas Search.

        return NextResponse.json(details);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
