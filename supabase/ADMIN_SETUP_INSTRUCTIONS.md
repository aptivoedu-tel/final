# Fix Profile Sync and Create Admin User

## Problem
You're experiencing "permission denied for table users (42501)" error during profile sync.

## Solution

### Step 1: Apply SQL Migration

1. Go to your Supabase Dashboard: https://gkggwmxndvztbsibdyph.supabase.co
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire contents of `COMPLETE_FIX_ADMIN_LOGIN.sql`
5. Click **Run** (or press Ctrl+Enter)

This will:
- Fix permission issues on the users table
- Set up proper RLS policies
- Create auto-sync trigger for new users
- Sync existing auth users to public.users

### Step 2: Create Admin User

After running the SQL migration, create the admin user:

1. In Supabase Dashboard, go to **Authentication** > **Users**
2. Click **Add User** (or **Invite**)
3. Fill in the details:
   - **Email**: `admin.edu@aptivo.com`
   - **Password**: `hamza1234`
   - **Auto Confirm User**: ✅ **YES** (Check this box!)
   - **User Metadata** (click "Add metadata"):
     ```json
     {
       "role": "super_admin",
       "full_name": "Super Administrator"
     }
     ```
4. Click **Create User** or **Send Invitation**

### Step 3: Verify Admin Profile

Run this query in SQL Editor to verify:

```sql
SELECT * FROM public.users WHERE email = 'admin.edu@aptivo.com';
```

You should see:
- Email: admin.edu@aptivo.com
- Role: super_admin
- Status: active
- Email Verified: true

### Step 4: Test Login

1. Go to http://localhost:3001/login
2. Switch to **Institution** tab (for admin login)
3. Enter credentials:
   - Email: `admin.edu@aptivo.com`
   - Password: `hamza1234`
4. Click **Sign In**

You should be redirected to `/admin/dashboard`

## Troubleshooting

### If admin user doesn't appear in public.users:

Run this SQL manually:

```sql
-- Get the admin user ID from auth.users
SELECT id FROM auth.users WHERE email = 'admin.edu@aptivo.com';

-- Then insert into public.users (replace YOUR_ADMIN_ID with the actual ID)
INSERT INTO public.users (id, email, full_name, role, status, email_verified, password_hash)
VALUES (
    'YOUR_ADMIN_ID',
    'admin.edu@aptivo.com',
    'Super Administrator',
    'super_admin',
    'active',
    true,
    'managed-by-auth'
)
ON CONFLICT (id) DO UPDATE SET
    role = 'super_admin',
    status = 'active',
    email_verified = true;
```

### If you still get permission errors:

Run this to temporarily disable RLS:

```sql
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```

Then try logging in again. After successful login, you can re-enable RLS:

```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
```

## Files Created

1. **COMPLETE_FIX_ADMIN_LOGIN.sql** - Complete SQL migration to fix all issues
2. **fix-and-create-admin.js** - Automated script (requires service role key)
3. **ADMIN_SETUP_INSTRUCTIONS.md** - This file

## Next Steps

After successful admin login:
1. Test student registration and login
2. Test institution admin registration and login
3. Verify all user roles work correctly
4. Check that profile sync works for new registrations
