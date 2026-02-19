-- =====================================================
-- ANALYTICS TRACKING EXTENSION
-- Adds practice_attempts table for detailed analytics
-- =====================================================

-- 1. Create practice_sets table (Required for foreign key)
-- Note: This is added to support the practice_attempts relationship
CREATE TABLE IF NOT EXISTS public.practice_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  topic TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create practice_attempts table
CREATE TABLE IF NOT EXISTS public.practice_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  practice_set_id UUID REFERENCES public.practice_sets(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  total_questions INTEGER NOT NULL,
  correct INTEGER NOT NULL,
  incorrect INTEGER NOT NULL,
  avg_time_seconds NUMERIC,
  overthink_count INTEGER DEFAULT 0,
  rush_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_practice_attempts_student_id ON public.practice_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_topic ON public.practice_attempts(topic);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_student_topic ON public.practice_attempts(student_id, topic);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_created_at_desc ON public.practice_attempts(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.practice_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for practice_attempts
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Students can insert own attempts' AND polrelid = 'public.practice_attempts'::regclass) THEN
        CREATE POLICY "Students can insert own attempts" ON public.practice_attempts
            FOR INSERT WITH CHECK (auth.uid() = student_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Students can view own attempts' AND polrelid = 'public.practice_attempts'::regclass) THEN
        CREATE POLICY "Students can view own attempts" ON public.practice_attempts
            FOR SELECT USING (auth.uid() = student_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admin can view all attempts' AND polrelid = 'public.practice_attempts'::regclass) THEN
        CREATE POLICY "Admin can view all attempts" ON public.practice_attempts
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.users 
                    WHERE id = auth.uid() AND (role = 'super_admin' OR role = 'institution_admin')
                )
            );
    END IF;
END $$;

-- RLS Policies for practice_sets (supporting table)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Students can manage own sets' AND polrelid = 'public.practice_sets'::regclass) THEN
        CREATE POLICY "Students can manage own sets" ON public.practice_sets
            FOR ALL USING (auth.uid() = student_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Admin can view all sets' AND polrelid = 'public.practice_sets'::regclass) THEN
        CREATE POLICY "Admin can view all sets" ON public.practice_sets
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.users 
                    WHERE id = auth.uid() AND (role = 'super_admin' OR role = 'institution_admin')
                )
            );
    END IF;
END $$;
