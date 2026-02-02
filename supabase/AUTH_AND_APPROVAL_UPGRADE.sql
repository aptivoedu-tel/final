-- =====================================================
-- AUTH & INSTITUTION APPROVAL SYSTEM UPGRADE
-- =====================================================

-- 1. Create Institution Status Enum if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'institution_status') THEN
        CREATE TYPE institution_status AS ENUM ('pending', 'approved', 'rejected', 'blocked');
    END IF;
END $$;

-- 2. Add status column to institutions
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'institutions' AND column_name = 'status') THEN
        ALTER TABLE institutions ADD COLUMN status institution_status DEFAULT 'pending';
    END IF;
END $$;

-- 3. Add administrative contact fields to institutions for approval tracking
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS admin_name VARCHAR(255);
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255);

-- 4. Set existing institutions to 'approved' to avoid locking out current users
UPDATE institutions SET status = 'approved' WHERE status IS NULL;

-- 5. Standardize User Status
-- Ensure 'pending' is the default for both Students (awaiting email) and Institutions (awaiting admin)
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'pending';

-- 6. RLS Update: Prevent login for unapproved/unverified
-- Note: Logic should also be enforced in the Application Layer (authService.ts)
-- for better error messages.

-- Update institutions policies
DROP POLICY IF EXISTS "Institution admins can view their own institution" ON institutions;
CREATE POLICY "Institution admins can view their own institution" ON institutions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM institution_admins 
            WHERE user_id = auth.uid() AND institution_id = institutions.id
        )
    );

-- Super admins can manage all
DROP POLICY IF EXISTS "Super admins can manage all institutions" ON institutions;
CREATE POLICY "Super admins can manage all institutions" ON institutions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'
        )
    );
