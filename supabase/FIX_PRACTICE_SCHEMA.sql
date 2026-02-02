-- ============================================================
-- FIX PRACTICE SESSIONS SCHEMA
-- Error: "Could not find the 'correct_answers' column..."
-- ============================================================

-- 1. Add correct_answers column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'practice_sessions' 
        AND column_name = 'correct_answers'
    ) THEN
        ALTER TABLE practice_sessions ADD COLUMN correct_answers INTEGER DEFAULT 0;
        RAISE NOTICE 'Added correct_answers column';
    ELSE
        RAISE NOTICE 'correct_answers column already exists';
    END IF;
END $$;

-- 2. Add wrong_answers column if missing (proactive fix)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'practice_sessions' 
        AND column_name = 'wrong_answers'
    ) THEN
        ALTER TABLE practice_sessions ADD COLUMN wrong_answers INTEGER DEFAULT 0;
        RAISE NOTICE 'Added wrong_answers column';
    END IF;
END $$;

-- 3. Verify other common columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'practice_sessions' 
        AND column_name = 'total_questions'
    ) THEN
        ALTER TABLE practice_sessions ADD COLUMN total_questions INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'practice_sessions' 
        AND column_name = 'score_percentage'
    ) THEN
        ALTER TABLE practice_sessions ADD COLUMN score_percentage NUMERIC DEFAULT 0;
    END IF;
END $$;

-- 4. Refresh Schema Cache
ANALYZE practice_sessions;

-- 5. Grant Permissions
GRANT ALL ON practice_sessions TO authenticated;
GRANT ALL ON practice_sessions TO anon;

-- 6. Final Notice
DO $$
BEGIN
    RAISE NOTICE '✅ Practice Sessions Schema Fixed and Verified';
END $$;
