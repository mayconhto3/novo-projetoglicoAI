-- Migration: Create User Gamification System
-- Description: Creates tables for gamification (XP, levels, streaks) and profile completion tracking
-- Date: 2025-12-16

-- ============================================================================
-- 1. USER GAMIFICATION TABLE (Aggregated data - 1 row per user)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_gamification (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,              -- Current XP in current level (resets on level up)
    total_xp INTEGER DEFAULT 0,        -- Total XP earned across all levels (never decreases)
    streak_days INTEGER DEFAULT 0,     -- Current consecutive days streak
    longest_streak INTEGER DEFAULT 0,  -- Record streak
    last_activity_date DATE,           -- Last day user had activity
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. PROFILE COMPLETION TASKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS profile_completion_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    task_key TEXT NOT NULL,            -- 'insulin_details', 'meal_schedule', etc
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    xp_awarded INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, task_key)
);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_completion_tasks ENABLE ROW LEVEL SECURITY;

-- Policies for user_gamification
CREATE POLICY "Users can view own gamification data"
    ON user_gamification
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own gamification data"
    ON user_gamification
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gamification data"
    ON user_gamification
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policies for profile_completion_tasks
CREATE POLICY "Users can view own completion tasks"
    ON profile_completion_tasks
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own completion tasks"
    ON profile_completion_tasks
    FOR ALL
    USING (auth.uid() = user_id);

-- ============================================================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_gamification_user_id 
    ON user_gamification(user_id);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id 
    ON user_achievements(user_id);

CREATE INDEX IF NOT EXISTS idx_profile_tasks_user_id 
    ON profile_completion_tasks(user_id);

CREATE INDEX IF NOT EXISTS idx_profile_tasks_completed 
    ON profile_completion_tasks(user_id, completed);

-- ============================================================================
-- 5. HELPFUL COMMENTS
-- ============================================================================

COMMENT ON TABLE user_gamification IS 
    'Stores aggregated gamification data for each user (level, XP, streaks). One row per user.';

COMMENT ON TABLE user_achievements IS 
    'Stores individual badge unlocks (one row per badge per user). Existing table.';

COMMENT ON TABLE profile_completion_tasks IS 
    'Tracks which profile sections the user has completed for gamification rewards.';

COMMENT ON COLUMN user_gamification.xp IS 
    'Current XP in the current level (resets on level up)';

COMMENT ON COLUMN user_gamification.total_xp IS 
    'Total XP earned across all levels (never decreases, used for level calculation)';

COMMENT ON COLUMN user_gamification.streak_days IS 
    'Current consecutive days with activity';

COMMENT ON COLUMN user_gamification.longest_streak IS 
    'Record number of consecutive days';

-- ============================================================================
-- 6. INITIAL DATA MIGRATION (Optional - for existing users)
-- ============================================================================

-- Initialize gamification for existing users who don't have it yet
INSERT INTO user_gamification (user_id, level, xp, total_xp, streak_days, longest_streak)
SELECT 
    id as user_id,
    1 as level,
    50 as xp,           -- Welcome bonus
    50 as total_xp,
    0 as streak_days,
    0 as longest_streak
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_gamification)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Tables created: user_gamification, profile_completion_tasks';
    RAISE NOTICE 'RLS policies enabled and configured';
    RAISE NOTICE 'Indexes created for performance';
END $$;
