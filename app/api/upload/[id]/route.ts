// Serve files from MongoDB GridFS
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ error: 'Invalid file ID' }, { status: 400 });
        }

        const client = await getMongoClient();
        const db = client.db(DB_NAME);

        // Try each bucket
        const buckets = ['lessons_files', 'avatars_files', 'uploads_files'];
        let fileStream: any = null;
        let fileInfo: any = null;

        for (const bucketName of buckets) {
            const bucket = new GridFSBucket(db, { bucketName });
            const files = await db.collection(`${bucketName}.files`)
                .findOne({ _id: new ObjectId(id) });

            if (files) {
                fileInfo = files;
                fileStream = bucket.openDownloadStream(new ObjectId(id));
                break;
            }
        }

        if (!fileStream || !fileInfo) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
            fileStream.on('data', (chunk: Buffer) => chunks.push(chunk));
            fileStream.on('end', resolve);
            fileStream.on('error', reject);
        });

        const fileBuffer = Buffer.concat(chunks);
        const contentType = fileInfo.contentType || 'application/octet-stream';

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Content-Length': fileBuffer.length.toString(),
            },
        });
    } catch (error: any) {
        console.error('File Serve Error:', error);
        return NextResponse.json({ error: 'Failed to retrieve file' }, { status: 500 });
    }
}
