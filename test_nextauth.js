require('dotenv').config({ path: '.env.local' });
console.log('Testing NextAuth config import...');
try {
    const { authOptions } = require('./app/api/auth/[...nextauth]/route');
    console.log('SUCCESS: authOptions imported');
    console.log('Secret:', authOptions.secret);
} catch (e) {
    console.error('FAILURE:', e);
}
