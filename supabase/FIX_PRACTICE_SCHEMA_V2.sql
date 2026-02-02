-- ============================================================
-- FIX PRACTICE SESSIONS SCHEMA (COMPREHENSIVE)
-- Fixes missing columns: session_type, skipped_questions, etc.
-- ============================================================

DO $$
BEGIN
    -- 1. session_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'practice_sessions' 
        AND column_name = 'session_type'
    ) THEN
        ALTER TABLE practice_sessions ADD COLUMN session_type TEXT DEFAULT 'practice';
        RAISE NOTICE 'Added session_type column';
    END IF;

    -- 2. skipped_questions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'practice_sessions' 
        AND column_name = 'skipped_questions'
    ) THEN
        ALTER TABLE practice_sessions ADD COLUMN skipped_questions INTEGER DEFAULT 0;
        RAISE NOTICE 'Added skipped_questions column';
    END IF;

    -- 3. time_spent_seconds
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'practice_sessions' 
        AND column_name = 'time_spent_seconds'
    ) THEN
        ALTER TABLE practice_sessions ADD COLUMN time_spent_seconds INTEGER DEFAULT 0;
        RAISE NOTICE 'Added time_spent_seconds column';
    END IF;

    -- 4. completed_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'practice_sessions' 
        AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE practice_sessions ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added completed_at column';
    END IF;

    -- 5. score_percentage (ensure exists)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'practice_sessions' 
        AND column_name = 'score_percentage'
    ) THEN
        ALTER TABLE practice_sessions ADD COLUMN score_percentage NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added score_percentage column';
    END IF;

    -- 6. total_questions (ensure exists)
     IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'practice_sessions' 
        AND column_name = 'total_questions'
    ) THEN
        ALTER TABLE practice_sessions ADD COLUMN total_questions INTEGER DEFAULT 0;
        RAISE NOTICE 'Added total_questions column';
    END IF;

    -- 7. correct_answers / wrong_answers (just in case they were reverted)
     IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'practice_sessions' 
        AND column_name = 'correct_answers'
    ) THEN
        ALTER TABLE practice_sessions ADD COLUMN correct_answers INTEGER DEFAULT 0;
        RAISE NOTICE 'Added correct_answers column';
    END IF;
     IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'practice_sessions' 
        AND column_name = 'wrong_answers'
    ) THEN
        ALTER TABLE practice_sessions ADD COLUMN wrong_answers INTEGER DEFAULT 0;
        RAISE NOTICE 'Added wrong_answers column';
    END IF;

    -- 8. Proactive Fix for mcq_attempts table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mcq_attempts' 
        AND column_name = 'time_spent_seconds'
    ) THEN
        ALTER TABLE mcq_attempts ADD COLUMN time_spent_seconds INTEGER DEFAULT 0;
        RAISE NOTICE 'Added time_spent_seconds to mcq_attempts';
    END IF;

END $$;

-- Refresh Schema Cache
ANALYZE practice_sessions;
ANALYZE mcq_attempts;

-- Grant permissions again to be sure
GRANT ALL ON practice_sessions TO authenticated;
GRANT ALL ON practice_sessions TO anon;
GRANT ALL ON mcq_attempts TO authenticated;
GRANT ALL ON mcq_attempts TO anon;

-- Final Output
DO $$
BEGIN
    RAISE NOTICE '✅ Practice Sessions Schema FULLY UPDATED';
END $$;
