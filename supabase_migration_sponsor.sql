-- Sponsor system migration

CREATE TABLE IF NOT EXISTS spot_sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE UNIQUE,
  sponsor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_covered NUMERIC NOT NULL DEFAULT 0,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_sponsor BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sponsor_count INTEGER DEFAULT 0;

ALTER TABLE spots
  ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sponsored_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION handle_new_sponsor()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET is_sponsor = true,
      sponsor_count = COALESCE(sponsor_count, 0) + 1,
      updated_at = NOW()
  WHERE id = NEW.sponsor_id;

  UPDATE spots
  SET is_sponsored = true,
      sponsored_by = NEW.sponsor_id,
      updated_at = NOW()
  WHERE id = NEW.spot_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_new_spot_sponsor ON spot_sponsors;
CREATE TRIGGER on_new_spot_sponsor
AFTER INSERT ON spot_sponsors
FOR EACH ROW
EXECUTE FUNCTION handle_new_sponsor();
