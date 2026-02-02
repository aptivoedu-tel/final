-- ============================================================
-- NUCLEAR OPTION: Disable ALL RLS and Grant ALL Permissions
-- Use this if you're still getting permission errors
-- WARNING: This is for development only!
-- ============================================================

-- Disable RLS on ALL tables
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' DISABLE ROW LEVEL SECURITY';
        RAISE NOTICE 'Disabled RLS on: %', r.tablename;
    END LOOP;
END $$;

-- Grant ALL privileges on ALL tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;

-- Verify
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE '⚠️  RLS DISABLED ON ALL TABLES';
    RAISE NOTICE '✅ ALL PERMISSIONS GRANTED';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'This is for DEVELOPMENT ONLY!';
    RAISE NOTICE 'Re-enable RLS for production.';
    RAISE NOTICE '===========================================';
END $$;
