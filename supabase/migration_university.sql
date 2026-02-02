-- Migration: University Content Management Model

-- 1. Create the University Content Access table
-- This table controls which Subjects/Topics are available to a specific University
CREATE TABLE IF NOT EXISTS university_content_access (
  id SERIAL PRIMARY KEY,
  university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
  subtopic_id INTEGER REFERENCES subtopics(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure unique mapping for a specific hierarchy level
  UNIQUE(university_id, subject_id, topic_id, subtopic_id)
);

-- 2. Update Student Enrollments to support "Pending" status and "Verification"
-- We will modify the existing student_university_enrollments table
DO $$
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_university_enrollments' AND column_name = 'status') THEN
        ALTER TABLE student_university_enrollments ADD COLUMN status VARCHAR(20) DEFAULT 'pending'; -- 'pending', 'approved', 'waitlisted'
    END IF;

    -- Add verified_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_university_enrollments' AND column_name = 'verified_at') THEN
        ALTER TABLE student_university_enrollments ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 3. Disable RLS for the new table for development ease (Optional, but recommended for Setup)
ALTER TABLE university_content_access DISABLE ROW LEVEL SECURITY;
