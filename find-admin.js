const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function findAdmin() {
    const uri = process.env.MONGODB_URI;
    try {
        await mongoose.connect(uri);
        const admin = await mongoose.connection.db.collection('users').findOne({ role: 'super_admin' });
        console.log('Super Admin:', admin ? admin.email : 'NOT FOUND');
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

findAdmin();
