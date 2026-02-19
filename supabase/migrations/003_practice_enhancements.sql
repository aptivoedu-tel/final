-- =====================================================
-- PRACTICE SESSION ENHANCEMENTS
-- Migration: Add topic-level tracking and progress tables
-- =====================================================

-- Add topic_id to practice_sessions for better categorization
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS topic_id INTEGER REFERENCES topics(id);

-- Create topic_progress table for tracking progress at topic level
CREATE TABLE IF NOT EXISTS topic_progress (
  id SERIAL PRIMARY KEY,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
  reading_percentage DECIMAL(5,2) DEFAULT 0.00,
  time_spent_seconds INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  first_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(student_id, topic_id)
);

-- Ensure mcqs table has topic_id for direct topic-level assignment if needed
ALTER TABLE mcqs ADD COLUMN IF NOT EXISTS topic_id INTEGER REFERENCES topics(id);

-- Create an index to speed up topic-level MCQ fetching
CREATE INDEX IF NOT EXISTS idx_mcqs_topic_id ON mcqs(topic_id);

-- Create Function for robust performance calculation
CREATE OR REPLACE FUNCTION get_student_performance_by_subject(p_student_id UUID)
RETURNS TABLE (
    subject TEXT,
    score INTEGER,
    fullMark INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH session_subjects AS (
        SELECT 
            ps.score_percentage,
            COALESCE(sub_subj.name, top_subj.name) as subject_name
        FROM practice_sessions ps
        LEFT JOIN subtopics st ON ps.subtopic_id = st.id
        LEFT JOIN topics sub_t ON st.topic_id = sub_t.id
        LEFT JOIN subjects sub_subj ON sub_t.subject_id = sub_subj.id
        LEFT JOIN topics t ON ps.topic_id = t.id
        LEFT JOIN subjects top_subj ON t.subject_id = top_subj.id
        WHERE ps.student_id = p_student_id 
        AND ps.is_completed = TRUE
        AND ps.score_percentage IS NOT NULL
    )
    SELECT 
        subject_name::TEXT as subject,
        ROUND(AVG(score_percentage))::INTEGER as score,
        100::INTEGER as fullMark
    FROM session_subjects
    WHERE subject_name IS NOT NULL
    GROUP BY subject_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
