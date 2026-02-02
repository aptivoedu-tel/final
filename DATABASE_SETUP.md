# 🗄️ DATABASE SETUP GUIDE

## Step 1: Apply Notifications Migration

You need to run the migration file on your Supabase database to enable the notifications system.

### Option A: Using Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your project: `xatwuibpzkjmuhfotopp`
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the entire contents of `supabase/migrations/001_enhanced_notifications.sql`
6. Paste into the SQL editor
7. Click **Run** button
8. Verify success message

### Option B: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref xatwuibpzkjmuhfotopp

# Run the migration
supabase db push
```

---

## Step 2: Create Storage Bucket for Avatars

For the profile avatar upload feature to work, you need to create a storage bucket.

### Using Supabase Dashboard:

1. Go to **Storage** in the left sidebar
2. Click **New bucket**
3. Name: `user-avatars`
4. Public bucket: **Yes** (so avatars can be displayed)
5. Click **Create bucket**

### Set Bucket Policies:

After creating the bucket, set these policies:

**Policy 1: Allow authenticated users to upload**
```sql
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Policy 2: Allow public read access**
```sql
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-avatars');
```

**Policy 3: Allow users to update their own avatar**
```sql
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## Step 3: Verify Database Schema

After applying the migration, verify these tables exist:

### Check Tables:
```sql
-- Should return all your tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Check Notification Tables Specifically:
```sql
-- Check notifications table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications';

-- Check notification_recipients table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notification_recipients';
```

### Check Functions:
```sql
-- List all functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION';
```

You should see:
- `send_bulk_notification`
- `get_unread_notification_count`
- `mark_notification_read`
- `mark_all_notifications_read`

---

## Step 4: Test the Setup

### Test Notification Function:
```sql
-- This should work without errors
SELECT send_bulk_notification(
  'Test Notification',
  'This is a test message',
  'normal',
  'super_admin',
  NULL,
  ARRAY[]::uuid[]
);
```

### Test Storage Bucket:
1. Go to **Storage** > **user-avatars**
2. Try uploading a test image
3. Verify you can see the image URL

---

## Troubleshooting

### If migration fails:

**Error: "relation already exists"**
- Some tables might already exist
- Comment out the CREATE TABLE statements for existing tables
- Run only the ALTER TABLE and CREATE FUNCTION statements

**Error: "permission denied"**
- Make sure you're logged in as the project owner
- Check RLS policies aren't blocking the operation

**Error: "function already exists"**
- Drop the existing function first:
  ```sql
  DROP FUNCTION IF EXISTS send_bulk_notification;
  ```
- Then run the CREATE FUNCTION statement again

### If storage upload fails:

**Error: "new row violates row-level security policy"**
- Make sure the storage policies are created
- Verify the bucket is set to public
- Check that the user is authenticated

---

## Next Steps After Setup

Once the database is set up:

1. ✅ Restart your Next.js dev server to pick up the new schema
2. ✅ Test the notification service functions
3. ✅ Test avatar upload functionality
4. ✅ Proceed with implementing the UI pages

---

## Quick Verification Checklist

- [ ] Migration applied successfully
- [ ] `notification_recipients` table exists
- [ ] All 4 notification functions exist
- [ ] `user-avatars` storage bucket created
- [ ] Storage policies set up
- [ ] Test notification sent successfully
- [ ] Test image uploaded to storage

Once all items are checked, you're ready to proceed with the UI implementation!
