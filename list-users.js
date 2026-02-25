const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function listUsers() {
    const uri = process.env.MONGODB_URI;
    try {
        await mongoose.connect(uri);
        const users = await mongoose.connection.db.collection('users').find({}).limit(5).toArray();
        console.log('Total Users Found:', users.length);
        users.forEach(u => console.log(`- ${u.email} (${u.role}) Status: ${u.status}`));
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

listUsers();
