-- ============================================================
-- FIX DELETE CONSTRAINTS V2 (ENABLE CASCADE DELETE)
-- Prevents "violates foreign key constraint" errors when deleting content.
-- NOW INCLUDES 'uploads' TABLE
-- ============================================================

-- 1. Fix practice_sessions -> subtopics
ALTER TABLE practice_sessions DROP CONSTRAINT IF EXISTS practice_sessions_subtopic_id_fkey;
ALTER TABLE practice_sessions 
    ADD CONSTRAINT practice_sessions_subtopic_id_fkey 
    FOREIGN KEY (subtopic_id) 
    REFERENCES subtopics(id) 
    ON DELETE CASCADE;

-- 2. Fix practice_sessions -> universities
ALTER TABLE practice_sessions DROP CONSTRAINT IF EXISTS practice_sessions_university_id_fkey;
ALTER TABLE practice_sessions 
    ADD CONSTRAINT practice_sessions_university_id_fkey 
    FOREIGN KEY (university_id) 
    REFERENCES universities(id) 
    ON DELETE CASCADE;

-- 3. Fix practice_sessions -> users (student)
ALTER TABLE practice_sessions DROP CONSTRAINT IF EXISTS practice_sessions_student_id_fkey;
ALTER TABLE practice_sessions 
    ADD CONSTRAINT practice_sessions_student_id_fkey 
    FOREIGN KEY (student_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE;

-- 4. Fix mcq_attempts -> practice_sessions
ALTER TABLE mcq_attempts DROP CONSTRAINT IF EXISTS mcq_attempts_practice_session_id_fkey;
ALTER TABLE mcq_attempts 
    ADD CONSTRAINT mcq_attempts_practice_session_id_fkey 
    FOREIGN KEY (practice_session_id) 
    REFERENCES practice_sessions(id) 
    ON DELETE CASCADE;

-- 5. Fix mcq_attempts -> mcqs
ALTER TABLE mcq_attempts DROP CONSTRAINT IF EXISTS mcq_attempts_mcq_id_fkey;
ALTER TABLE mcq_attempts 
    ADD CONSTRAINT mcq_attempts_mcq_id_fkey 
    FOREIGN KEY (mcq_id) 
    REFERENCES mcqs(id) 
    ON DELETE CASCADE;

-- 6. Fix university_content_access (Ensure mappings get deleted if content deleted)
ALTER TABLE university_content_access DROP CONSTRAINT IF EXISTS university_content_access_subtopic_id_fkey;
ALTER TABLE university_content_access 
    ADD CONSTRAINT university_content_access_subtopic_id_fkey 
    FOREIGN KEY (subtopic_id) 
    REFERENCES subtopics(id) 
    ON DELETE CASCADE;
    
ALTER TABLE university_content_access DROP CONSTRAINT IF EXISTS university_content_access_topic_id_fkey;
ALTER TABLE university_content_access 
    ADD CONSTRAINT university_content_access_topic_id_fkey 
    FOREIGN KEY (topic_id) 
    REFERENCES topics(id) 
    ON DELETE CASCADE;

ALTER TABLE university_content_access DROP CONSTRAINT IF EXISTS university_content_access_subject_id_fkey;
ALTER TABLE university_content_access 
    ADD CONSTRAINT university_content_access_subject_id_fkey 
    FOREIGN KEY (subject_id) 
    REFERENCES subjects(id) 
    ON DELETE CASCADE;

-- 7. Fix subtopics -> topics (Recursive deletion)
ALTER TABLE subtopics DROP CONSTRAINT IF EXISTS subtopics_topic_id_fkey;
ALTER TABLE subtopics 
    ADD CONSTRAINT subtopics_topic_id_fkey 
    FOREIGN KEY (topic_id) 
    REFERENCES topics(id) 
    ON DELETE CASCADE;

-- 8. Fix topics -> subjects (Recursive deletion)
ALTER TABLE topics DROP CONSTRAINT IF EXISTS topics_subject_id_fkey;
ALTER TABLE topics 
    ADD CONSTRAINT topics_subject_id_fkey 
    FOREIGN KEY (subject_id) 
    REFERENCES subjects(id) 
    ON DELETE CASCADE;

-- 9. Fix uploads table (The new error)
ALTER TABLE uploads DROP CONSTRAINT IF EXISTS uploads_subtopic_id_fkey;
ALTER TABLE uploads 
    ADD CONSTRAINT uploads_subtopic_id_fkey 
    FOREIGN KEY (subtopic_id) 
    REFERENCES subtopics(id) 
    ON DELETE CASCADE;

ALTER TABLE uploads DROP CONSTRAINT IF EXISTS uploads_topic_id_fkey;
ALTER TABLE uploads 
    ADD CONSTRAINT uploads_topic_id_fkey 
    FOREIGN KEY (topic_id) 
    REFERENCES topics(id) 
    ON DELETE CASCADE;

ALTER TABLE uploads DROP CONSTRAINT IF EXISTS uploads_subject_id_fkey;
ALTER TABLE uploads 
    ADD CONSTRAINT uploads_subject_id_fkey 
    FOREIGN KEY (subject_id) 
    REFERENCES subjects(id) 
    ON DELETE CASCADE;

DO $$
BEGIN
    RAISE NOTICE '✅ Cascade Deletion Enabled for ALL Tables (Including Uploads)';
END $$;
