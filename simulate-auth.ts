import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import connectToDatabase from './lib/mongodb/connection';
import User from './lib/mongodb/models/User';
import bcrypt from 'bcryptjs';

async function simulateAuthorize() {
    const credentials = {
        email: 'admin.edu@aptivo.com',
        password: 'Aptivo2026'
    };

    console.log('--- Simulating Authorize ---');
    try {
        await connectToDatabase();
        console.log('DB Connected');

        const email = credentials.email.trim();
        const user = await User.findOne({
            email: { $regex: new RegExp(`^${email}$`, 'i') }
        });

        if (!user) {
            console.log('User not found');
            return;
        }

        console.log(`Found User: ${user.email}, Role: ${user.role}`);

        if (!user.password) {
            console.log('No password in DB');
            return;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        console.log('Password is valid:', isValid);

        if (isValid) {
            console.log('FINAL RESULT: SUCCESS');
        } else {
            console.log('FINAL RESULT: FAIL (Password Mismatch)');
        }
        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err);
        process.exit(1);
    }
}

simulateAuthorize();
