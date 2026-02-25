const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function testConn() {
    const uri = process.env.MONGODB_URI;
    console.log('URI:', uri);
    try {
        await mongoose.connect(uri);
        console.log('SUCCESS: Connected to MongoDB');
        process.exit(0);
    } catch (e) {
        console.error('FAILURE:', e.message);
        process.exit(1);
    }
}

testConn();
