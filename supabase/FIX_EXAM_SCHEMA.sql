-- ============================================================
-- EXAM SYSTEM SCHEMA & PERMISSIONS FIX
-- This script ensures all tables for the Exam system exist
-- and have correct permissions/RLS settings.
-- ============================================================

-- 1. University Exams Table
CREATE TABLE IF NOT EXISTS university_exams (
    id SERIAL PRIMARY KEY,
    university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
    institution_id INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    exam_type VARCHAR(50) DEFAULT 'mock', -- 'mock', 'module', 'final'
    total_duration INTEGER NOT NULL, -- in minutes
    allow_continue_after_time_up BOOLEAN DEFAULT false,
    allow_reattempt BOOLEAN DEFAULT true,
    auto_submit BOOLEAN DEFAULT true,
    result_release_setting VARCHAR(50) DEFAULT 'instant', -- 'instant', 'manual'
    is_active BOOLEAN DEFAULT true,
    negative_marking DECIMAL(4,2) DEFAULT 0,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Passages Table (for Reading Comprehension)
CREATE TABLE IF NOT EXISTS passages (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Exam Sections
CREATE TABLE IF NOT EXISTS exam_sections (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER REFERENCES university_exams(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    num_questions INTEGER DEFAULT 10,
    weightage INTEGER DEFAULT 10,
    order_index INTEGER DEFAULT 0,
    section_duration INTEGER, -- Optional: duration per section in minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Exam Questions
CREATE TABLE IF NOT EXISTS exam_questions (
    id SERIAL PRIMARY KEY,
    section_id INTEGER REFERENCES exam_sections(id) ON DELETE CASCADE,
    passage_id INTEGER REFERENCES passages(id) ON DELETE SET NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'mcq_single',
    image_url VARCHAR(500),
    options JSONB, -- Store options as an array of objects/strings
    correct_answer JSONB, -- Store correct answer index or text
    marks DECIMAL(5,2) DEFAULT 1,
    explanation TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Exam Attempts
CREATE TABLE IF NOT EXISTS exam_attempts (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    exam_id INTEGER REFERENCES university_exams(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'ongoing', -- 'ongoing', 'completed', 'abandoned'
    score DECIMAL(5,2) DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    current_section_id INTEGER REFERENCES exam_sections(id),
    answers JSONB DEFAULT '{}'::jsonb, -- Store all answers in one JSON for backup/efficiency
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Individual Exam Answers (for detailed tracking)
CREATE TABLE IF NOT EXISTS exam_answers (
    id SERIAL PRIMARY KEY,
    attempt_id INTEGER REFERENCES exam_attempts(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES exam_questions(id) ON DELETE CASCADE,
    answer JSONB,
    is_correct BOOLEAN,
    marks_obtained DECIMAL(5,2) DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(attempt_id, question_id)
);

-- ============================================================
-- PERMISSIONS & RLS
-- ============================================================

-- Disable RLS for development to ensure no cryptic "Fetch error: {}"
ALTER TABLE university_exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE passages DISABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sections DISABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE exam_answers DISABLE ROW LEVEL SECURITY;

-- Grant permissions to public roles
GRANT ALL ON university_exams TO authenticated, anon;
GRANT ALL ON passages TO authenticated, anon;
GRANT ALL ON exam_sections TO authenticated, anon;
GRANT ALL ON exam_questions TO authenticated, anon;
GRANT ALL ON exam_attempts TO authenticated, anon;
GRANT ALL ON exam_answers TO authenticated, anon;

-- Fix sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

DO $$
BEGIN
    RAISE NOTICE '✅ Exam System Schema & Permissions Fix applied.';
END $$;
