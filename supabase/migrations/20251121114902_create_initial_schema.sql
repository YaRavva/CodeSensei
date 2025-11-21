/*
  # Initial Database Schema for CodeSensei
  
  1. New Tables
    - `users` - Extended user profiles (linked to auth.users)
      - `id` (uuid, primary key, references auth.users)
      - `email` (text)
      - `role` (text: 'student' | 'teacher' | 'admin')
      - `display_name` (text, nullable)
      - `avatar_url` (text, nullable)
      - `total_xp` (integer, default 0)
      - `current_level` (integer, default 1)
      - `created_at` (timestamp)
      - `last_active_at` (timestamp)
    
    - `modules` - Learning modules
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text, nullable)
      - `topic` (text)
      - `level` (integer, 1-5)
      - `order_index` (integer)
      - `is_published` (boolean)
      - `created_by` (uuid, foreign key)
      - `created_at`, `updated_at` (timestamp)
    
    - `tasks` - Coding tasks within modules
      - `id` (uuid, primary key)
      - `module_id` (uuid, foreign key)
      - `title` (text)
      - `description` (text)
      - `starter_code` (text)
      - `solution_code` (text, nullable)
      - `test_cases` (jsonb)
      - `xp_reward` (integer)
      - `difficulty` (text)
      - `hints` (jsonb, nullable)
      - `order_index` (integer)
      - `variant_number` (integer, nullable, 1-5)
      - `created_at`, `updated_at` (timestamp)
    
    - `user_progress` - Track user progress per module
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `module_id` (uuid, foreign key)
      - `status` (text)
      - `xp_earned` (integer)
      - `attempts_count` (integer)
      - `first_completed_at` (timestamp, nullable)
      - `last_attempt_at` (timestamp, nullable)
      - `updated_at` (timestamp)
      - UNIQUE(user_id, module_id)
    
    - `task_attempts` - Individual task attempt logs
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `task_id` (uuid, foreign key)
      - `code_solution` (text)
      - `test_results` (jsonb)
      - `is_successful` (boolean)
      - `used_ai_hint` (boolean)
      - `execution_time_ms` (integer, nullable)
      - `error_message` (text, nullable)
      - `created_at` (timestamp)
    
    - `achievements` - Available achievements
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `icon_name` (text)
      - `xp_reward` (integer)
      - `condition_type` (text)
      - `condition_value` (jsonb)
      - `is_active` (boolean)
      - `created_at` (timestamp)
    
    - `user_achievements` - Earned achievements
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `achievement_id` (uuid, foreign key)
      - `earned_at` (timestamp)
      - UNIQUE(user_id, achievement_id)
    
    - `ai_generation_logs` - Rate limiting for AI generations
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `generation_type` (text: 'module' | 'task')
      - `created_at` (timestamp)
      - `created_date` (date)
  
  2. Security
    - Enable RLS on all tables
    - Add restrictive policies:
      - Users can read their own profile
      - Students can view published modules and tasks
      - Admins/teachers can manage content
      - Users can view their own progress and attempts
      - Leaderboard accessible to authenticated users
  
  3. Performance
    - Add indexes for common queries
    - Add triggers for updated_at columns
*/

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE (extended profile)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  display_name TEXT,
  avatar_url TEXT,
  total_xp INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- Index for leaderboard
CREATE INDEX IF NOT EXISTS idx_users_xp ON public.users(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- =====================================================
-- MODULES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
  order_index INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for modules
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published modules"
  ON public.modules FOR SELECT
  TO authenticated
  USING (
    is_published = true
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Admins can manage modules"
  ON public.modules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_modules_published ON public.modules(is_published, order_index);
CREATE INDEX IF NOT EXISTS idx_modules_level ON public.modules(level);

-- =====================================================
-- TASKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  starter_code TEXT NOT NULL DEFAULT '',
  solution_code TEXT,
  test_cases JSONB NOT NULL DEFAULT '[]'::jsonb,
  xp_reward INTEGER NOT NULL DEFAULT 10 CHECK (xp_reward >= 0),
  difficulty TEXT NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  hints JSONB DEFAULT '[]'::jsonb,
  order_index INTEGER NOT NULL DEFAULT 0,
  variant_number INTEGER CHECK (variant_number IS NULL OR (variant_number >= 1 AND variant_number <= 5)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view published tasks"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.modules
      WHERE id = tasks.module_id AND is_published = true
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Admins can manage tasks"
  ON public.tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_module ON public.tasks(module_id, order_index);
CREATE INDEX IF NOT EXISTS idx_tasks_module_variant ON public.tasks(module_id, variant_number);

-- =====================================================
-- USER_PROGRESS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  xp_earned INTEGER NOT NULL DEFAULT 0 CHECK (xp_earned >= 0),
  attempts_count INTEGER NOT NULL DEFAULT 0 CHECK (attempts_count >= 0),
  first_completed_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

-- RLS for user_progress
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON public.user_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON public.user_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.user_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress"
  ON public.user_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_progress_user_module ON public.user_progress(user_id, module_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_status ON public.user_progress(status) WHERE status = 'completed';

-- =====================================================
-- TASK_ATTEMPTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.task_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  code_solution TEXT NOT NULL,
  test_results JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_successful BOOLEAN NOT NULL DEFAULT false,
  used_ai_hint BOOLEAN NOT NULL DEFAULT false,
  execution_time_ms INTEGER CHECK (execution_time_ms >= 0),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for task_attempts
ALTER TABLE public.task_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attempts"
  ON public.task_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attempts"
  ON public.task_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all attempts"
  ON public.task_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_attempts_user_task ON public.task_attempts(user_id, task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_attempts_task ON public.task_attempts(task_id, created_at DESC);

-- =====================================================
-- ACHIEVEMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
  condition_type TEXT NOT NULL,
  condition_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for achievements
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active achievements"
  ON public.achievements FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage achievements"
  ON public.achievements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- USER_ACHIEVEMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- RLS for user_achievements
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
  ON public.user_achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert achievements"
  ON public.user_achievements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all user achievements"
  ON public.user_achievements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id, earned_at DESC);

-- =====================================================
-- AI_GENERATION_LOGS TABLE (for rate limiting)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ai_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  generation_type TEXT NOT NULL CHECK (generation_type IN ('module', 'task', 'hint')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- RLS for ai_generation_logs
ALTER TABLE public.ai_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generation logs"
  ON public.ai_generation_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generation logs"
  ON public.ai_generation_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_user_date ON public.ai_generation_logs(user_id, created_date, generation_type);

-- =====================================================
-- TRIGGERS FOR updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_modules_updated_at') THEN
    CREATE TRIGGER update_modules_updated_at
      BEFORE UPDATE ON public.modules
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tasks_updated_at') THEN
    CREATE TRIGGER update_tasks_updated_at
      BEFORE UPDATE ON public.tasks
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_progress_updated_at') THEN
    CREATE TRIGGER update_user_progress_updated_at
      BEFORE UPDATE ON public.user_progress
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;