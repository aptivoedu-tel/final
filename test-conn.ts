import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkConn() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("No URI");
    console.log("Connecting to:", uri.split('@')[1]); // Log only host for safety
    const client = new MongoClient(uri);
    try {
        await client.connect();
        console.log("Connected successfully to server");
        const db = client.db('aptivo_db');
        const users = await db.collection('users').find({}).limit(1).toArray();
        console.log("User count (first 1):", users.length);
        if (users.length > 0) console.log("First user email:", users[0].email);
    } finally {
        await client.close();
    }
}

checkConn().catch(console.error);
