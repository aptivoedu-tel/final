-- ============================================================
-- RESET AND FIX ALL CONTENT MAPPINGS (WITH PERMISSIONS)
-- WARNING: This clears existing mappings and re-links EVERYTHING
-- Use this if content is still not showing up
-- ============================================================

-- 0. Force Open Permissions (Disable RLS)
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE topics DISABLE ROW LEVEL SECURITY;
ALTER TABLE subtopics DISABLE ROW LEVEL SECURITY;
ALTER TABLE university_content_access DISABLE ROW LEVEL SECURITY;

-- 1. Clear existing bad/partial mappings
DELETE FROM university_content_access;

-- 2. Ensure all content is Active
UPDATE universities SET is_active = true;
UPDATE subjects SET is_active = true;
UPDATE topics SET is_active = true;
UPDATE subtopics SET is_active = true;
UPDATE mcqs SET is_active = true;

-- 3. Map ALL content to ALL universities (Fresh Link)
INSERT INTO university_content_access (university_id, subject_id, topic_id, subtopic_id, is_active)
SELECT 
    u.id, 
    s.id, 
    t.id, 
    st.id, 
    true
FROM universities u
CROSS JOIN subjects s
JOIN topics t ON t.subject_id = s.id
JOIN subtopics st ON st.topic_id = t.id
WHERE u.is_active = true;

-- 4. Verify results
DO $$
DECLARE
    mapping_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO mapping_count FROM university_content_access;
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ Mappings Reset Successfully';
    RAISE NOTICE 'Total Connections Created: %', mapping_count;
    RAISE NOTICE '===========================================';
END $$;
