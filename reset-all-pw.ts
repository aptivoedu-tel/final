import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import connectToDatabase from './lib/mongodb/connection';
import User from './lib/mongodb/models/User';
import bcrypt from 'bcryptjs';

async function resetAllPasswords() {
    try {
        await connectToDatabase();
        const defaultPassword = 'Aptivo2026';
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);

        console.log(`Setting all user passwords to: ${defaultPassword}`);

        const result = await User.updateMany(
            {},
            { $set: { password: hashedPassword } }
        );

        console.log(`✅ Updated ${result.modifiedCount} users.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

resetAllPasswords();
