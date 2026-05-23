-- Fix missing tables used by notes.html.
-- Run this in the Supabase SQL editor for the project that serves this app.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[];

CREATE TABLE IF NOT EXISTS public.note_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  file_data TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_note_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id TEXT NOT NULL,
  note_title TEXT,
  note_content TEXT,
  files JSONB NOT NULL DEFAULT '[]'::jsonb,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.note_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_note_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'note_files'
      AND policyname = 'note_files_own'
  ) THEN
    CREATE POLICY "note_files_own"
      ON public.note_files
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_note_sessions'
      AND policyname = 'ai_note_sessions_own'
  ) THEN
    CREATE POLICY "ai_note_sessions_own"
      ON public.ai_note_sessions
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_note_files_note_user
  ON public.note_files(note_id, user_id);

CREATE INDEX IF NOT EXISTS idx_ai_note_sessions_token
  ON public.ai_note_sessions(session_token);

CREATE INDEX IF NOT EXISTS idx_ai_note_sessions_expires_at
  ON public.ai_note_sessions(expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_note_sessions TO authenticated;
