# 🚀 Aptivo Portal - Quick Setup Guide

## Step 1: Supabase Database Setup

### 1.1 Create Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in project details:
   - Name: `aptivo-portal`
   - Database Password: (save this securely)
   - Region: Choose closest to you
4. Wait for project to be created (~2 minutes)

### 1.2 Run Database Schema
1. In Supabase Dashboard, go to **SQL Editor**
2. Click "+ New query"
3. Open `supabase/schema.sql` from this project
4. Copy ALL contents
5. Paste into Supabase SQL Editor
6. Click "Run" (or press Ctrl+Enter)
7. Wait for success message (may take 10-20 seconds)

### 1.3 Get API Credentials
1 Go to **Project Settings** (gear icon) → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: `eyJhbGc...` (long token)

### 1.4 Update Environment File
1. Open `.env.local` in the project root
2. Replace placeholders:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_long_anon_key_here
   ```
3. Save the file

## Step 2: Create Demo Accounts

### Option A: Using Supabase Auth UI (Recommended)
1. In Supabase Dashboard → **Authentication** → **Users**
2. Click "Add User" (+ icon)
3. Enter:
   - Email: `admin@aptivo.com`
   - Password: `Admin@123`
   - Auto Confirm User: ON
4. Click "Create User"
5. Note the User ID (UUID)

6. Go to **SQL Editor** and run:
```sql
-- Update the admin user
UPDATE users 
SET role = 'super_admin', 
    full_name = 'Super Admin',
    status = 'active',
    email_verified = true
WHERE email = 'admin@aptivo.com';
```

7. Repeat for student:
```sql
-- Insert student user
INSERT INTO users (id, email, full_name, role, status, email_verified)
SELECT id, 'student@demo.com', 'Demo Student', 'student', 'active', true
FROM auth.users
WHERE email = 'student@demo.com';
```

### Option B: Direct SQL Insert (Quick Method)
Run this in Supabase SQL Editor:
```sql
-- Create demo users (Note: This won't work with Supabase Auth, use Option A)
-- This is just for reference
```

## Step 3: Run the Application

1. **Start development server**:
   ```bash
   npm run dev
   ```

2. **Open browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

3. **Login**:
   - Email: `admin@aptivo.com`
   - Password: `Admin@123`

## 📌 Important Notes

### Supabase Free Tier Limits
- ✅ 500MB database storage
- ✅ 50,000 monthly active users
- ✅ 2GB file storage
- ✅ 50MB file upload size
- ✅ Unlimited API requests

### Authentication
- Supabase Auth is used for user management
- Passwords are hashed automatically
- Sessions persist in localStorage
- RLS (Row Level Security) policies are active

### First Time Setup Checklist
- [ ] Supabase project created
- [ ] Database schema executed successfully
- [ ] `.env.local` file updated with credentials
- [ ] Demo accounts created
- [ ] Development server running
- [ ] Can login with admin credentials

## 🆘 Troubleshooting

### Problem: "Missing Supabase environment variables"
**Solution**: Make sure `.env.local` has correct URL and key

### Problem: "Invalid login credentials"
**Solution**: 
1. Check if user exists in Supabase Auth
2. Verify password is correct
3. Ensure user status is 'active' in database

### Problem: Database schema errors
**Solution**:
1. Make sure you copied the ENTIRE schema.sql
2. Check for any error messages in SQL Editor
3. Drop all tables and re-run if needed

### Problem: "Not authorized" errors
**Solution**:
1. RLS policies might be blocking access
2. Check if user role is set correctly
3. Verify Supabase anon key is correct

## 🎯 Next Steps

After successful setup:

1. **Explore Admin Dashboard**
   - Go to `/admin/dashboard`
   - View statistics and quick actions

2. **Upload Sample MCQs**
   - Go to `/admin/upload`
   - Download template
   - Upload sample Excel file

3. **Create Content Hierarchy**
   - Add subjects, topics, and subtopics
   - Link MCQs to subtopics

4. **Test Student Flow**
   - Logout and login as student
   - Enroll in topics
   - Start practice sessions

## 📞 Need Help?

- Check README.md for detailed documentation
- Review code comments in service files
- Inspect browser console for errors
- Check Supabase logs for API errors

---

**You're all set! Happy coding! 🎉**
