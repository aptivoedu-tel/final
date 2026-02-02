-- ============================================================
-- QUICK ADMIN CREATION QUERY
-- Run this in Supabase SQL Editor to create admin account
-- ============================================================

-- Step 1: First, you need to create the user in Supabase Auth Dashboard
-- Go to: Authentication > Users > Add User
-- Email: admin.edu@aptivo.com
-- Password: hamza1234
-- Auto Confirm: YES
-- User Metadata: {"role": "super_admin", "full_name": "Super Administrator"}

-- Step 2: After creating in Auth Dashboard, run this to sync the profile:
-- (This will automatically sync if the trigger is working, but run this to be sure)

INSERT INTO public.users (id, email, full_name, role, status, email_verified, password_hash)
SELECT 
    id,
    'admin.edu@aptivo.com' as email,
    'Super Administrator' as full_name,
    'super_admin' as role,
    'active' as status,
    true as email_verified,
    'managed-by-auth' as password_hash
FROM auth.users 
WHERE email = 'admin.edu@aptivo.com'
ON CONFLICT (id) DO UPDATE SET
    role = 'super_admin',
    status = 'active',
    email_verified = true,
    full_name = 'Super Administrator';

-- Step 3: Verify the admin was created successfully
SELECT 
    id,
    email,
    full_name,
    role,
    status,
    email_verified,
    created_at
FROM public.users 
WHERE email = 'admin.edu@aptivo.com';

-- Expected Result:
-- email: admin.edu@aptivo.com
-- role: super_admin
-- status: active
-- email_verified: true
