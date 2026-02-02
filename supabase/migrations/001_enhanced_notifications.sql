-- =====================================================
-- ENHANCED NOTIFICATIONS SYSTEM
-- Migration: Add notification enhancements with image support
-- =====================================================

-- Add new columns to notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS category VARCHAR(50) 
  CHECK (category IN ('important', 'alert', 'normal')) DEFAULT 'normal';

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS sender_role user_role;

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS institution_id INTEGER 
  REFERENCES institutions(id) ON DELETE CASCADE;

ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create notification recipients table for bulk sending
CREATE TABLE IF NOT EXISTS notification_recipients (
  id SERIAL PRIMARY KEY,
  notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(notification_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_recipients_user 
  ON notification_recipients(user_id);
  
CREATE INDEX IF NOT EXISTS idx_notification_recipients_notification 
  ON notification_recipients(notification_id);

CREATE INDEX IF NOT EXISTS idx_notification_recipients_unread 
  ON notification_recipients(user_id, is_read) 
  WHERE is_read = FALSE;

-- Enable RLS on notification_recipients
ALTER TABLE notification_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_recipients
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own notification recipients') THEN
        CREATE POLICY "Users can view their own notification recipients" 
          ON notification_recipients
          FOR SELECT 
          USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own notification recipients') THEN
        CREATE POLICY "Users can update their own notification recipients" 
          ON notification_recipients
          FOR UPDATE 
          USING (auth.uid() = user_id);
    END IF;
END $$;

-- Function to send notification to multiple users (with image support)
CREATE OR REPLACE FUNCTION send_bulk_notification(
  p_title VARCHAR,
  p_message TEXT,
  p_category VARCHAR,
  p_sender_role user_role,
  p_institution_id INTEGER,
  p_user_ids UUID[],
  p_image_url TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_notification_id INTEGER;
  v_user_id UUID;
BEGIN
  -- Create the notification
  INSERT INTO notifications (title, message, type, category, sender_role, institution_id, image_url)
  VALUES (p_title, p_message, 'system', p_category, p_sender_role, p_institution_id, p_image_url)
  RETURNING id INTO v_notification_id;
  
  -- Create recipient records
  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    INSERT INTO notification_recipients (notification_id, user_id)
    VALUES (v_notification_id, v_user_id)
    ON CONFLICT (notification_id, user_id) DO NOTHING;
  END LOOP;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM notification_recipients
    WHERE user_id = p_user_id AND is_read = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(
  p_notification_id INTEGER,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notification_recipients
  SET is_read = TRUE, read_at = NOW()
  WHERE notification_id = p_notification_id AND user_id = p_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notification_recipients
  SET is_read = TRUE, read_at = NOW()
  WHERE user_id = p_user_id AND is_read = FALSE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Storage Bucket Setup (Metadata only, bucket creation usually through API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('notifications', 'notifications', true) ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE notification_recipients IS 'Tracks which users have received and read each notification';
COMMENT ON FUNCTION send_bulk_notification IS 'Sends a notification to multiple users at once with image support';
COMMENT ON FUNCTION get_unread_notification_count IS 'Returns the count of unread notifications for a user';
