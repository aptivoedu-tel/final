const mongoose = require('mongoose');
const fs = require('fs');

async function test() {
    console.log('Testing MongoDB connection...');
    const MONGODB_URI = "mongodb+srv://aptivoedu_admin:aptivo12345@aptivo.chadblo.mongodb.net/aptivo_db?retryWrites=true&w=majority&appName=Aptivo";
    console.log('URI used for test:', MONGODB_URI);
    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 10000
        });
        console.log('SUCCESS: Connection established');
        process.exit(0);
    } catch (e) {
        console.error('FAILURE:', e);
        process.exit(1);
    }
}

test();
