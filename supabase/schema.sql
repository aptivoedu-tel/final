-- =====================================================
-- APTIVO PORTAL - COMPLETE DATABASE SCHEMA
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- USERS & AUTHENTICATION
-- =====================================================

-- User roles enum
CREATE TYPE user_role AS ENUM ('super_admin', 'institution_admin', 'student');

-- User status enum
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending');

-- Main users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  status user_status NOT NULL DEFAULT 'pending',
  avatar_url VARCHAR(500),
  email_verified BOOLEAN DEFAULT FALSE,
  is_solo BOOLEAN DEFAULT FALSE, -- For students without institution
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- UNIVERSITIES & INSTITUTIONS
-- =====================================================

-- Universities master table
CREATE TABLE universities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255), -- Email domain for auto-verification  
  country VARCHAR(100),
  state VARCHAR(100),
  city VARCHAR(100),
  description TEXT,
  logo_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Institutions (can be schools, colleges, coaching centers, etc.)
CREATE TABLE institutions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  institution_type VARCHAR(50), -- 'school', 'college', 'coaching', 'corporate'
  domain VARCHAR(255), -- Institution's email domain
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  logo_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Institution admins mapping
CREATE TABLE institution_admins (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  institution_id INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, institution_id)
);

-- University access control (which universities an institution can access)
CREATE TABLE university_access_control (
  id SERIAL PRIMARY KEY,
  institution_id INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
  university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
  access_status VARCHAR(20) CHECK (access_status IN ('allowed', 'restricted')) DEFAULT 'allowed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(institution_id, university_id)
);

-- Student university enrollments
CREATE TABLE student_university_enrollments (
  id SERIAL PRIMARY KEY,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
  institution_id INTEGER REFERENCES institutions(id) ON DELETE CASCADE, -- NULL for solo students
  enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(student_id, university_id)
);

-- =====================================================
-- CONTENT HIERARCHY
-- =====================================================

-- Subjects
CREATE TABLE subjects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  color VARCHAR(50), -- For UI theming
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Topics
CREATE TABLE topics (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sequence_order INTEGER DEFAULT 0,
  estimated_hours DECIMAL(5,2), -- Estimated study hours
  prerequisites TEXT[], -- Array of prerequisite topic IDs
  difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subtopics (contains actual content)
CREATE TABLE subtopics (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  content_markdown TEXT, -- Main study content in markdown
  video_url VARCHAR(500),
  estimated_minutes INTEGER, -- Estimated reading time
  sequence_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- UNIVERSITY PRACTICE RULES
-- =====================================================

CREATE TABLE university_practice_rules (
  id SERIAL PRIMARY KEY,
  university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  mcq_count_per_session INTEGER DEFAULT 10,
  easy_percentage INTEGER DEFAULT 40 CHECK (easy_percentage >= 0 AND easy_percentage <= 100),
  medium_percentage INTEGER DEFAULT 40 CHECK (medium_percentage >= 0 AND medium_percentage <= 100),
  hard_percentage INTEGER DEFAULT 20 CHECK (hard_percentage >= 0 AND hard_percentage <= 100),
  time_limit_minutes INTEGER, -- NULL for no time limit
  passing_percentage INTEGER DEFAULT 60,
  allow_review BOOLEAN DEFAULT TRUE,
  show_correct_answers BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(university_id, subject_id),
  CONSTRAINT percentage_check CHECK (easy_percentage + medium_percentage + hard_percentage = 100)
);

-- =====================================================
-- MCQ MANAGEMENT
-- =====================================================

-- MCQ difficulty enum
CREATE TYPE mcq_difficulty AS ENUM ('easy', 'medium', 'hard');

-- Upload tracking
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

-- MCQs
CREATE TABLE mcqs (
  id SERIAL PRIMARY KEY,
  subtopic_id INTEGER REFERENCES subtopics(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_image_url VARCHAR(500),
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option VARCHAR(1) CHECK (correct_option IN ('A', 'B', 'C', 'D')),
  explanation TEXT,
  explanation_url VARCHAR(500),
  difficulty mcq_difficulty DEFAULT 'medium',
  upload_id INTEGER REFERENCES uploads(id),
  is_active BOOLEAN DEFAULT TRUE,
  times_attempted INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MCQ tags for better categorization
CREATE TABLE mcq_tags (
  id SERIAL PRIMARY KEY,
  mcq_id INTEGER REFERENCES mcqs(id) ON DELETE CASCADE,
  tag VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STUDENT LEARNING & PROGRESS
-- =====================================================

-- Topic enrollments
CREATE TABLE student_topic_enrollments (
  id SERIAL PRIMARY KEY,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
  enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completion_percentage DECIMAL(5,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(student_id, topic_id)
);

-- Subtopic progress tracking
CREATE TABLE subtopic_progress (
  id SERIAL PRIMARY KEY,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subtopic_id INTEGER REFERENCES subtopics(id) ON DELETE CASCADE,
  reading_percentage DECIMAL(5,2) DEFAULT 0.00,
  time_spent_seconds INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  first_accessed_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(student_id, subtopic_id)
);

-- Practice sessions
CREATE TABLE practice_sessions (
  id SERIAL PRIMARY KEY,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subtopic_id INTEGER REFERENCES subtopics(id),
  university_id INTEGER REFERENCES universities(id),
  session_type VARCHAR(50) DEFAULT 'practice', -- 'practice', 'mock_test', 'weakness_review'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  wrong_answers INTEGER DEFAULT 0,
  skipped_questions INTEGER DEFAULT 0,
  score_percentage DECIMAL(5,2),
  time_spent_seconds INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE
);

-- Individual MCQ attempts
CREATE TABLE mcq_attempts (
  id SERIAL PRIMARY KEY,
  practice_session_id INTEGER REFERENCES practice_sessions(id) ON DELETE CASCADE,
  mcq_id INTEGER REFERENCES mcqs(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  selected_option VARCHAR(1) CHECK (selected_option IN ('A', 'B', 'C', 'D', 'SKIPPED')),
  is_correct BOOLEAN,
  time_spent_seconds INTEGER DEFAULT 0,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Learning streak tracking
CREATE TABLE learning_streaks (
  id SERIAL PRIMARY KEY,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  streak_date DATE NOT NULL,
  practice_sessions_count INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  questions_attempted INTEGER DEFAULT 0,
  UNIQUE(student_id, streak_date)
);

-- Weakness detection (AI-powered analytics)
CREATE TABLE detected_weaknesses (
  id SERIAL PRIMARY KEY,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subtopic_id INTEGER REFERENCES subtopics(id) ON DELETE CASCADE,
  weakness_score DECIMAL(5,2), -- 0-100, higher means needs more practice
  avg_score_percentage DECIMAL(5,2),
  total_attempts INTEGER DEFAULT 0,
  last_attempt_date TIMESTAMP WITH TIME ZONE,
  recommendation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, subtopic_id)
);

-- =====================================================
-- CONTENT-PRACTICE LINKAGE
-- =====================================================

CREATE TABLE content_practice_links (
  id SERIAL PRIMARY KEY,
  subtopic_id INTEGER REFERENCES subtopics(id) ON DELETE CASCADE,
  mcq_id INTEGER REFERENCES mcqs(id) ON DELETE CASCADE,
  link_type VARCHAR(50) DEFAULT 'direct', -- 'direct', 'related', 'suggested'
  relevance_score DECIMAL(3,2) DEFAULT 1.00, -- 0.00 - 1.00
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subtopic_id, mcq_id)
);

-- =====================================================
-- NOTIFICATIONS & ACTIVITY LOG
-- =====================================================

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50), -- 'achievement', 'reminder', 'system', 'progress'
  is_read BOOLEAN DEFAULT FALSE,
  action_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(100) NOT NULL,
  activity_data JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- Universities indexes
CREATE INDEX idx_universities_domain ON universities(domain);
CREATE INDEX idx_universities_active ON universities(is_active);

-- Content hierarchy indexes
CREATE INDEX idx_topics_subject ON topics(subject_id);
CREATE INDEX idx_subtopics_topic ON subtopics(topic_id);
CREATE INDEX idx_mcqs_subtopic ON mcqs(subtopic_id);
CREATE INDEX idx_mcqs_difficulty ON mcqs(difficulty);

-- Enrollment indexes
CREATE INDEX idx_student_topic_enrollments_student ON student_topic_enrollments(student_id);
CREATE INDEX idx_student_topic_enrollments_topic ON student_topic_enrollments(topic_id);

-- Practice indexes
CREATE INDEX idx_practice_sessions_student ON practice_sessions(student_id);
CREATE INDEX idx_practice_sessions_subtopic ON practice_sessions(subtopic_id);
CREATE INDEX idx_mcq_attempts_session ON mcq_attempts(practice_session_id);
CREATE INDEX idx_mcq_attempts_student ON mcq_attempts(student_id);

-- Progress indexes
CREATE INDEX idx_subtopic_progress_student ON subtopic_progress(student_id);
CREATE INDEX idx_learning_streaks_student_date ON learning_streaks(student_id, streak_date);
CREATE INDEX idx_detected_weaknesses_student ON detected_weaknesses(student_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_topic_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtopic_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE detected_weaknesses ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Super admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Public read for active universities
CREATE POLICY "Anyone can view active universities" ON universities
  FOR SELECT USING (is_active = TRUE);

-- Public read for active subjects
CREATE POLICY "Anyone can view active subjects" ON subjects
  FOR SELECT USING (is_active = TRUE);

-- Public read for active topics
CREATE POLICY "Anyone can view active topics" ON topics
  FOR SELECT USING (is_active = TRUE);

-- Public read for active subtopics
CREATE POLICY "Anyone can view active subtopics" ON subtopics
  FOR SELECT USING (is_active = TRUE);

-- Public read for active MCQs
CREATE POLICY "Anyone can view active MCQs" ON mcqs
  FOR SELECT USING (is_active = TRUE);

-- Students can view their own practice sessions
CREATE POLICY "Students view own practice sessions" ON practice_sessions
  FOR SELECT USING (auth.uid() = student_id);

-- Students can insert their own practice sessions
CREATE POLICY "Students create own practice sessions" ON practice_sessions
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Students can update their own practice sessions
CREATE POLICY "Students update own practice sessions" ON practice_sessions
  FOR UPDATE USING (auth.uid() = student_id);

-- Students can view their own MCQ attempts
CREATE POLICY "Students view own MCQ attempts" ON mcq_attempts
  FOR SELECT USING (auth.uid() = student_id);

-- Students can insert their own MCQ attempts
CREATE POLICY "Students create own MCQ attempts" ON mcq_attempts
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Students can view their own enrollments
CREATE POLICY "Students view own enrollments" ON student_topic_enrollments
  FOR SELECT USING (auth.uid() = student_id);

-- Students can insert their own enrollments
CREATE POLICY "Students create own enrollments" ON student_topic_enrollments
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Students can view their own progress
CREATE POLICY "Students view own progress" ON subtopic_progress
  FOR SELECT USING (auth.uid() = student_id);

-- Students can update their own progress
CREATE POLICY "Students update own progress" ON subtopic_progress
  FOR ALL USING (auth.uid() = student_id);

-- Students can view their own weaknesses
CREATE POLICY "Students view own weaknesses" ON detected_weaknesses
  FOR SELECT USING (auth.uid() = student_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to update user's updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_universities_updated_at BEFORE UPDATE ON universities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_institutions_updated_at BEFORE UPDATE ON institutions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subtopics_updated_at BEFORE UPDATE ON subtopics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mcqs_updated_at BEFORE UPDATE ON mcqs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate practice session score
CREATE OR REPLACE FUNCTION calculate_session_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_completed = TRUE AND NEW.total_questions > 0 THEN
    NEW.score_percentage := (NEW.correct_answers::DECIMAL / NEW.total_questions::DECIMAL) * 100;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_practice_score BEFORE UPDATE ON practice_sessions
  FOR EACH ROW EXECUTE FUNCTION calculate_session_score();

-- Function to update learning streak
CREATE OR REPLACE FUNCTION update_learning_streak()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO learning_streaks (student_id, streak_date, practice_sessions_count, questions_attempted)
  VALUES (NEW.student_id, CURRENT_DATE, 1, NEW.total_questions)
  ON CONFLICT (student_id, streak_date)
  DO UPDATE SET
    practice_sessions_count = learning_streaks.practice_sessions_count + 1,
    questions_attempted = learning_streaks.questions_attempted + EXCLUDED.questions_attempted;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_streak AFTER INSERT ON practice_sessions
  FOR EACH ROW WHEN (NEW.is_completed = TRUE)
  EXECUTE FUNCTION update_learning_streak();

-- Function to detect weaknesses
CREATE OR REPLACE FUNCTION detect_student_weaknesses(student_uuid UUID)
RETURNS TABLE (
  subtopic_id INTEGER,
  subtopic_name VARCHAR,
  avg_score DECIMAL,
  total_attempts INTEGER,
  weakness_level VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as subtopic_id,
    s.name as subtopic_name,
    AVG(ps.score_percentage) as avg_score,
    COUNT(ps.id)::INTEGER as total_attempts,
    CASE 
      WHEN AVG(ps.score_percentage) < 40 THEN 'critical'
      WHEN AVG(ps.score_percentage) < 60 THEN 'high'
      WHEN AVG(ps.score_percentage) < 75 THEN 'medium'
      ELSE 'low'
    END as weakness_level
  FROM practice_sessions ps
  JOIN subtopics s ON s.id = ps.subtopic_id
  WHERE ps.student_id = student_uuid
    AND ps.is_completed = TRUE
  GROUP BY s.id, s.name
  HAVING AVG(ps.score_percentage) < 75
  ORDER BY avg_score ASC;
END;
$$ language 'plpgsql';

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert default subjects
INSERT INTO subjects (name, description, color, icon, display_order) VALUES
  ('Mathematics', 'Advanced mathematics and problem solving', '#88D1B1', 'calculator', 1),
  ('Physics', 'Fundamental physics concepts and applications', '#6366F1', 'atom', 2),
  ('Chemistry', 'Chemical reactions and molecular science', '#EC4899', 'flask', 3),
  ('Biology', 'Life sciences and biological systems', '#10B981', 'leaf', 4),
  ('Computer Science', 'Programming and computational thinking', '#F59E0B', 'code', 5);

-- Insert sample universities
INSERT INTO universities (name, domain, country, city, description) VALUES
  ('Massachusetts Institute of Technology', 'mit.edu', 'United States', 'Cambridge', 'Leading technology research university'),
  ('Stanford University', 'stanford.edu', 'United States', 'Stanford', 'Premier research university in Silicon Valley'),
  ('Harvard University', 'harvard.edu', 'United States', 'Cambridge', 'Oldest university in the United States'),
  ('University of Cambridge', 'cam.ac.uk', 'United Kingdom', 'Cambridge', 'Historic university with world-class research'),
  ('University of Oxford', 'ox.ac.uk', 'United Kingdom', 'Oxford', 'Ancient university with academic excellence');

-- Insert super admin user (password: Admin@123)
-- Note: In production, use proper password hashing via application layer
INSERT INTO users (email, password_hash, full_name, role, status, email_verified) VALUES
  ('admin@aptivo.com', crypt('Admin@123', gen_salt('bf')), 'Super Admin', 'super_admin', 'active', TRUE);

COMMENT ON DATABASE CURRENT_DATABASE IS 'Aptivo Portal - Comprehensive Educational Platform Database';
