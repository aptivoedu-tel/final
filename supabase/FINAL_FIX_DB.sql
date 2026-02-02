-- ==========================================================
-- FINAL DATABASE REPAIR SCRIPT
-- RUN THIS IN SUPABASE SQL EDITOR
-- ==========================================================

-- 1. UNLOCK DATABASE (Disable Row Level Security)
-- This fixes "new row violates row-level security policy"
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE universities DISABLE ROW LEVEL SECURITY;
ALTER TABLE institutions DISABLE ROW LEVEL SECURITY;
ALTER TABLE institution_admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE topics DISABLE ROW LEVEL SECURITY;
ALTER TABLE subtopics DISABLE ROW LEVEL SECURITY;
ALTER TABLE mcqs DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_university_enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_topic_enrollments DISABLE ROW LEVEL SECURITY;
-- Check if table exists before disabling (for new tables)
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'university_content_access') THEN
        ALTER TABLE university_content_access DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;


-- 2. ENSURE ARCHITECTURE (Missing Tables/Columns)
CREATE TABLE IF NOT EXISTS university_content_access (
  id SERIAL PRIMARY KEY,
  university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
  subtopic_id INTEGER REFERENCES subtopics(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(university_id, subject_id, topic_id, subtopic_id)
);

-- Fix Student Enrollments
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_university_enrollments' AND column_name = 'status') THEN
        ALTER TABLE student_university_enrollments ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_university_enrollments' AND column_name = 'verified_at') THEN
        ALTER TABLE student_university_enrollments ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;
