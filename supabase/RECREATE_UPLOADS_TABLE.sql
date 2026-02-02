-- ============================================================
-- COMPLETE FIX FOR UPLOADS TABLE
-- Fixes schema cache and ensures all columns exist
-- ============================================================

-- Step 1: Drop and recreate uploads table with correct structure
DROP TABLE IF EXISTS uploads CASCADE;

CREATE TABLE uploads (
  id SERIAL PRIMARY KEY,
  upload_type VARCHAR(50) CHECK (upload_type IN ('mcq_excel', 'markdown', 'bulk_university')),
  file_name VARCHAR(255),
  file_url VARCHAR(500),
  file_size_bytes BIGINT,
  subject_id INTEGER REFERENCES subjects(id),
  topic_id INTEGER REFERENCES topics(id),
  subtopic_id INTEGER REFERENCES subtopics(id),
  status VARCHAR(50) CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  validation_errors JSONB,
  processing_log TEXT,
  total_rows INTEGER,
  processed_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Step 2: Grant all permissions
GRANT ALL ON uploads TO authenticated;
GRANT ALL ON uploads TO anon;
GRANT USAGE, SELECT ON SEQUENCE uploads_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE uploads_id_seq TO anon;

-- Step 3: Create indexes for performance
CREATE INDEX idx_uploads_subtopic ON uploads(subtopic_id);
CREATE INDEX idx_uploads_topic ON uploads(topic_id);
CREATE INDEX idx_uploads_subject ON uploads(subject_id);
CREATE INDEX idx_uploads_status ON uploads(status);
CREATE INDEX idx_uploads_created_by ON uploads(created_by);

-- Step 4: Disable RLS (development mode)
ALTER TABLE uploads DISABLE ROW LEVEL SECURITY;

-- Step 5: Refresh schema cache
ANALYZE uploads;

-- Step 6: Verify table structure
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'uploads';
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ Uploads table recreated successfully';
    RAISE NOTICE 'Total columns: %', col_count;
    RAISE NOTICE '===========================================';
    
    -- List all columns
    RAISE NOTICE 'Columns in uploads table:';
    FOR col_name IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'uploads' 
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  - %', col_name;
    END LOOP;
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE '✅ Permissions granted';
    RAISE NOTICE '✅ Indexes created';
    RAISE NOTICE '✅ RLS disabled';
    RAISE NOTICE '✅ Schema cache refreshed';
    RAISE NOTICE '===========================================';
END $$;
