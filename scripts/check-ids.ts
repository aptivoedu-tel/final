import connectToDatabase from './lib/mongodb/connection';
import { SystemSettings, MCQ, Passage, Upload } from './lib/mongodb/models';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkIds() {
    try {
        await connectToDatabase();

        console.log('--- Database Integrity Check ---');

        const settingsCount = await SystemSettings.countDocuments();
        console.log('SystemSettings count:', settingsCount);
        if (settingsCount > 0) {
            const settings = await SystemSettings.find();
            console.log('Settings:', JSON.stringify(settings, null, 2));
        }

        const lastMcq = await MCQ.findOne().sort({ id: -1 });
        console.log('Last MCQ ID:', lastMcq?.id);

        const lastPassage = await Passage.findOne().sort({ id: -1 });
        console.log('Last Passage ID:', lastPassage?.id);

        const lastUpload = await Upload.findOne().sort({ id: -1 });
        console.log('Last Upload ID:', lastUpload?.id);

        console.log('--- Done ---');
        process.exit(0);
    } catch (error) {
        console.error('Check failed:', error);
        process.exit(1);
    }
}

checkIds();
