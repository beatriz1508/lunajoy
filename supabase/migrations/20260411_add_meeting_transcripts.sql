-- Migration: Add meeting_transcripts table for team-shared transcripts + recordings
-- For: Meetings page showing transcripts inline to any authenticated team member

CREATE TABLE IF NOT EXISTS meeting_transcripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_event_id TEXT UNIQUE,           -- match by Google Calendar event id when available
  meeting_title TEXT NOT NULL,
  meeting_date TIMESTAMPTZ,
  attendees TEXT[],
  transcript TEXT NOT NULL,
  recording_url TEXT,                      -- Drive webViewLink for the video, if n8n sends it
  transcript_doc_url TEXT,                 -- optional link to the original Google Doc
  source TEXT NOT NULL DEFAULT 'n8n',      -- 'n8n' | 'manual'
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_event
  ON meeting_transcripts(calendar_event_id);
CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_date
  ON meeting_transcripts(meeting_date DESC);

ALTER TABLE meeting_transcripts ENABLE ROW LEVEL SECURITY;

-- Team-shared read (same pattern as knowledge_entries in schema.sql)
CREATE POLICY "Authenticated users can read transcripts"
  ON meeting_transcripts FOR SELECT
  TO authenticated USING (true);

-- Users can insert their own manual uploads (fallback path for historical meetings)
CREATE POLICY "Users can insert own transcripts"
  ON meeting_transcripts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

-- Service role (webhook via admin client) bypasses RLS — no policy needed
