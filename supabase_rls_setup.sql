-- Ace Planner: Supabase Row Level Security (RLS) Setup
-- Run these commands in your Supabase SQL Editor to secure your app

-- 1. Enable RLS on all tables
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE gpa_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Notes Table Policies
-- Users can only insert their own notes
DROP POLICY IF EXISTS "Users can insert their own notes" ON notes;
CREATE POLICY "Users can insert their own notes" ON notes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can only read their own notes
DROP POLICY IF EXISTS "Users can view their own notes" ON notes;
CREATE POLICY "Users can view their own notes" ON notes FOR SELECT 
USING (auth.uid() = user_id);

-- Users can only update their own notes
DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
CREATE POLICY "Users can update their own notes" ON notes FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can only delete their own notes
DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;
CREATE POLICY "Users can delete their own notes" ON notes FOR DELETE 
USING (auth.uid() = user_id);

-- 3. Timetable Table Policies
DROP POLICY IF EXISTS "Users can insert their own timetable" ON timetable;
CREATE POLICY "Users can insert their own timetable" ON timetable FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own timetable" ON timetable;
CREATE POLICY "Users can view their own timetable" ON timetable FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own timetable" ON timetable;
CREATE POLICY "Users can update their own timetable" ON timetable FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own timetable" ON timetable;
CREATE POLICY "Users can delete their own timetable" ON timetable FOR DELETE 
USING (auth.uid() = user_id);

-- 4. GPA Records Policies
DROP POLICY IF EXISTS "Users can insert their own gpa records" ON gpa_records;
CREATE POLICY "Users can insert their own gpa records" ON gpa_records FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own gpa records" ON gpa_records;
CREATE POLICY "Users can view their own gpa records" ON gpa_records FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own gpa records" ON gpa_records;
CREATE POLICY "Users can update their own gpa records" ON gpa_records FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own gpa records" ON gpa_records;
CREATE POLICY "Users can delete their own gpa records" ON gpa_records FOR DELETE 
USING (auth.uid() = user_id);

-- 5. Profiles Table Policies
-- Users can read their own profile, or maybe public profiles if you build a social feature
-- But for now, restrict to self
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- Note: Profile creation is usually handled by Supabase triggers on Auth sign up,
-- so INSERT policies on profiles are often restricted to a service role or a specific trigger function.
