# 🚨 FIX MISSING LESSONS GUIDE

## The Problem
You uploaded content and added universities, but:
1. "No lessons available" appears in the student view.
2. New universities are not showing up.

**Reason:** 
- New universities are created as "inactive" by default.
- Uploaded content wasn't automatically "mapped" to universities in the database.

## ✅ The Solution (Do this now!)

### Step 1: Run the SQL Fix
I have created a script that fixes EVERYTHING in one go.

1. Open **Supabase SQL Editor**: [https://supabase.com/dashboard/project/_/sql](https://supabase.com/dashboard/project/_/sql)
2. Open the file `FIX_MISSING_LESSONS.sql` I just created.
3. **Run the entire script.**

**What this script does:**
- ✅ Sets all universities to `is_active = true`
- ✅ Sets all topics/subtopics to `is_active = true`
- ✅ **Auto-assigns** all lessons to all universities (so they appear immediately)

### Step 2: Verify
1. Go back to your Student Dashboard.
2. Searching for "University" should now show results.
3. Clicking on a university should now show the subjects and lessons you uploaded.

## 🛡️ Future Prevention
I have also updated the **Upload Code** (`excelUploadService.ts`).
From now on, whenever you upload an Excel sheet, the system will **automatically** link that new lesson to all active universities. You won't need to run the SQL script again for new uploads!

---

**Status:**
- 🛠️ SQL Fix Created: `FIX_MISSING_LESSONS.sql` (RUN THIS!)
- 🛡️ Code Updated: `excelUploadService.ts` (Fixed for future)
