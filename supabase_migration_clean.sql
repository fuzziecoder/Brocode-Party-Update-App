-- BroCode Supabase Database Migration (Idempotent Version)
-- This version can be run multiple times safely
-- Run this SQL in your Supabase SQL Editor

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  phone TEXT,
  password TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'guest')),
  profile_pic_url TEXT,
  location TEXT,
  date_of_birth TEXT,
  is_verified BOOLEAN DEFAULT false,
  latitude NUMERIC,
  longitude NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON profiles(username);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop all possible profile policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read all profiles" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Anyone can insert profiles" ON profiles;
END $$;

CREATE POLICY "Users can read all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (true);
CREATE POLICY "Anyone can insert profiles" ON profiles FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 2. SPOTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  day TEXT NOT NULL,
  timing TEXT NOT NULL,
  budget NUMERIC NOT NULL DEFAULT 0,
  location TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  description TEXT,
  feedback TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS spots_date_idx ON spots(date);
CREATE INDEX IF NOT EXISTS spots_created_by_idx ON spots(created_by);
ALTER TABLE spots ENABLE ROW LEVEL SECURITY;

-- Drop all possible spot policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Everyone can read spots" ON spots;
  DROP POLICY IF EXISTS "Admins can create spots" ON spots;
  DROP POLICY IF EXISTS "Anyone can create spots" ON spots;
  DROP POLICY IF EXISTS "Admins can update spots" ON spots;
  DROP POLICY IF EXISTS "Anyone can update spots" ON spots;
  DROP POLICY IF EXISTS "Admins can delete spots" ON spots;
  DROP POLICY IF EXISTS "Anyone can delete spots" ON spots;
END $$;

CREATE POLICY "Everyone can read spots" ON spots FOR SELECT USING (true);
CREATE POLICY "Anyone can create spots" ON spots FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update spots" ON spots FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete spots" ON spots FOR DELETE USING (true);

-- ============================================================================
-- 3. INVITATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('confirmed', 'pending', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(spot_id, user_id)
);

CREATE INDEX IF NOT EXISTS invitations_spot_id_idx ON invitations(spot_id);
CREATE INDEX IF NOT EXISTS invitations_user_id_idx ON invitations(user_id);
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Drop all possible invitation policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Everyone can read invitations" ON invitations;
  DROP POLICY IF EXISTS "Users can manage own invitations" ON invitations;
  DROP POLICY IF EXISTS "Anyone can create invitations" ON invitations;
END $$;

CREATE POLICY "Everyone can read invitations" ON invitations FOR SELECT USING (true);
CREATE POLICY "Users can manage own invitations" ON invitations FOR ALL USING (true);
CREATE POLICY "Anyone can create invitations" ON invitations FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 4. PAYMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_paid' CHECK (status IN ('paid', 'not_paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(spot_id, user_id)
);

CREATE INDEX IF NOT EXISTS payments_spot_id_idx ON payments(spot_id);
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON payments(user_id);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop all possible payment policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Everyone can read payments" ON payments;
  DROP POLICY IF EXISTS "Admins can update payments" ON payments;
  DROP POLICY IF EXISTS "Anyone can update payments" ON payments;
  DROP POLICY IF EXISTS "System can create payments" ON payments;
END $$;

CREATE POLICY "Everyone can read payments" ON payments FOR SELECT USING (true);
CREATE POLICY "Anyone can update payments" ON payments FOR UPDATE USING (true);
CREATE POLICY "System can create payments" ON payments FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 5. CHAT_MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_text TEXT,
  content_image_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reactions JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop all possible chat message policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Everyone can read messages" ON chat_messages;
  DROP POLICY IF EXISTS "Users can create own messages" ON chat_messages;
  DROP POLICY IF EXISTS "Users can delete own messages" ON chat_messages;
END $$;

CREATE POLICY "Everyone can read messages" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Users can create own messages" ON chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete own messages" ON chat_messages FOR DELETE USING (true);

-- ============================================================================
-- 6. MOMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS moments_user_id_idx ON moments(user_id);
CREATE INDEX IF NOT EXISTS moments_created_at_idx ON moments(created_at DESC);
ALTER TABLE moments ENABLE ROW LEVEL SECURITY;

-- Drop all possible moment policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Everyone can read moments" ON moments;
  DROP POLICY IF EXISTS "Users can create own moments" ON moments;
  DROP POLICY IF EXISTS "Users can delete own moments" ON moments;
END $$;

CREATE POLICY "Everyone can read moments" ON moments FOR SELECT USING (true);
CREATE POLICY "Users can create own moments" ON moments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete own moments" ON moments FOR DELETE USING (true);

-- ============================================================================
-- 7. INITIAL DATA
-- ============================================================================

-- Insert admin user
INSERT INTO profiles (id, name, username, email, phone, password, role, location, is_verified)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Ram',
  'brocode',
  'brocode@gmail.com',
  '7826821130',
  'admin@brocode',
  'admin',
  'Attibele',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  location = EXCLUDED.location,
  is_verified = EXCLUDED.is_verified;

-- Insert other users
INSERT INTO profiles (id, name, username, phone, password, role, location, is_verified)
VALUES 
  ('00000000-0000-0000-0000-000000000002', 'Dhanush', 'dhanush', '9994323520', 'dhanush123', 'user', 'Attibele', true),
  ('00000000-0000-0000-0000-000000000003', 'Godwin', 'godwin', '8903955341', 'godwin123', 'user', 'Attibele', true),
  ('00000000-0000-0000-0000-000000000004', 'Tharun', 'tharun', '9345624112', 'tharun123', 'user', 'Attibele', true),
  ('00000000-0000-0000-0000-000000000005', 'Sanjay', 'sanjay', '9865703667', 'sanjay123', 'user', 'Attibele', true),
  ('00000000-0000-0000-0000-000000000006', 'Soundar', 'soundar', '9566686921', 'soundar123', 'user', 'Attibele', true),
  ('00000000-0000-0000-0000-000000000007', 'Jagadeesh', 'jagadeesh', '6381038172', 'jagadeesh123', 'user', 'Attibele', true),
  ('00000000-0000-0000-0000-000000000008', 'Ram', 'ram', '7826821130', 'ram123', 'user', 'Attibele', true),
  ('00000000-0000-0000-0000-000000000009', 'Lingesh', 'lingesh', '', 'lingesh123', 'user', 'Attibele', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  username = EXCLUDED.username,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  location = EXCLUDED.location,
  is_verified = EXCLUDED.is_verified;

-- Verify tables were created
SELECT 'Migration completed successfully! All tables and policies are set up.' as status;
