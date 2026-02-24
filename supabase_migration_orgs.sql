-- Multi-management support + org-scoped spots/notifications

-- 1) Add organization fields on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS org_code TEXT,
  ADD COLUMN IF NOT EXISTS management_name TEXT;

-- 2) Enforce 4-digit org code format (when provided)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_org_code_format_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_org_code_format_check
      CHECK (org_code IS NULL OR org_code ~ '^[0-9]{4}$');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS profiles_org_code_idx ON profiles(org_code);

-- 3) Add org code to spots and index it for faster org filtering
ALTER TABLE spots
  ADD COLUMN IF NOT EXISTS org_code TEXT;

CREATE INDEX IF NOT EXISTS spots_org_code_idx ON spots(org_code);

-- 4) Backfill existing rows to default org (optional)
UPDATE profiles
SET org_code = COALESCE(org_code, '0001'),
    management_name = COALESCE(management_name, 'Brocode HQ')
WHERE org_code IS NULL OR management_name IS NULL;

UPDATE spots
SET org_code = COALESCE(org_code, '0001')
WHERE org_code IS NULL;
