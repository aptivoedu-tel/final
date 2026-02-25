import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import connectToDatabase from './lib/mongodb/connection';
import User from './lib/mongodb/models/User';

async function checkAdmin() {
    try {
        await connectToDatabase();
        const user = await User.findOne({ email: 'admin.edu@aptivo.com' }).lean();
        console.log(JSON.stringify(user, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkAdmin();
