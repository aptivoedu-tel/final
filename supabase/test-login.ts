/**
 * Quick Test Script for Login System
 * Tests all user roles and authentication flows
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin(email: string, password: string, expectedRole: string) {
    console.log(`\n🔐 Testing login for: ${email}`);
    console.log(`   Expected role: ${expectedRole}`);

    try {
        // Step 1: Auth login
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError) {
            console.log(`   ❌ Auth failed: ${authError.message}`);
            return false;
        }

        console.log(`   ✅ Auth successful`);
        console.log(`   User ID: ${authData.user.id}`);

        // Step 2: Check profile
        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        if (profileError) {
            console.log(`   ❌ Profile fetch failed: ${profileError.message}`);
            return false;
        }

        if (!profile) {
            console.log(`   ❌ Profile not found in public.users`);
            return false;
        }

        console.log(`   ✅ Profile found`);
        console.log(`   Role: ${profile.role}`);
        console.log(`   Status: ${profile.status}`);
        console.log(`   Email Verified: ${profile.email_verified}`);

        if (profile.role !== expectedRole) {
            console.log(`   ⚠️  Role mismatch! Expected ${expectedRole}, got ${profile.role}`);
            return false;
        }

        console.log(`   ✅ All checks passed!`);

        // Logout
        await supabase.auth.signOut();

        return true;
    } catch (error: any) {
        console.log(`   ❌ Unexpected error: ${error.message}`);
        return false;
    }
}

async function runTests() {
    console.log('🚀 Starting Login System Tests\n');
    console.log('='.repeat(50));

    const tests = [
        {
            email: 'admin.edu@aptivo.com',
            password: 'hamza1234',
            role: 'super_admin',
            name: 'Super Admin'
        },
        // Add more test users as needed
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        const result = await testLogin(test.email, test.password, test.role);
        if (result) {
            passed++;
        } else {
            failed++;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`\n📊 Test Results:`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   Total: ${tests.length}`);

    if (failed === 0) {
        console.log('\n🎉 All tests passed!');
    } else {
        console.log('\n⚠️  Some tests failed. Please review the errors above.');
    }
}

// Run if executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

export { testLogin, runTests };
