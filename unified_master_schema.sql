-- ============================================================
-- FIRST CODE BLACK - UNIFIED MASTER SCHEMA
-- Date: 2026-04-28
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. HELPERS & FUNCTIONS
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
        WHEN 'A+' THEN 5.0 WHEN 'A'  THEN 5.0 WHEN 'A-' THEN 4.7
        WHEN 'B+' THEN 4.3 WHEN 'B'  THEN 4.0 WHEN 'B-' THEN 3.7
        WHEN 'C+' THEN 3.3 WHEN 'C'  THEN 3.0 WHEN 'C-' THEN 2.7
        WHEN 'D+' THEN 2.3 WHEN 'D'  THEN 2.0 WHEN 'D-' THEN 1.7
        WHEN 'E'  THEN 1.0 ELSE 0.0
      END AS pts,
      units
    FROM public.gpa_records
    WHERE user_id = user_uuid
  LOOP
    total_points := total_points + (r.pts * r.units);
    total_units := total_units + r.units;
  END LOOP;
  IF total_units > 0 THEN RETURN round((total_points / total_units)::numeric, 2); END IF;
  RETURN 0.00;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. CORE TABLES
-- ============================================================

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  avatar_url TEXT,
  bio TEXT,
  level TEXT DEFAULT 'Beginner',
  xp_points INTEGER DEFAULT 0,
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- USER SETTINGS
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'dark',
  accent_color TEXT DEFAULT '#7b61ff',
  language TEXT DEFAULT 'en',
  enable_notifications BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NOTES
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT DEFAULT 'General',
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TIMETABLE
CREATE TABLE IF NOT EXISTS public.timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT,
  course TEXT,
  room TEXT,
  location TEXT,
  day_of_week INTEGER,
  start_time TIME NOT NULL,
  end_time TIME,
  duration_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GPA RECORDS
CREATE TABLE IF NOT EXISTS public.gpa_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  units DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  semester TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpa_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_own" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "settings_own" ON public.user_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "notes_own" ON public.notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "timetable_own" ON public.timetable FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "gpa_own" ON public.gpa_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "logs_own" ON public.activity_logs FOR ALL USING (auth.uid() = user_id);

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
CREATE POLICY "tokens_own" ON public.user_push_tokens FOR ALL USING (auth.uid() = user_id);
CREATE TRIGGER trg_tokens_updated_at BEFORE UPDATE ON public.user_push_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_timetable_updated_at BEFORE UPDATE ON public.timetable FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_gpa_updated_at BEFORE UPDATE ON public.gpa_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. LEGACY COMPATIBILITY LAYER (VIEWS)
-- ============================================================

-- Legacy Users view
DROP VIEW IF EXISTS public.users;
CREATE VIEW public.users WITH (security_invoker = true) AS
SELECT p.id, p.username, p.email, p.first_name, p.last_name, p.created_at,
  (SELECT count(*) FROM public.notes n WHERE n.user_id = p.id)::int AS note_count,
  (SELECT count(*) FROM public.timetable t WHERE t.user_id = p.id)::int AS class_count,
  public.calculate_user_gpa(p.id) AS gpa
FROM public.profiles p;

-- Legacy Courses/Grades view
DROP VIEW IF EXISTS public.courses;
CREATE VIEW public.courses WITH (security_invoker = true) AS
SELECT id, user_id, course_name AS name, grade, units, semester, created_at FROM public.gpa_records;

DROP VIEW IF EXISTS public.grades;
CREATE VIEW public.grades WITH (security_invoker = true) AS
SELECT id, user_id, grade, units AS credit_hours, course_name, created_at FROM public.gpa_records;

-- Legacy Classes view
DROP VIEW IF EXISTS public.classes;
CREATE VIEW public.classes WITH (security_invoker = true) AS
SELECT id, user_id, coalesce(course, subject) as course, start_time, end_time, day_of_week FROM public.timetable;

-- Legacy Activities view
DROP VIEW IF EXISTS public.activities;
CREATE VIEW public.activities WITH (security_invoker = true) AS
SELECT id, user_id, action_type, 
  coalesce(action_details->>'description', action_type) as description,
  coalesce(action_details->>'icon', 'circle') as icon,
  created_at
FROM public.activity_logs;

GRANT SELECT ON public.users, public.courses, public.grades, public.classes, public.activities TO authenticated;
