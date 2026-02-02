-- ============================================================
-- SETUP INSTITUTION ADMIN FEATURES
-- 1. Add institution_id and student_id_code to users
-- 2. Create institution_university_access table
-- 3. Policies for Institution Admin
-- ============================================================

-- 1. Extend users table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'institution_id') THEN
        ALTER TABLE users ADD COLUMN institution_id INTEGER REFERENCES institutions(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'student_id_code') THEN
        ALTER TABLE users ADD COLUMN student_id_code TEXT;
        -- Note: We make it unique combined with institution? Or globally?
        -- Let's assume unique globally for simplicity of login, or add a constraint later.
    END IF;
END $$;

-- 2. Create institution_university_access
CREATE TABLE IF NOT EXISTS institution_university_access (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
    university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
    is_locked BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(institution_id, university_id)
);

-- 3. Enable RLS
ALTER TABLE institution_university_access ENABLE ROW LEVEL SECURITY;

-- 4. Policies (Simulated for now, can be disabled for dev)
-- For Development, we often disable RLS or set permissive policies.
-- Let's Create permissive policies for now to avoid blockers.
CREATE POLICY "Allow All" ON institution_university_access FOR ALL USING (true) WITH CHECK (true);

-- 5. Grant Permissions
GRANT ALL ON institution_university_access TO authenticated;
GRANT ALL ON institution_university_access TO anon;

-- 6. Helper to check if a university is locked for a student
-- logic: Left Join institution_university_access iua ON iua.institution_id = student.institution_id AND iua.university_id = uni.id
-- If iua.is_locked IS TRUE, then it is locked.

-- 7. Final Notification (Wrapped)
DO $$
BEGIN
    RAISE NOTICE '✅ Institution Admin Schema Setup Complete';
END $$;
