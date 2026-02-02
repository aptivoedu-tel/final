# ✅ QUICK CHECKLIST - Admin Login Fix

## 📋 Follow These Steps in Order

### ☐ Step 1: Apply SQL Migration
- [ ] Open Supabase SQL Editor (browser should be open)
- [ ] Click "New Query"
- [ ] Copy content from `COMPLETE_FIX_ADMIN_LOGIN.sql`
- [ ] Paste into SQL Editor
- [ ] Click "RUN"
- [ ] Verify "Success" message appears

### ☐ Step 2: Create Admin User
- [ ] Go to Authentication > Users in Supabase
- [ ] Click "Add User"
- [ ] Email: `admin.edu@aptivo.com`
- [ ] Password: `hamza1234`
- [ ] ✅ Check "Auto Confirm User"
- [ ] Add User Metadata: `{"role": "super_admin", "full_name": "Super Administrator"}`
- [ ] Click "Create User"
- [ ] Verify user appears in list with green checkmark

### ☐ Step 3: Test Login
- [ ] Go to http://localhost:3001/login
- [ ] Click "Institution" tab
- [ ] Email: `admin.edu@aptivo.com`
- [ ] Password: `hamza1234`
- [ ] Click "Sign In to Portal"
- [ ] Verify redirect to `/admin/dashboard`
- [ ] Verify admin interface loads

---

## 🎯 Success Criteria

✅ **SQL Migration Success**
- No error messages
- "Success" appears in Supabase

✅ **Admin User Created**
- User visible in Authentication > Users
- Email confirmed (green checkmark)
- User metadata shows super_admin role

✅ **Login Works**
- No "Invalid credentials" error
- No "Permission denied" error
- Redirected to admin dashboard
- Can see admin menu

---

## 📁 Files You Need

1. **COMPLETE_FIX_ADMIN_LOGIN.sql** ← Run this in Supabase
2. **VISUAL_GUIDE.md** ← Detailed instructions
3. **COMPLETE_SOLUTION.md** ← Troubleshooting help

---

## 🚨 Quick Troubleshooting

**Permission denied?**
```sql
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```

**Invalid credentials?**
- Check user exists in Authentication > Users
- Verify email is confirmed
- Reset password if needed

**Profile sync failed?**
- See COMPLETE_SOLUTION.md for detailed fix

---

## ⏱️ Estimated Time: 5 minutes

**Current Status**: Ready to start! 🚀
