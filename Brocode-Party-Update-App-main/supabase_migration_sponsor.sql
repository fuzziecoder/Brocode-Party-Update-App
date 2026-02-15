-- ============================================================
-- SPONSOR FEATURE + BILL CONFIRMATION MIGRATION
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Spot Sponsors Table
CREATE TABLE IF NOT EXISTS spot_sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_covered NUMERIC DEFAULT 0,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(spot_id, sponsor_id)
);

CREATE INDEX IF NOT EXISTS spot_sponsors_spot_idx ON spot_sponsors(spot_id);
CREATE INDEX IF NOT EXISTS spot_sponsors_user_idx ON spot_sponsors(sponsor_id);

ALTER TABLE spot_sponsors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read sponsors" ON spot_sponsors FOR SELECT USING (true);
CREATE POLICY "Users can sponsor" ON spot_sponsors FOR INSERT WITH CHECK (true);
CREATE POLICY "Sponsors can update own" ON spot_sponsors FOR UPDATE USING (true);
CREATE POLICY "Admins can delete" ON spot_sponsors FOR DELETE USING (true);

-- 2. Profile columns for sponsor badge
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_sponsor BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sponsor_count INTEGER DEFAULT 0;

-- 3. Spot columns for sponsor indicator
ALTER TABLE spots
  ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sponsored_by UUID REFERENCES profiles(id);

-- 4. Payment column for bill confirmation
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS bill_confirmed BOOLEAN DEFAULT false;

-- 5. Trigger: auto-update profile + spot when someone sponsors
CREATE OR REPLACE FUNCTION mark_user_as_sponsor()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET is_sponsor = true,
      sponsor_count = COALESCE(sponsor_count, 0) + 1
  WHERE id = NEW.sponsor_id;

  UPDATE spots
  SET is_sponsored = true,
      sponsored_by = NEW.sponsor_id
  WHERE id = NEW.spot_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mark_sponsor ON spot_sponsors;
CREATE TRIGGER trigger_mark_sponsor
  AFTER INSERT ON spot_sponsors
  FOR EACH ROW
  EXECUTE FUNCTION mark_user_as_sponsor();
