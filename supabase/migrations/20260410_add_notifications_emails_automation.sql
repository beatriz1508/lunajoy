-- Migration: Add notifications, pending_emails, and automation_runs tables
-- For: post-meeting auto-analysis, email drafts, and automation tracking

-- =====================================================
-- 1. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'post_meeting_analysis', 'pre_meeting_prep', 'email_sent'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON notifications(user_id, read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow service role (webhooks) to insert notifications
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);


-- =====================================================
-- 2. PENDING EMAILS TABLE (drafts for copy/paste or send)
-- =====================================================
CREATE TABLE IF NOT EXISTS pending_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'rejected'
  source TEXT NOT NULL DEFAULT 'auto',    -- 'auto', 'agent', 'manual'
  meeting_title TEXT,
  meeting_date TIMESTAMPTZ,
  history_entry_id UUID REFERENCES history_entries(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  gmail_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_emails_user_status
  ON pending_emails(user_id, status, created_at DESC);

ALTER TABLE pending_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own emails"
  ON pending_emails FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own emails"
  ON pending_emails FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emails"
  ON pending_emails FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow service role (webhooks) to insert emails
CREATE POLICY "Service role can insert emails"
  ON pending_emails FOR INSERT
  WITH CHECK (true);


-- =====================================================
-- 3. AUTOMATION RUNS (log of n8n webhook executions)
-- =====================================================
CREATE TABLE IF NOT EXISTS automation_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'post_meeting_analysis', 'pre_meeting_prep'
  calendar_event_id TEXT,
  meeting_title TEXT,
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_automation_runs_type_created
  ON automation_runs(type, created_at DESC);

-- No RLS on automation_runs: only accessed server-side via service role


-- =====================================================
-- 4. REALTIME PUBLICATIONS (for NotificationBell)
-- =====================================================
-- Enable realtime on notifications so the bell updates instantly
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
