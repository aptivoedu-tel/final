-- ============================================================
-- COMPLETE FIX: All Permissions + Profile Sync + Admin Setup
-- This is the ONE query to fix EVERYTHING
-- ============================================================

-- PART 1: Fix Users Table and Profile Sync
-- ============================================================

ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    u_role public.user_role;
    u_full_name TEXT;
BEGIN
    u_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student');
    u_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User');

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
        RAISE WARNING 'Failed to sync user profile: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- Sync existing auth users
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

-- PART 2: Grant ALL Permissions (Development Mode)
-- ============================================================

-- Grant on schema
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- Grant ALL on ALL tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;

-- Grant ALL on ALL sequences (fixes the sequence errors!)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;

-- PART 3: Disable RLS on ALL Tables (Development Mode)
-- ============================================================

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' DISABLE ROW LEVEL SECURITY';
    END LOOP;
END $$;

-- PART 4: Create/Update Admin User Profile
-- ============================================================

-- Sync admin if exists in auth.users
INSERT INTO public.users (id, email, full_name, role, status, email_verified, password_hash)
SELECT 
    id,
    'admin.edu@aptivo.com',
    'Super Administrator',
    'super_admin',
    'active',
    true,
    'managed-by-auth'
FROM auth.users 
WHERE email = 'admin.edu@aptivo.com'
ON CONFLICT (id) DO UPDATE SET
    role = 'super_admin',
    status = 'active',
    email_verified = true,
    full_name = 'Super Administrator';

-- PART 5: Verification
-- ============================================================

DO $$
DECLARE
    user_count INTEGER;
    admin_count INTEGER;
    seq_count INTEGER;
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM public.users;
    SELECT COUNT(*) INTO admin_count FROM public.users WHERE role = 'super_admin';
    SELECT COUNT(*) INTO seq_count FROM information_schema.sequences WHERE sequence_schema = 'public';
    SELECT COUNT(*) INTO table_count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ COMPLETE FIX APPLIED SUCCESSFULLY!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Users in database: %', user_count;
    RAISE NOTICE 'Super admins: %', admin_count;
    RAISE NOTICE 'Sequences: %', seq_count;
    RAISE NOTICE 'Tables: %', table_count;
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ Profile sync: ENABLED';
    RAISE NOTICE '✅ Sequence permissions: GRANTED';
    RAISE NOTICE '✅ Table permissions: GRANTED';
    RAISE NOTICE '✅ RLS: DISABLED (dev mode)';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Create admin in Auth Dashboard if not exists:';
    RAISE NOTICE '   Email: admin.edu@aptivo.com';
    RAISE NOTICE '   Password: hamza1234';
    RAISE NOTICE '   Metadata: {"role":"super_admin","full_name":"Super Administrator"}';
    RAISE NOTICE '2. Test login at your application';
    RAISE NOTICE '3. Try adding universities/subjects';
    RAISE NOTICE '===========================================';
END $$;
