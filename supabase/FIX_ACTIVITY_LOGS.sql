-- ============================================================
-- ACTIVITY LOGS & PERMISSIONS FIX
-- This script ensures the activity_logs table exists and
-- has the correct permissions for admin dashboard.
-- ============================================================

-- 1. Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(100) NOT NULL,
  activity_data JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Ensure users table exists (required for foreign key)
-- (Assuming it already exists as per schema.sql)

-- 3. PERMISSIONS
-- Disable RLS for development to avoid empty fetch errors
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;

-- Grant permissions to public roles
GRANT ALL ON activity_logs TO authenticated, anon;

-- Fix sequences
GRANT USAGE, SELECT ON SEQUENCE activity_logs_id_seq TO authenticated, anon;

-- 4. Sample Activity (Optional: helps verify the view)
-- INSERT INTO activity_logs (user_id, activity_type, activity_data)
-- SELECT id, 'system_check', '{"status": "initialized"}'::jsonb 
-- FROM users WHERE role = 'super_admin' LIMIT 1;

DO $$
BEGIN
    RAISE NOTICE '✅ Activity Logs Schema & Permissions Fix applied.';
END $$;
