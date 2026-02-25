import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import connectToDatabase from './lib/mongodb/connection';
import User from './lib/mongodb/models/User';
import bcrypt from 'bcryptjs';

async function testLogin() {
    try {
        await connectToDatabase();
        const email = 'admin.edu@aptivo.com';
        const rawPassword = 'Aptivo2026';

        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found');
            return;
        }

        console.log('User found:', user.email);
        console.log('Hashed Password:', user.password);

        const isValid = await bcrypt.compare(rawPassword, user.password);
        console.log('Password valid:', isValid);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

testLogin();
