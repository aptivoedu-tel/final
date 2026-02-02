-- ============================================================
-- DIAGNOSTIC: Check Current Database State
-- Run this to see what content exists and why it's not showing
-- ============================================================

-- 1. Check Universities
SELECT '=== UNIVERSITIES ===' as section;
SELECT id, name, is_active, created_at 
FROM universities 
ORDER BY id;

-- 2. Check Subjects
SELECT '=== SUBJECTS ===' as section;
SELECT id, name, is_active, created_at 
FROM subjects 
ORDER BY id;

-- 3. Check Topics
SELECT '=== TOPICS ===' as section;
SELECT t.id, t.name, s.name as subject, t.is_active, t.created_at
FROM topics t
LEFT JOIN subjects s ON s.id = t.subject_id
ORDER BY s.name, t.id;

-- 4. Check Subtopics
SELECT '=== SUBTOPICS ===' as section;
SELECT st.id, st.name, t.name as topic, s.name as subject, st.is_active, st.created_at
FROM subtopics st
LEFT JOIN topics t ON t.id = st.topic_id
LEFT JOIN subjects s ON s.id = t.subject_id
ORDER BY s.name, t.name, st.id;

-- 5. Check MCQs
SELECT '=== MCQs ===' as section;
SELECT 
    COUNT(*) as total_mcqs,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_mcqs,
    COUNT(DISTINCT subtopic_id) as subtopics_with_mcqs
FROM mcqs;

-- 6. Check Content Mappings
SELECT '=== CONTENT MAPPINGS ===' as section;
SELECT 
    COUNT(*) as total_mappings,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_mappings,
    COUNT(DISTINCT university_id) as universities_with_content,
    COUNT(DISTINCT subject_id) as subjects_mapped,
    COUNT(DISTINCT topic_id) as topics_mapped,
    COUNT(DISTINCT subtopic_id) as subtopics_mapped
FROM university_content_access;

-- 7. Check Student Enrollments
SELECT '=== STUDENT ENROLLMENTS ===' as section;
SELECT 
    se.id,
    u.email as student_email,
    uni.name as university,
    se.status,
    se.is_active,
    se.enrollment_date
FROM student_university_enrollments se
LEFT JOIN users u ON u.id = se.student_id
LEFT JOIN universities uni ON uni.id = se.university_id
ORDER BY se.enrollment_date DESC;

-- 8. Detailed Content Mapping View
SELECT '=== DETAILED CONTENT MAPPINGS ===' as section;
SELECT 
    u.name as university,
    s.name as subject,
    t.name as topic,
    st.name as subtopic,
    uca.is_active as mapping_active,
    COUNT(m.id) as mcq_count
FROM university_content_access uca
JOIN universities u ON u.id = uca.university_id
JOIN subjects s ON s.id = uca.subject_id
LEFT JOIN topics t ON t.id = uca.topic_id
LEFT JOIN subtopics st ON st.id = uca.subtopic_id
LEFT JOIN mcqs m ON m.subtopic_id = st.id AND m.is_active = true
GROUP BY u.name, s.name, t.name, st.name, uca.is_active
ORDER BY u.name, s.name, t.name, st.name
LIMIT 50;

-- 9. Check for orphaned content (content not mapped to any university)
SELECT '=== ORPHANED SUBTOPICS (Not Mapped to Any University) ===' as section;
SELECT 
    st.id,
    st.name as subtopic,
    t.name as topic,
    s.name as subject,
    COUNT(m.id) as mcq_count
FROM subtopics st
LEFT JOIN topics t ON t.id = st.topic_id
LEFT JOIN subjects s ON s.id = t.subject_id
LEFT JOIN mcqs m ON m.subtopic_id = st.id
LEFT JOIN university_content_access uca ON uca.subtopic_id = st.id
WHERE uca.id IS NULL
GROUP BY st.id, st.name, t.name, s.name
ORDER BY s.name, t.name, st.name;

-- 10. Summary
SELECT '=== SUMMARY ===' as section;
SELECT 
    (SELECT COUNT(*) FROM universities WHERE is_active = true) as active_universities,
    (SELECT COUNT(*) FROM subjects WHERE is_active = true) as active_subjects,
    (SELECT COUNT(*) FROM topics WHERE is_active = true) as active_topics,
    (SELECT COUNT(*) FROM subtopics WHERE is_active = true) as active_subtopics,
    (SELECT COUNT(*) FROM mcqs WHERE is_active = true) as active_mcqs,
    (SELECT COUNT(*) FROM university_content_access WHERE is_active = true) as active_mappings,
    (SELECT COUNT(*) FROM student_university_enrollments WHERE is_active = true) as active_enrollments;
