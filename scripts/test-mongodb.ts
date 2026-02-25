import connectToDatabase from '../lib/mongodb/connection';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testConnection() {
    try {
        console.log('--- MongoDB Connection Test ---');
        console.log('Target URI:', process.env.MONGODB_URI?.split('@')[1]); // Show only host for security

        const db = await connectToDatabase();
        console.log('✅ SUCCESS: Connected to MongoDB Atlas!');
        console.log('Database Name:', db.connection.name);

        process.exit(0);
    } catch (error) {
        console.error('❌ FAILURE: Could not connect to MongoDB Atlas.');
        console.error('Error Details:', error);
        process.exit(1);
    }
}

testConnection();
