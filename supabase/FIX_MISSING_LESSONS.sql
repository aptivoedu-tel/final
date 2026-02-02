-- ============================================================
-- FIX MISSING LESSONS & UNIVERSITIES (Run this!)
-- ============================================================

-- 1. UNHIDE ALL UNIVERSITIES
-- Ensures all universities appear in the search list
UPDATE universities SET is_active = true;

-- 2. UNHIDE ALL CONTENT SECTIONS
-- Ensures existing subjects/topics are marked as active
UPDATE subjects SET is_active = true;
UPDATE topics SET is_active = true;
UPDATE subtopics SET is_active = true;
UPDATE mcqs SET is_active = true;

-- 3. AUTO-ASSIGN CONTENT TO UNIVERSITIES
-- This is the critical step! It links all content to all universities.
-- In a real app, you might want to be more selective, but for now this fixes the "empty" view.
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
WHERE t.subject_id = s.id     -- Link topic to subject
  AND st.topic_id = t.id      -- Link subtopic to topic
  AND u.is_active = true
ON CONFLICT (university_id, subject_id, topic_id, subtopic_id) 
DO UPDATE SET is_active = true;

-- 4. VERIFY THE FIX
SELECT 
    u.name as university, 
    COUNT(uca.id) as mapped_items 
FROM universities u
LEFT JOIN university_content_access uca ON uca.university_id = u.id
WHERE u.is_active = true
GROUP BY u.name;

-- You should see a count > 0 for your university now.
