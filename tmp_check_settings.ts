import connectToDatabase from './lib/mongodb/connection';
import { SystemSettings } from './lib/mongodb/models';

async function check() {
    await connectToDatabase();
    const settings = await SystemSettings.findOne({ id: 'global_settings' });
    console.log('Current Settings:', JSON.stringify(settings, null, 2));
    process.exit(0);
}
check();
