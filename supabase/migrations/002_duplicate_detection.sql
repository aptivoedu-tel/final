-- Enable PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add question_hash column to mcqs table
ALTER TABLE mcqs ADD COLUMN IF NOT EXISTS question_hash TEXT;

-- Update existing questions with their hashes (normalization matches JS logic)
-- logic: lower -> remove non-word/non-space -> collapse whitespace -> trim
UPDATE mcqs 
SET question_hash = encode(digest(
  trim(regexp_replace(
    regexp_replace(lower(question), '[^\w\s]|_', '', 'g'),
    '\s+', ' ', 'g'
  )),
  'sha256'
), 'hex')
WHERE question_hash IS NULL;

-- Add UNIQUE index on question_hash to prevent future exact duplicate insertions
-- If there are still duplicates after this, the migration will correctly fail, 
-- prompting the user to clean up their data.
CREATE UNIQUE INDEX IF NOT EXISTS idx_mcqs_question_hash ON mcqs (question_hash);

-- Create GIN index on question column for fast similarity search
CREATE INDEX IF NOT EXISTS idx_mcqs_question_trgm ON mcqs USING gin (question gin_trgm_ops);

-- Function to check for similar questions within the same topic
CREATE OR REPLACE FUNCTION check_similar_question(
  p_topic_id INTEGER,
  p_question_text TEXT,
  p_threshold FLOAT DEFAULT 0.85
)
RETURNS JSONB AS $$
DECLARE
  v_match RECORD;
BEGIN
  -- We search for the most similar question in the same topic or its subtopics
  SELECT m.id, m.question, similarity(m.question, p_question_text) as score
  INTO v_match
  FROM mcqs m
  LEFT JOIN subtopics s ON m.subtopic_id = s.id
  WHERE (
    m.topic_id = p_topic_id 
    OR (m.subtopic_id IS NOT NULL AND s.topic_id = p_topic_id)
  )
  AND similarity(m.question, p_question_text) > p_threshold
  ORDER BY score DESC
  LIMIT 1;

  IF v_match.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'exists', true, 
      'id', v_match.id, 
      'score', v_match.score, 
      'question', v_match.question
    );
  ELSE
    RETURN jsonb_build_object('exists', false);
  END IF;
END;
$$ LANGUAGE plpgsql;
