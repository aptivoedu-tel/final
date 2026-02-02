-- ==========================================================
-- COMPLETE FIX: Profile Sync + Admin Login + Permissions
-- ==========================================================
-- This migration fixes:
-- 1. Permission denied errors on users table
-- 2. Profile sync issues
-- 3. Sets up admin account: admin.edu@aptivo.com / hamza1234
-- ==========================================================

-- STEP 1: Fix users table permissions
-- Remove NOT NULL constraint on password_hash (Supabase Auth manages passwords)
ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;

-- Disable RLS temporarily to fix permission issues
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- STEP 2: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- STEP 3: Create improved auto-sync function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    u_role public.user_role;
    u_full_name TEXT;
BEGIN
    -- Extract metadata from auth.users (sent during signUp)
    u_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student');
    u_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User');

    -- Insert into public.users with proper error handling
    INSERT INTO public.users (id, email, full_name, role, status, email_verified, password_hash)
    VALUES (
        NEW.id, 
        NEW.email, 
        u_full_name,
        u_role,
        CASE WHEN u_role = 'super_admin' THEN 'active' ELSE 'pending' END,
        false,
        'managed-by-auth'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the auth user creation
        RAISE WARNING 'Failed to sync user profile: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 4: Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- STEP 5: Sync existing auth users that don't have profiles
INSERT INTO public.users (id, email, full_name, role, status, email_verified, password_hash)
SELECT 
    au.id, 
    au.email, 
    COALESCE(au.raw_user_meta_data->>'full_name', 'User'), 
    COALESCE((au.raw_user_meta_data->>'role')::public.user_role, 'student'),
    'active',
    COALESCE(au.email_confirmed_at IS NOT NULL, false),
    'managed-by-auth'
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- STEP 6: Create or update the super admin account
-- First, check if the admin exists in auth.users
DO $$
DECLARE
    admin_user_id UUID;
    admin_exists BOOLEAN;
BEGIN
    -- Check if admin exists in auth.users
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'admin.edu@aptivo.com';
    
    admin_exists := FOUND;
    
    IF NOT admin_exists THEN
        -- Create admin in auth.users (you'll need to set password via Supabase Dashboard or Auth API)
        -- This is a placeholder - actual password must be set via Supabase Auth
        RAISE NOTICE 'Admin user does not exist in auth.users. Please create via Supabase Dashboard or Auth API.';
        RAISE NOTICE 'Email: admin.edu@aptivo.com';
        RAISE NOTICE 'Password: hamza1234';
        RAISE NOTICE 'Role: super_admin';
    ELSE
        -- Admin exists, ensure profile is synced
        INSERT INTO public.users (id, email, full_name, role, status, email_verified, password_hash)
        VALUES (
            admin_user_id,
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
            email_verified = true,
            full_name = 'Super Administrator';
        
        RAISE NOTICE 'Admin profile synced successfully for existing auth user.';
    END IF;
END $$;

-- STEP 7: Grant necessary permissions
-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- Grant permissions on users table
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

-- Grant permissions on other tables
GRANT ALL ON public.subjects TO authenticated;
GRANT ALL ON public.topics TO authenticated;
GRANT ALL ON public.subtopics TO authenticated;
GRANT ALL ON public.universities TO authenticated;
GRANT ALL ON public.university_content_access TO authenticated;
GRANT ALL ON public.student_university_enrollments TO authenticated;
GRANT ALL ON public.institutions TO authenticated;
GRANT ALL ON public.institution_admins TO authenticated;

-- STEP 8: Set up RLS policies (more permissive for development)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Allow profile sync" ON public.users;
DROP POLICY IF EXISTS "Super admins can do everything" ON public.users;

-- Create new policies
CREATE POLICY "Users can view their own profile" 
    ON public.users FOR SELECT 
    USING (auth.uid() = id OR auth.jwt()->>'role' = 'super_admin');

CREATE POLICY "Users can update their own profile" 
    ON public.users FOR UPDATE 
    USING (auth.uid() = id OR auth.jwt()->>'role' = 'super_admin');

CREATE POLICY "Allow profile sync" 
    ON public.users FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Super admins can do everything" 
    ON public.users FOR ALL 
    USING (auth.jwt()->>'role' = 'super_admin');

-- STEP 9: Fix RLS on other tables
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_content_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_university_enrollments ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies for content tables
DROP POLICY IF EXISTS "Enable access for users" ON subjects;
DROP POLICY IF EXISTS "Enable access for users" ON topics;
DROP POLICY IF EXISTS "Enable access for users" ON subtopics;
DROP POLICY IF EXISTS "Enable access for users" ON universities;
DROP POLICY IF EXISTS "Enable access for users" ON university_content_access;
DROP POLICY IF EXISTS "Enable access for users" ON student_university_enrollments;

-- Create permissive policies for authenticated users
CREATE POLICY "Enable access for authenticated users" ON subjects 
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users" ON topics 
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users" ON subtopics 
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users" ON universities 
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users" ON university_content_access 
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable access for authenticated users" ON student_university_enrollments 
    FOR ALL USING (auth.role() = 'authenticated');

-- STEP 10: Verify setup
DO $$
DECLARE
    user_count INTEGER;
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM public.users;
    SELECT COUNT(*) INTO admin_count FROM public.users WHERE role = 'super_admin';
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Setup Complete!';
    RAISE NOTICE 'Total users in public.users: %', user_count;
    RAISE NOTICE 'Super admins: %', admin_count;
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. If admin user does not exist, create it via Supabase Dashboard:';
    RAISE NOTICE '   - Go to Authentication > Users > Add User';
    RAISE NOTICE '   - Email: admin.edu@aptivo.com';
    RAISE NOTICE '   - Password: hamza1234';
    RAISE NOTICE '   - Auto Confirm: Yes';
    RAISE NOTICE '   - User Metadata: {"role": "super_admin", "full_name": "Super Administrator"}';
    RAISE NOTICE '2. Test login at your application';
    RAISE NOTICE '===========================================';
END $$;
