const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function check() {
    try {
        const MONGODB_URI = process.env.MONGODB_URI;
        if (!MONGODB_URI) throw new Error('MONGODB_URI missing');

        await mongoose.connect(MONGODB_URI);
        console.log('--- DB Check ---');

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));

        const settings = await db.collection('platform_settings').find().toArray();
        console.log('Settings:', JSON.stringify(settings, null, 2));

        const mcqs = await db.collection('mcqs').find().sort({ id: -1 }).limit(1).toArray();
        console.log('Last MCQ ID:', mcqs[0]?.id);

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
