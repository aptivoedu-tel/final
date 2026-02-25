// MongoDB-based file upload API (replaces Supabase Storage)
// Uses MongoDB GridFS for storing binary file data

import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, GridFSBucket, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = process.env.MONGODB_DB_NAME || 'aptivo';

let cachedClient: MongoClient | null = null;

async function getMongoClient(): Promise<MongoClient> {
    if (cachedClient) return cachedClient;
    cachedClient = new MongoClient(MONGODB_URI);
    await cachedClient.connect();
    return cachedClient;
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const bucket = (formData.get('bucket') as string) || 'lessons';

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 });
        }

        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
        }

        const client = await getMongoClient();
        const db = client.db(DB_NAME);
        const gridFSBucket = new GridFSBucket(db, { bucketName: `${bucket}_files` });

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileExt = file.name.split('.').pop() || 'jpg';
        const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        const uploadStream = gridFSBucket.openUploadStream(uniqueFileName, {
            metadata: {
                contentType: file.type,
                originalName: file.name,
                bucket,
                uploadedAt: new Date(),
            },
        });

        await new Promise<void>((resolve, reject) => {
            uploadStream.on('finish', resolve);
            uploadStream.on('error', reject);
            uploadStream.end(buffer);
        });

        const fileId = uploadStream.id.toString();
        // Public URL served by our own API
        const publicUrl = `/api/upload/${fileId}`;

        return NextResponse.json({ publicUrl, fileId });
    } catch (error: any) {
        console.error('Upload Error:', error);
        return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    // Serve files list (optional, for admin use)
    return NextResponse.json({ message: 'Use /api/upload/[id] to retrieve a file.' });
}
