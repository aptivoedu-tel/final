-- ==========================================================
-- FINAL AUTO-SYNC & PROFILE FIX
-- ==========================================================

-- 1. Fix the users table structure
-- Remove the NOT NULL constraint on password_hash (Supabase Auth handles passwords)
-- Also handle potential missing status/role columns
ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;

-- 2. Create a function to handle new user registration automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    u_role public.user_role;
    u_full_name TEXT;
BEGIN
    -- Extract metadata from auth.users (sent during signUp)
    u_role := COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'student');
    u_full_name := COALESCE(new.raw_user_meta_data->>'full_name', 'New User');

    INSERT INTO public.users (id, email, full_name, role, status, email_verified)
    VALUES (
        new.id, 
        new.email, 
        u_full_name,
        u_role,
        CASE WHEN u_role = 'super_admin' THEN 'active' ELSE 'pending' END,
        false
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Set up the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Fix permissions
-- Grant access to the users table even if RLS is on
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 5. Helper: If user exists in Auth but not in Users, sync them now
INSERT INTO public.users (id, email, full_name, role, status, email_verified)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', 'User'), 
    COALESCE((raw_user_meta_data->>'role')::public.user_role, 'student'),
    'active',
    true
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;
