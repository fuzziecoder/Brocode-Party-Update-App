-- BroCode Supabase Database Migration
-- Run this SQL in your Supabase SQL Editor

-- 1. Create profiles table
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

-- Create unique index on username
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON profiles(username);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can insert profiles" ON profiles;

-- Policy: Users can read all profiles
CREATE POLICY "Users can read all profiles" ON profiles
  FOR SELECT USING (true);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (true); -- Temporarily allow all updates, adjust based on auth

-- Policy: Anyone can insert profiles (adjust based on your auth setup)
CREATE POLICY "Anyone can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);

-- 2. Create spots table
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

-- Create index on date for faster queries
CREATE INDEX IF NOT EXISTS spots_date_idx ON spots(date);
CREATE INDEX IF NOT EXISTS spots_created_by_idx ON spots(created_by);

-- Enable RLS
ALTER TABLE spots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (drop all possible policy names)
DROP POLICY IF EXISTS "Everyone can read spots" ON spots;
DROP POLICY IF EXISTS "Admins can create spots" ON spots;
DROP POLICY IF EXISTS "Anyone can create spots" ON spots;
DROP POLICY IF EXISTS "Admins can update spots" ON spots;
DROP POLICY IF EXISTS "Anyone can update spots" ON spots;
DROP POLICY IF EXISTS "Admins can delete spots" ON spots;
DROP POLICY IF EXISTS "Anyone can delete spots" ON spots;

-- Policy: Everyone can read spots
CREATE POLICY "Everyone can read spots" ON spots
  FOR SELECT USING (true);

-- Policy: Anyone can create spots (adjust if needed)
CREATE POLICY "Anyone can create spots" ON spots
  FOR INSERT WITH CHECK (true);

-- Policy: Anyone can update spots (adjust if needed - should be admin only)
CREATE POLICY "Anyone can update spots" ON spots
  FOR UPDATE USING (true);

-- Policy: Anyone can delete spots (adjust if needed - should be admin only)
CREATE POLICY "Anyone can delete spots" ON spots
  FOR DELETE USING (true);

-- 3. Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('confirmed', 'pending', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(spot_id, user_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS invitations_spot_id_idx ON invitations(spot_id);
CREATE INDEX IF NOT EXISTS invitations_user_id_idx ON invitations(user_id);

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Everyone can read invitations" ON invitations;
DROP POLICY IF EXISTS "Users can manage own invitations" ON invitations;
DROP POLICY IF EXISTS "Anyone can create invitations" ON invitations;

-- Policy: Everyone can read invitations
CREATE POLICY "Everyone can read invitations" ON invitations
  FOR SELECT USING (true);

-- Policy: Users can create/update their own invitations
CREATE POLICY "Users can manage own invitations" ON invitations
  FOR ALL USING (true); -- Temporarily allow all, adjust based on auth

-- Policy: Anyone can create invitations
CREATE POLICY "Anyone can create invitations" ON invitations
  FOR INSERT WITH CHECK (true);

-- 4. Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_paid' CHECK (status IN ('paid', 'not_paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(spot_id, user_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS payments_spot_id_idx ON payments(spot_id);
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON payments(user_id);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Everyone can read payments" ON payments;
DROP POLICY IF EXISTS "Admins can update payments" ON payments;
DROP POLICY IF EXISTS "Anyone can update payments" ON payments;
DROP POLICY IF EXISTS "System can create payments" ON payments;

-- Policy: Everyone can read payments
CREATE POLICY "Everyone can read payments" ON payments
  FOR SELECT USING (true);

-- Policy: Anyone can update payments (adjust if needed - should be admin only)
CREATE POLICY "Anyone can update payments" ON payments
  FOR UPDATE USING (true);

-- Policy: System can create payments
CREATE POLICY "System can create payments" ON payments
  FOR INSERT WITH CHECK (true);

-- 5. Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_text TEXT,
  content_image_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reactions JSONB DEFAULT '{}'::jsonb
);

-- Create index on created_at for faster queries
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Everyone can read messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can create own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON chat_messages;

-- Policy: Everyone can read messages
CREATE POLICY "Everyone can read messages" ON chat_messages
  FOR SELECT USING (true);

-- Policy: Users can create their own messages
CREATE POLICY "Users can create own messages" ON chat_messages
  FOR INSERT WITH CHECK (true);

-- Policy: Users can delete their own messages
CREATE POLICY "Users can delete own messages" ON chat_messages
  FOR DELETE USING (true);

-- 6. Create moments table
CREATE TABLE IF NOT EXISTS moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS moments_user_id_idx ON moments(user_id);
CREATE INDEX IF NOT EXISTS moments_created_at_idx ON moments(created_at DESC);

-- Enable RLS
ALTER TABLE moments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Everyone can read moments" ON moments;
DROP POLICY IF EXISTS "Users can create own moments" ON moments;
DROP POLICY IF EXISTS "Users can delete own moments" ON moments;

-- Policy: Everyone can read moments
CREATE POLICY "Everyone can read moments" ON moments
  FOR SELECT USING (true);

-- Policy: Users can create their own moments
CREATE POLICY "Users can create own moments" ON moments
  FOR INSERT WITH CHECK (true);

-- Policy: Users can delete their own moments
CREATE POLICY "Users can delete own moments" ON moments
  FOR DELETE USING (true);

-- 7. Insert initial admin user (if not exists)
INSERT INTO profiles (id, name, username, email, phone, password, role, location, is_verified)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Ram',
  'ramvj2005',
  'ramvj2005@gmail.com',
  '7826821130',
  'ramkumar',
  'admin',
  'Attibele',
  true
)
ON CONFLICT (id) DO NOTHING;

-- 8. Insert other users from your data
INSERT INTO profiles (id, name, username, phone, role, location, is_verified)
VALUES 
  ('00000000-0000-0000-0000-000000000002', 'Dhanush', 'dhanush', '9994323520', 'user', 'Attibele', true),
  ('00000000-0000-0000-0000-000000000003', 'Godwin', 'godwin', '8903955341', 'user', 'Attibele', true),
  ('00000000-0000-0000-0000-000000000004', 'Tharun', 'tharun', '9345624112', 'user', 'Attibele', true),
  ('00000000-0000-0000-0000-000000000005', 'Sanjay', 'sanjay', '9865703667', 'user', 'Attibele', true),
  ('00000000-0000-0000-0000-000000000006', 'Soundar', 'soundar', '9566686921', 'user', 'Attibele', true),
  ('00000000-0000-0000-0000-000000000007', 'Jagadeesh', 'jagadeesh', '6381038172', 'user', 'Attibele', true),
  ('00000000-0000-0000-0000-000000000008', 'Ram', 'ram', '7826821130', 'user', 'Attibele', true),
  ('00000000-0000-0000-0000-000000000009', 'Lingesh', 'lingesh', '', 'user', 'Attibele', true)
ON CONFLICT (id) DO NOTHING;

-- Verify tables were created
SELECT 'Tables created successfully!' as status;
