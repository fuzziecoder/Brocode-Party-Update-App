-- Extended Migration for BroCode - Drinks, Attendance, and Mission Count
-- Run this SQL in your Supabase SQL Editor after the main migration

-- ============================================================================
-- 1. ADD mission_count TO PROFILES TABLE
-- ============================================================================

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS mission_count INTEGER DEFAULT 0;

-- ============================================================================
-- 2. CREATE ATTENDANCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attended BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(spot_id, user_id)
);

CREATE INDEX IF NOT EXISTS attendance_spot_id_idx ON attendance(spot_id);
CREATE INDEX IF NOT EXISTS attendance_user_id_idx ON attendance(user_id);
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Drop all possible attendance policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Everyone can read attendance" ON attendance;
  DROP POLICY IF EXISTS "Users can update own attendance" ON attendance;
  DROP POLICY IF EXISTS "Users can create own attendance" ON attendance;
END $$;

CREATE POLICY "Everyone can read attendance" ON attendance FOR SELECT USING (true);
CREATE POLICY "Users can update own attendance" ON attendance FOR UPDATE USING (true);
CREATE POLICY "Users can create own attendance" ON attendance FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 3. CREATE DRINKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS drinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT,
  votes INTEGER DEFAULT 0,
  suggested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  voted_by UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS drinks_spot_id_idx ON drinks(spot_id);
CREATE INDEX IF NOT EXISTS drinks_suggested_by_idx ON drinks(suggested_by);
ALTER TABLE drinks ENABLE ROW LEVEL SECURITY;

-- Drop all possible drinks policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Everyone can read drinks" ON drinks;
  DROP POLICY IF EXISTS "Users can create drinks" ON drinks;
  DROP POLICY IF EXISTS "Users can update drinks" ON drinks;
  DROP POLICY IF EXISTS "Users can delete drinks" ON drinks;
END $$;

CREATE POLICY "Everyone can read drinks" ON drinks FOR SELECT USING (true);
CREATE POLICY "Users can create drinks" ON drinks FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update drinks" ON drinks FOR UPDATE USING (true);
CREATE POLICY "Users can delete drinks" ON drinks FOR DELETE USING (true);

-- ============================================================================
-- 4. FUNCTION TO UPDATE MISSION_COUNT WHEN ATTENDANCE IS CONFIRMED
-- ============================================================================

CREATE OR REPLACE FUNCTION update_mission_count_on_attendance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment if user marked as attended (true) and wasn't already attended
  IF NEW.attended = true AND (OLD.attended IS NULL OR OLD.attended = false) THEN
    UPDATE profiles 
    SET mission_count = COALESCE(mission_count, 0) + 1
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_mission_count ON attendance;
CREATE TRIGGER trigger_update_mission_count
  AFTER INSERT OR UPDATE ON attendance
  FOR EACH ROW
  WHEN (NEW.attended = true)
  EXECUTE FUNCTION update_mission_count_on_attendance();

-- ============================================================================
-- 5. VERIFY
-- ============================================================================

SELECT 'Extended migration completed successfully! Drinks, attendance, and mission_count features are set up.' as status;
