-- Policies to allow Admins/Authenticated Users to manage content
-- Run this in Supabase SQL Editor to fix RLS errors.

-- 1. Subjects
CREATE POLICY "Enable access for users" ON subjects FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 2. Topics
CREATE POLICY "Enable access for users" ON topics FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 3. Subtopics
CREATE POLICY "Enable access for users" ON subtopics FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 4. Universities
CREATE POLICY "Enable access for users" ON universities FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 5. Content Mapping
CREATE POLICY "Enable access for users" ON university_content_access FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 6. Enrollments
CREATE POLICY "Enable access for users" ON student_university_enrollments FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
