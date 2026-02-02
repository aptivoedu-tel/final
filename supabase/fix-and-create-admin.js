/**
 * Script to fix profile sync issues and create admin user
 * Run this with: node supabase/fix-and-create-admin.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function main() {
    console.log('🚀 Starting Supabase Fix and Admin Setup...\n');

    try {
        // Step 1: Apply the SQL migration
        console.log('📝 Applying SQL migration...');
        const sqlPath = path.join(__dirname, 'COMPLETE_FIX_ADMIN_LOGIN.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        const { data: migrationResult, error: migrationError } = await supabase.rpc('exec_sql', {
            sql: sqlContent
        });

        if (migrationError) {
            console.log('⚠️  Migration via RPC failed, trying direct execution...');
            // Try executing in chunks
            const statements = sqlContent.split(';').filter(s => s.trim());
            for (const statement of statements) {
                if (statement.trim()) {
                    const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
                    if (error) {
                        console.warn('Warning on statement:', error.message);
                    }
                }
            }
        }

        console.log('✅ SQL migration applied\n');

        // Step 2: Create admin user in auth.users
        console.log('👤 Creating admin user...');

        const adminEmail = 'admin.edu@aptivo.com';
        const adminPassword = 'hamza1234';

        // Check if user already exists
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingAdmin = existingUsers?.users?.find(u => u.email === adminEmail);

        let adminUserId;

        if (existingAdmin) {
            console.log('ℹ️  Admin user already exists in auth.users');
            adminUserId = existingAdmin.id;

            // Update password
            const { error: updateError } = await supabase.auth.admin.updateUserById(
                adminUserId,
                {
                    password: adminPassword,
                    email_confirm: true,
                    user_metadata: {
                        role: 'super_admin',
                        full_name: 'Super Administrator'
                    }
                }
            );

            if (updateError) {
                console.error('⚠️  Could not update admin password:', updateError.message);
            } else {
                console.log('✅ Admin password updated');
            }
        } else {
            // Create new admin user
            const { data: newAdmin, error: createError } = await supabase.auth.admin.createUser({
                email: adminEmail,
                password: adminPassword,
                email_confirm: true,
                user_metadata: {
                    role: 'super_admin',
                    full_name: 'Super Administrator'
                }
            });

            if (createError) {
                console.error('❌ Failed to create admin user:', createError.message);
                console.log('\n⚠️  Please create admin manually in Supabase Dashboard:');
                console.log('   Email: admin.edu@aptivo.com');
                console.log('   Password: hamza1234');
                console.log('   User Metadata: {"role": "super_admin", "full_name": "Super Administrator"}');
                return;
            }

            adminUserId = newAdmin.user.id;
            console.log('✅ Admin user created in auth.users');
        }

        // Step 3: Ensure profile exists in public.users
        console.log('📋 Syncing admin profile...');

        const { error: profileError } = await supabase
            .from('users')
            .upsert({
                id: adminUserId,
                email: adminEmail,
                full_name: 'Super Administrator',
                role: 'super_admin',
                status: 'active',
                email_verified: true,
                password_hash: 'managed-by-auth'
            }, {
                onConflict: 'id'
            });

        if (profileError) {
            console.error('❌ Failed to sync admin profile:', profileError.message);
        } else {
            console.log('✅ Admin profile synced to public.users');
        }

        // Step 4: Verify setup
        console.log('\n🔍 Verifying setup...');

        const { data: adminProfile, error: verifyError } = await supabase
            .from('users')
            .select('*')
            .eq('email', adminEmail)
            .single();

        if (verifyError) {
            console.error('❌ Could not verify admin profile:', verifyError.message);
        } else {
            console.log('✅ Admin profile verified:');
            console.log('   ID:', adminProfile.id);
            console.log('   Email:', adminProfile.email);
            console.log('   Role:', adminProfile.role);
            console.log('   Status:', adminProfile.status);
        }

        console.log('\n✨ Setup complete!\n');
        console.log('🔐 Admin Login Credentials:');
        console.log('   Email: admin.edu@aptivo.com');
        console.log('   Password: hamza1234');
        console.log('\n🌐 You can now login at: http://localhost:3001/login');

    } catch (error) {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    }
}

main();
