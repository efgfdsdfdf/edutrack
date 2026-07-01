-- ============================================================
-- FIRST CODE BLACK - UNIFIED FINAL DATABASE SCHEMA
-- Supports:
-- 1. Current backend/admin routes in server.js
-- 2. Current canonical tables in supabase_schema_full.sql
-- 3. Legacy frontend pages still using older table names
-- Date: 2026-04-20
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- HELPERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.calculate_user_gpa(user_uuid UUID)
RETURNS DECIMAL(4,2) AS $$
DECLARE
  total_points DECIMAL(10,2) := 0;
  total_units  DECIMAL(10,2) := 0;
  r            RECORD;
BEGIN
  FOR r IN
    SELECT
      CASE upper(trim(grade))
        WHEN 'A+' THEN 5.0
        WHEN 'A'  THEN 5.0
        WHEN 'A-' THEN 4.7
        WHEN 'B+' THEN 4.3
        WHEN 'B'  THEN 4.0
        WHEN 'B-' THEN 3.7
        WHEN 'C+' THEN 3.3
        WHEN 'C'  THEN 3.0
        WHEN 'C-' THEN 2.7
        WHEN 'D+' THEN 2.3
        WHEN 'D'  THEN 2.0
        WHEN 'D-' THEN 1.7
        WHEN 'E'  THEN 1.0
        ELSE 0.0
      END AS pts,
      units
    FROM public.gpa_records
    WHERE user_id = user_uuid
  LOOP
    total_points := total_points + (r.pts * r.units);
    total_units := total_units + r.units;
  END LOOP;

  IF total_units > 0 THEN
    RETURN round((total_points / total_units)::numeric, 2);
  END IF;

  RETURN 0.00;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void AS $$
BEGIN
  DELETE FROM public.user_activity
  WHERE last_active < now() - interval '24 hours';

  DELETE FROM public.activity_logs
  WHERE created_at < now() - interval '30 days';

  DELETE FROM public.brain_teaser_attempts
  WHERE played_at < now() - interval '90 days';

  DELETE FROM public.ai_note_sessions
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 1. PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  avatar_url TEXT,
  bio TEXT,
  level TEXT DEFAULT 'Beginner' CHECK (level IN ('Beginner','Intermediate','Advanced','Expert')),
  xp_points INTEGER DEFAULT 0,
  role TEXT DEFAULT 'user' CHECK (role IN ('user','admin')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','suspended','blocked','pending')),
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_delete" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "profiles_admin_select" ON public.profiles
  FOR SELECT USING ( public.is_admin() );

CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE USING ( public.is_admin() );

CREATE POLICY "profiles_admin_delete" ON public.profiles
  FOR DELETE USING ( public.is_admin() );

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. USER SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark','light','auto')),
  accent_color TEXT DEFAULT '#7b61ff',
  language TEXT DEFAULT 'en',
  enable_notifications BOOLEAN DEFAULT TRUE,
  class_reminders BOOLEAN DEFAULT TRUE,
  study_reminders BOOLEAN DEFAULT FALSE,
  reminder_sound BOOLEAN DEFAULT TRUE,
  auto_sync BOOLEAN DEFAULT TRUE,
  data_backup BOOLEAN DEFAULT TRUE,
  analytics BOOLEAN DEFAULT FALSE,
  focus_mode BOOLEAN DEFAULT FALSE,
  study_timer INTEGER DEFAULT 45 CHECK (study_timer > 0),
  break_duration INTEGER DEFAULT 10 CHECK (break_duration > 0),
  animations BOOLEAN DEFAULT TRUE,
  haptic_feedback BOOLEAN DEFAULT TRUE,
  reduce_motion BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_own" ON public.user_settings;
CREATE POLICY "settings_own" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_settings_updated_at ON public.user_settings;
CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_settings_user_id ON public.user_settings(user_id);

-- ============================================================
-- 3. NOTES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT DEFAULT 'General',
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT FALSE,
  color TEXT DEFAULT '#7b61ff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notes_own" ON public.notes;
CREATE POLICY "notes_own" ON public.notes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_notes_updated_at ON public.notes;
CREATE TRIGGER trg_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_notes_user ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_category ON public.notes(category);
CREATE INDEX IF NOT EXISTS idx_notes_created ON public.notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_tags ON public.notes USING GIN(tags);

-- ============================================================
-- 4. NOTE FILES
-- Missing from old canonical SQL but required by notes.html
-- ============================================================

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

ALTER TABLE public.note_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "note_files_own" ON public.note_files;
CREATE POLICY "note_files_own" ON public.note_files
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_note_files_note_id ON public.note_files(note_id);
CREATE INDEX IF NOT EXISTS idx_note_files_user_id ON public.note_files(user_id);

-- ============================================================
-- 5. AI NOTE SESSIONS
-- Missing from old canonical SQL but required by notes.html -> ai2.html flow
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_note_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  note_title TEXT,
  note_content TEXT,
  files JSONB DEFAULT '[]'::jsonb,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_note_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_note_sessions_own" ON public.ai_note_sessions;
CREATE POLICY "ai_note_sessions_own" ON public.ai_note_sessions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_note_sessions_user_id ON public.ai_note_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_note_sessions_note_id ON public.ai_note_sessions(note_id);
CREATE INDEX IF NOT EXISTS idx_ai_note_sessions_expires_at ON public.ai_note_sessions(expires_at);

-- ============================================================
-- 6. TIMETABLE
-- Includes both current backend fields and legacy page fields.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT,
  instructor TEXT,
  room TEXT,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME,
  course TEXT,
  location TEXT,
  duration_minutes INTEGER DEFAULT 60 CHECK (duration_minutes > 0),
  notify_before_minutes INTEGER DEFAULT 15 CHECK (notify_before_minutes >= 0),
  color TEXT DEFAULT '#7b61ff',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT timetable_subject_or_course_required CHECK (
    coalesce(nullif(subject, ''), nullif(course, '')) IS NOT NULL
  )
);

ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "timetable_own" ON public.timetable;
CREATE POLICY "timetable_own" ON public.timetable
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_timetable_fields()
RETURNS TRIGGER AS $$
DECLARE
  computed_interval INTERVAL;
BEGIN
  NEW.subject := coalesce(nullif(NEW.subject, ''), nullif(NEW.course, ''));
  NEW.course := coalesce(nullif(NEW.course, ''), NEW.subject);

  NEW.room := coalesce(nullif(NEW.room, ''), nullif(NEW.location, ''));
  NEW.location := coalesce(nullif(NEW.location, ''), NEW.room);

  IF NEW.duration_minutes IS NULL OR NEW.duration_minutes <= 0 THEN
    NEW.duration_minutes := 60;
  END IF;

  IF NEW.notify_before_minutes IS NULL OR NEW.notify_before_minutes < 0 THEN
    NEW.notify_before_minutes := 15;
  END IF;

  IF NEW.end_time IS NULL AND NEW.start_time IS NOT NULL THEN
    computed_interval := make_interval(mins => NEW.duration_minutes);
    NEW.end_time := (NEW.start_time + computed_interval)::time;
  ELSIF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    NEW.duration_minutes := greatest(
      1,
      floor(extract(epoch FROM (NEW.end_time - NEW.start_time)) / 60)::int
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_timetable_sync ON public.timetable;
CREATE TRIGGER trg_timetable_sync
  BEFORE INSERT OR UPDATE ON public.timetable
  FOR EACH ROW EXECUTE FUNCTION public.sync_timetable_fields();

DROP TRIGGER IF EXISTS trg_timetable_updated_at ON public.timetable;
CREATE TRIGGER trg_timetable_updated_at
  BEFORE UPDATE ON public.timetable
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_timetable_user ON public.timetable(user_id);
CREATE INDEX IF NOT EXISTS idx_timetable_day_time ON public.timetable(day_of_week, start_time);

-- ============================================================
-- 7. GPA RECORDS
-- Canonical table used by backend/admin. Compatibility view `courses`
-- is added later for the legacy GPA page.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.gpa_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  course_code TEXT,
  grade TEXT NOT NULL CHECK (
    upper(trim(grade)) IN ('A+','A','A-','B+','B','B-','C+','C','C-','D+','D','D-','E','F')
  ),
  units DECIMAL(5,2) NOT NULL CHECK (units > 0),
  semester TEXT,
  academic_year TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gpa_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gpa_own" ON public.gpa_records;
CREATE POLICY "gpa_own" ON public.gpa_records
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_gpa_updated_at ON public.gpa_records;
CREATE TRIGGER trg_gpa_updated_at
  BEFORE UPDATE ON public.gpa_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_gpa_user ON public.gpa_records(user_id);
CREATE INDEX IF NOT EXISTS idx_gpa_semester ON public.gpa_records(semester);

-- ============================================================
-- 8. NOVELS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.novels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  genre TEXT,
  description TEXT,
  cover_url TEXT,
  content_url TEXT,
  total_pages INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.novels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "novels_public_read" ON public.novels;
CREATE POLICY "novels_public_read" ON public.novels
  FOR SELECT USING (true);

DROP TRIGGER IF EXISTS trg_novels_updated_at ON public.novels;
CREATE TRIGGER trg_novels_updated_at
  BEFORE UPDATE ON public.novels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 9. USER NOVEL PROGRESS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_novel_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id UUID NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  current_page INTEGER DEFAULT 0,
  total_pages INTEGER DEFAULT 0,
  progress_percentage DECIMAL(5,2) DEFAULT 0.00,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started','reading','completed','paused')),
  last_read_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, novel_id)
);

ALTER TABLE public.user_novel_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "novel_progress_own" ON public.user_novel_progress;
CREATE POLICY "novel_progress_own" ON public.user_novel_progress
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_novel_progress_updated_at ON public.user_novel_progress;
CREATE TRIGGER trg_novel_progress_updated_at
  BEFORE UPDATE ON public.user_novel_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_novel_progress_user ON public.user_novel_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_novel_progress_novel ON public.user_novel_progress(novel_id);

-- ============================================================
-- 10. BRAIN TEASERS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.brain_teasers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('logic','pattern','math','verbal','riddle','memory')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard','expert')),
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct TEXT NOT NULL CHECK (correct IN ('a','b','c','d')),
  explanation TEXT,
  hint TEXT,
  points INTEGER DEFAULT 10,
  time_limit INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brain_teasers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teasers_public_read" ON public.brain_teasers;
CREATE POLICY "teasers_public_read" ON public.brain_teasers
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_teasers_category ON public.brain_teasers(category);
CREATE INDEX IF NOT EXISTS idx_teasers_difficulty ON public.brain_teasers(difficulty);

-- ============================================================
-- 11. BRAIN TEASER PROGRESS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.brain_teaser_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_played INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  iq_score INTEGER DEFAULT 100,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brain_teaser_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bt_progress_own" ON public.brain_teaser_progress;
CREATE POLICY "bt_progress_own" ON public.brain_teaser_progress
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_bt_progress_updated_at ON public.brain_teaser_progress;
CREATE TRIGGER trg_bt_progress_updated_at
  BEFORE UPDATE ON public.brain_teaser_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_bt_progress_user ON public.brain_teaser_progress(user_id);

-- ============================================================
-- 12. BRAIN TEASER ATTEMPTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.brain_teaser_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teaser_id UUID NOT NULL REFERENCES public.brain_teasers(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  chosen_option TEXT NOT NULL CHECK (chosen_option IN ('a','b','c','d')),
  is_correct BOOLEAN NOT NULL,
  time_taken INTEGER,
  hint_used BOOLEAN DEFAULT FALSE,
  points_earned INTEGER DEFAULT 0,
  played_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brain_teaser_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bt_attempts_own" ON public.brain_teaser_attempts;
CREATE POLICY "bt_attempts_own" ON public.brain_teaser_attempts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_bt_attempts_user ON public.brain_teaser_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_bt_attempts_session ON public.brain_teaser_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_bt_attempts_played ON public.brain_teaser_attempts(played_at DESC);

-- ============================================================
-- 13. USER ACTIVITY
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  current_page TEXT NOT NULL,
  current_action TEXT,
  page_data JSONB DEFAULT '{}'::jsonb,
  session_id TEXT NOT NULL,
  user_agent TEXT,
  last_active TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_id)
);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_own" ON public.user_activity;
DROP POLICY IF EXISTS "activity_admin_read" ON public.user_activity;

CREATE POLICY "activity_own" ON public.user_activity
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "activity_admin_read" ON public.user_activity
  FOR SELECT USING ( public.is_admin() );

DROP TRIGGER IF EXISTS trg_activity_updated_at ON public.user_activity;
CREATE TRIGGER trg_activity_updated_at
  BEFORE UPDATE ON public.user_activity
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_activity_user ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_last_active ON public.user_activity(last_active DESC);
CREATE INDEX IF NOT EXISTS idx_activity_page ON public.user_activity(current_page);
CREATE INDEX IF NOT EXISTS idx_activity_session ON public.user_activity(session_id);

-- ============================================================
-- 14. ACTIVITY LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  action_type TEXT NOT NULL,
  action_details JSONB DEFAULT '{}'::jsonb,
  page_url TEXT,
  session_id TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logs_own" ON public.activity_logs;
DROP POLICY IF EXISTS "logs_insert_own" ON public.activity_logs;
DROP POLICY IF EXISTS "logs_admin" ON public.activity_logs;

CREATE POLICY "logs_own" ON public.activity_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "logs_insert_own" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "logs_admin" ON public.activity_logs
  FOR SELECT USING ( public.is_admin() );

CREATE INDEX IF NOT EXISTS idx_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_created ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_action ON public.activity_logs(action_type);

-- ============================================================
-- 15. ACTIVE USERS VIEW
-- ============================================================

DROP VIEW IF EXISTS public.active_users;
CREATE VIEW public.active_users
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.username,
  p.first_name,
  p.last_name,
  p.email,
  p.avatar_url,
  p.level,
  p.xp_points,
  p.created_at,
  ua.last_active,
  ua.current_page,
  ua.current_action
FROM public.profiles p
JOIN public.user_activity ua ON p.id = ua.user_id
WHERE ua.last_active > now() - interval '7 days';

GRANT SELECT ON public.active_users TO authenticated;

-- ============================================================
-- LEGACY COMPATIBILITY LAYER
-- Older frontend pages still reference these names.
-- ============================================================

-- ------------------------------------------------------------
-- users -> profiles
-- ------------------------------------------------------------

DROP VIEW IF EXISTS public.users;
CREATE VIEW public.users
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.username,
  p.email,
  'supabase_auth_managed'::text AS password_hash,
  p.first_name,
  p.last_name,
  p.created_at,
  (
    SELECT count(*)
    FROM public.notes n
    WHERE n.user_id = p.id
  )::integer AS note_count,
  (
    SELECT count(*)
    FROM public.timetable t
    WHERE t.user_id = p.id
  )::integer AS class_count,
  public.calculate_user_gpa(p.id) AS gpa
FROM public.profiles p;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;

CREATE OR REPLACE FUNCTION public.users_compat_write()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.profiles (
      id,
      username,
      email,
      first_name,
      last_name,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.username,
      NEW.email,
      NEW.first_name,
      NEW.last_name,
      COALESCE(NEW.created_at, now()),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username,
      email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      updated_at = now();

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.profiles
    SET
      username = NEW.username,
      email = NEW.email,
      first_name = NEW.first_name,
      last_name = NEW.last_name,
      updated_at = now()
    WHERE id = OLD.id;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.profiles WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_users_compat_write ON public.users;
CREATE TRIGGER trg_users_compat_write
  INSTEAD OF INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.users_compat_write();

-- ------------------------------------------------------------
-- courses -> gpa_records
-- ------------------------------------------------------------

DROP VIEW IF EXISTS public.courses;
CREATE VIEW public.courses
WITH (security_invoker = true) AS
SELECT
  g.id,
  g.user_id,
  g.course_name AS name,
  g.grade,
  g.units,
  g.semester,
  g.academic_year,
  g.created_at,
  g.updated_at
FROM public.gpa_records g;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;

CREATE OR REPLACE FUNCTION public.courses_compat_write()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.gpa_records (
      id,
      user_id,
      course_name,
      grade,
      units,
      semester,
      academic_year,
      created_at,
      updated_at
    )
    VALUES (
      COALESCE(NEW.id, gen_random_uuid()),
      NEW.user_id,
      NEW.name,
      NEW.grade,
      COALESCE(NEW.units, 0),
      NEW.semester,
      NEW.academic_year,
      COALESCE(NEW.created_at, now()),
      COALESCE(NEW.updated_at, now())
    );

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.gpa_records
    SET
      course_name = NEW.name,
      grade = NEW.grade,
      units = NEW.units,
      semester = NEW.semester,
      academic_year = NEW.academic_year,
      updated_at = now()
    WHERE id = OLD.id;

    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.gpa_records WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_courses_compat_write ON public.courses;
CREATE TRIGGER trg_courses_compat_write
  INSTEAD OF INSERT OR UPDATE OR DELETE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.courses_compat_write();

-- USER PUSH TOKENS
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT, -- 'android', 'ios', 'web'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tokens_own" ON public.user_push_tokens;
CREATE POLICY "tokens_own" ON public.user_push_tokens FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_tokens_updated_at ON public.user_push_tokens;
CREATE TRIGGER trg_tokens_updated_at BEFORE UPDATE ON public.user_push_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- grades -> gpa_records (read-only dashboard compatibility)
-- ------------------------------------------------------------

DROP VIEW IF EXISTS public.grades;
CREATE VIEW public.grades
WITH (security_invoker = true) AS
SELECT
  g.id,
  g.user_id,
  g.grade,
  g.units AS credit_hours,
  g.course_name,
  g.course_code,
  g.semester,
  g.academic_year,
  g.created_at
FROM public.gpa_records g;

GRANT SELECT ON public.grades TO authenticated;

-- ------------------------------------------------------------
-- classes -> timetable (read-only dashboard compatibility)
-- ------------------------------------------------------------

DROP VIEW IF EXISTS public.classes;
CREATE VIEW public.classes
WITH (security_invoker = true) AS
SELECT
  t.id,
  t.user_id,
  t.course,
  t.subject,
  t.location,
  t.room,
  t.day_of_week,
  t.start_time,
  t.end_time,
  t.duration_minutes,
  t.notify_before_minutes,
  t.created_at,
  t.updated_at
FROM public.timetable t;

GRANT SELECT ON public.classes TO authenticated;

-- ------------------------------------------------------------
-- activities -> activity_logs (dashboard compatibility)
-- ------------------------------------------------------------

DROP VIEW IF EXISTS public.activities;
CREATE VIEW public.activities
WITH (security_invoker = true) AS
SELECT
  a.id,
  a.user_id,
  a.username,
  a.action_type,
  a.action_details,
  COALESCE(a.action_details->>'description', initcap(replace(a.action_type, '_', ' '))) AS description,
  COALESCE(a.action_details->>'icon', 'circle') AS icon,
  a.page_url,
  a.session_id,
  a.user_agent,
  a.created_at
FROM public.activity_logs a;

GRANT SELECT ON public.activities TO authenticated;

-- ============================================================
-- END
-- ============================================================
