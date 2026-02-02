# 🎯 STEP-BY-STEP VISUAL GUIDE

## ⚡ Quick Fix (5 minutes)

### Step 1: Open SQL Editor ✅ (DONE - Browser should be open)

The browser should now be open at:
**https://supabase.com/dashboard/project/gkggwmxndvztbsibdyph/sql**

If not, manually open this URL in your browser.

---

### Step 2: Apply the SQL Migration

1. **In the Supabase SQL Editor:**
   - Click the **"New Query"** button (top right)
   
2. **Open this file in your code editor:**
   - File: `supabase/COMPLETE_FIX_ADMIN_LOGIN.sql`
   - Select ALL content (Ctrl+A)
   - Copy (Ctrl+C)

3. **Back in Supabase SQL Editor:**
   - Click in the editor area
   - Paste the SQL (Ctrl+V)
   - Click **"RUN"** button (or press Ctrl+Enter)

4. **Wait for success message:**
   - You should see "Success. No rows returned"
   - Or check the output panel at the bottom

---

### Step 3: Create Admin User

1. **In Supabase Dashboard:**
   - Click **"Authentication"** in left sidebar
   - Click **"Users"** 
   - Click **"Add User"** button (green button, top right)

2. **Fill in the form:**
   ```
   Email Address: admin.edu@aptivo.com
   Password: hamza1234
   ```

3. **IMPORTANT - Check this box:**
   - ✅ **"Auto Confirm User"** - MUST be checked!

4. **Add User Metadata:**
   - Click on **"User Metadata"** section to expand it
   - In the JSON editor, paste:
   ```json
   {
     "role": "super_admin",
     "full_name": "Super Administrator"
   }
   ```

5. **Create the user:**
   - Click **"Create User"** button at the bottom

---

### Step 4: Test Login

1. **Go to your app:**
   - URL: http://localhost:3001/login
   - (Your dev server should already be running)

2. **On the login page:**
   - Click the **"Institution"** tab (NOT Student)
   - This is where admins login

3. **Enter credentials:**
   - Email: `admin.edu@aptivo.com`
   - Password: `hamza1234`

4. **Click "Sign In to Portal"**

5. **Expected result:**
   - You should be redirected to `/admin/dashboard`
   - You should see the admin interface

---

## ✅ Success Indicators

### After SQL Migration:
- ✅ No error messages in Supabase
- ✅ "Success" message appears

### After Creating Admin User:
- ✅ User appears in the Users list
- ✅ Email shows as "Confirmed" (green checkmark)
- ✅ No error messages

### After Login:
- ✅ No "Invalid credentials" error
- ✅ No "Permission denied" error
- ✅ Redirected to `/admin/dashboard`
- ✅ Can see admin menu/interface

---

## 🚨 If Something Goes Wrong

### Error: "Permission denied for table users"

**Quick Fix:**
1. Go back to SQL Editor
2. Run this single command:
```sql
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```
3. Try logging in again
4. After successful login, run:
```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
```

### Error: "Invalid credentials"

**Check 1:** Verify user was created
1. Go to Authentication > Users
2. Look for admin.edu@aptivo.com
3. If not there, repeat Step 3 above

**Check 2:** Verify email is confirmed
1. Find the user in the list
2. Look for green checkmark next to email
3. If red X, click the user and click "Confirm Email"

**Check 3:** Reset password
1. Click the three dots (...) next to the user
2. Select "Reset Password"
3. Enter: hamza1234
4. Save

### Error: "Profile sync failed"

**Run this in SQL Editor:**
```sql
-- Get the admin user ID
SELECT id FROM auth.users WHERE email = 'admin.edu@aptivo.com';

-- Copy the ID from the result, then run (replace YOUR_ID):
INSERT INTO public.users (id, email, full_name, role, status, email_verified, password_hash)
VALUES (
    'YOUR_ID_HERE',
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

---

## 🎉 What to Do After Successful Login

1. **Explore the admin dashboard**
   - Check all menu items work
   - Verify you can access admin features

2. **Test other user types:**
   - Try creating a student account
   - Try creating an institution admin account
   - Verify they can login

3. **Check the university content mapping:**
   - Go to the university management section
   - Verify you can map content to universities

---

## 📞 Still Having Issues?

1. **Check browser console:**
   - Press F12
   - Go to Console tab
   - Look for error messages
   - Share any red errors

2. **Check Supabase logs:**
   - In Supabase Dashboard
   - Go to Logs section
   - Look for recent errors

3. **Verify environment:**
   - Check `.env.local` has correct values
   - Restart dev server: `npm run dev`

---

## 📁 Reference Files

- `COMPLETE_FIX_ADMIN_LOGIN.sql` - The SQL migration to run
- `COMPLETE_SOLUTION.md` - Comprehensive troubleshooting guide
- `ADMIN_SETUP_INSTRUCTIONS.md` - Detailed setup instructions

---

**Current Status**: Browser opened, ready for Step 2! 🚀
