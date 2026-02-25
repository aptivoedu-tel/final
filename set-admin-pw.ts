import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import connectToDatabase from './lib/mongodb/connection';
import User from './lib/mongodb/models/User';
import bcrypt from 'bcryptjs';

async function setPassword() {
    try {
        await connectToDatabase();
        const email = 'admin.edu@aptivo.com';
        const hashedPassword = await bcrypt.hash('admin123', 12);

        const result = await User.updateOne(
            { email },
            { $set: { password: hashedPassword } }
        );

        if (result.matchedCount > 0) {
            console.log(`✅ Password set for ${email}. You can now login with: admin123`);
        } else {
            console.log(`❌ User ${email} not found.`);
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

setPassword();
