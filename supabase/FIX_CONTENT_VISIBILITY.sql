-- ============================================================
-- FIX CONTENT VISIBILITY FOR STUDENTS
-- Makes uploaded content visible in university portal
-- ============================================================

-- PART 1: Ensure all universities are active and visible
UPDATE universities SET is_active = true WHERE is_active = false OR is_active IS NULL;

-- PART 2: Auto-map ALL existing content to ALL universities
-- This ensures students can see all uploaded content

-- First, clear existing mappings (optional - comment out if you want to keep existing mappings)
-- DELETE FROM university_content_access;

-- Map all subject-topic-subtopic combinations to all universities
INSERT INTO university_content_access (university_id, subject_id, topic_id, subtopic_id, is_active)
SELECT 
    u.id as university_id,
    s.id as subject_id,
    t.id as topic_id,
    st.id as subtopic_id,
    true as is_active
FROM universities u
CROSS JOIN subjects s
CROSS JOIN topics t
CROSS JOIN subtopics st
WHERE t.subject_id = s.id
  AND st.topic_id = t.id
  AND u.is_active = true
ON CONFLICT (university_id, subject_id, topic_id, subtopic_id) 
DO UPDATE SET is_active = true;

-- PART 3: Verify the mapping
DO $$
DECLARE
    uni_count INTEGER;
    subject_count INTEGER;
    topic_count INTEGER;
    subtopic_count INTEGER;
    mapping_count INTEGER;
    mcq_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO uni_count FROM universities WHERE is_active = true;
    SELECT COUNT(*) INTO subject_count FROM subjects WHERE is_active = true;
    SELECT COUNT(*) INTO topic_count FROM topics WHERE is_active = true;
    SELECT COUNT(*) INTO subtopic_count FROM subtopics WHERE is_active = true;
    SELECT COUNT(*) INTO mapping_count FROM university_content_access WHERE is_active = true;
    SELECT COUNT(*) INTO mcq_count FROM mcqs WHERE is_active = true;
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ CONTENT VISIBILITY FIX COMPLETED';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Content Statistics:';
    RAISE NOTICE '  Active Universities: %', uni_count;
    RAISE NOTICE '  Active Subjects: %', subject_count;
    RAISE NOTICE '  Active Topics: %', topic_count;
    RAISE NOTICE '  Active Subtopics: %', subtopic_count;
    RAISE NOTICE '  Content Mappings: %', mapping_count;
    RAISE NOTICE '  MCQs Available: %', mcq_count;
    RAISE NOTICE '===========================================';
    
    IF mapping_count = 0 THEN
        RAISE NOTICE '⚠️  WARNING: No content mappings created!';
        RAISE NOTICE 'This means you may not have uploaded any content yet.';
        RAISE NOTICE 'Please upload subjects, topics, and subtopics first.';
    ELSE
        RAISE NOTICE '✅ Students can now see all content!';
    END IF;
    
    RAISE NOTICE '===========================================';
END $$;

-- PART 4: List what content is available
SELECT 
    u.name as university,
    s.name as subject,
    t.name as topic,
    st.name as subtopic,
    COUNT(m.id) as mcq_count
FROM university_content_access uca
JOIN universities u ON u.id = uca.university_id
JOIN subjects s ON s.id = uca.subject_id
JOIN topics t ON t.id = uca.topic_id
JOIN subtopics st ON st.id = uca.subtopic_id
LEFT JOIN mcqs m ON m.subtopic_id = st.id AND m.is_active = true
WHERE uca.is_active = true
GROUP BY u.name, s.name, t.name, st.name
ORDER BY u.name, s.name, t.name, st.name
LIMIT 20;
