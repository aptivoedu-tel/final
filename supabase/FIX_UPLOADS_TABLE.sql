-- ============================================================
-- FIX UPLOADS TABLE SCHEMA CACHE ERROR
-- Ensures uploads table has all required columns
-- ============================================================

-- First, check if the column exists
DO $$
BEGIN
    -- Add subtopic_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'uploads' 
        AND column_name = 'subtopic_id'
    ) THEN
        ALTER TABLE uploads ADD COLUMN subtopic_id INTEGER REFERENCES subtopics(id);
        RAISE NOTICE 'Added subtopic_id column to uploads table';
    ELSE
        RAISE NOTICE 'subtopic_id column already exists in uploads table';
    END IF;
END $$;

-- Ensure all required columns exist in uploads table
DO $$
BEGIN
    -- Add topic_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'uploads' 
        AND column_name = 'topic_id'
    ) THEN
        ALTER TABLE uploads ADD COLUMN topic_id INTEGER REFERENCES topics(id);
        RAISE NOTICE 'Added topic_id column';
    END IF;

    -- Add subject_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'uploads' 
        AND column_name = 'subject_id'
    ) THEN
        ALTER TABLE uploads ADD COLUMN subject_id INTEGER REFERENCES subjects(id);
        RAISE NOTICE 'Added subject_id column';
    END IF;
END $$;

-- Refresh the schema cache by analyzing the table
ANALYZE uploads;

-- Verify the table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'uploads'
ORDER BY ordinal_position;

-- Grant permissions on uploads table
GRANT ALL ON uploads TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE uploads_id_seq TO authenticated;

RAISE NOTICE '===========================================';
RAISE NOTICE '✅ Uploads table schema verified';
RAISE NOTICE '✅ Schema cache refreshed';
RAISE NOTICE '✅ Permissions granted';
RAISE NOTICE '===========================================';
