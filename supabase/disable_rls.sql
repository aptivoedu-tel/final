-- Run this in your Supabase SQL Editor to allow the Setup Script to write data matches
-- This disables security checks for the initial setup. You can re-enable them later if needed.

ALTER TABLE universities DISABLE ROW LEVEL SECURITY;
ALTER TABLE institutions DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE topics DISABLE ROW LEVEL SECURITY;
ALTER TABLE subtopics DISABLE ROW LEVEL SECURITY;
ALTER TABLE mcqs DISABLE ROW LEVEL SECURITY;
ALTER TABLE institution_admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_university_enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_topic_enrollments DISABLE ROW LEVEL SECURITY;
