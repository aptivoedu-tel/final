-- ============================================================
-- ULTIMATE ADMIN & DASHBOARD PERMISSIONS FIX
-- This script ensures all tables used by the Admin Dashboard 
-- and Analytics services are accessible and correctly configured.
-- ============================================================

-- 1. Table: activity_logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(100) NOT NULL,
  activity_data JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table: practice_sessions (if missing)
CREATE TABLE IF NOT EXISTS practice_sessions (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    university_id INTEGER,
    subject_id INTEGER,
    topic_id INTEGER,
    subtopic_id INTEGER,
    total_questions INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    score_percentage INTEGER DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 3. DISABLE RLS ON ALL RELEVANT TABLES
-- This prevents the "Fetch error: {}" caused by permission denials
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE mcqs DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE topics DISABLE ROW LEVEL SECURITY;
ALTER TABLE subtopics DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_university_enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE institutions DISABLE ROW LEVEL SECURITY;
ALTER TABLE institution_admins DISABLE ROW LEVEL SECURITY;

-- 4. GRANT PERMISSIONS
GRANT ALL ON users TO authenticated, anon;
GRANT ALL ON activity_logs TO authenticated, anon;
GRANT ALL ON practice_sessions TO authenticated, anon;
GRANT ALL ON mcqs TO authenticated, anon;
GRANT ALL ON subjects TO authenticated, anon;
GRANT ALL ON topics TO authenticated, anon;
GRANT ALL ON subtopics TO authenticated, anon;
GRANT ALL ON student_university_enrollments TO authenticated, anon;
GRANT ALL ON institutions TO authenticated, anon;
GRANT ALL ON institution_admins TO authenticated, anon;

-- 5. FIX SEQUENCES
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

DO $$
BEGIN
    RAISE NOTICE '✅ Ultimate Admin Permissions Fix applied.';
END $$;
