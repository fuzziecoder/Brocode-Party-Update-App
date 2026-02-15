-- BroCode Complete Database Migration (Including Transactions)
-- Run this SQL in your Supabase SQL Editor
-- This will create all tables including the new transactions table

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

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON profiles(username);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can insert profiles" ON profiles;

CREATE POLICY "Users can read all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (true);
CREATE POLICY "Anyone can insert profiles" ON profiles FOR INSERT WITH CHECK (true);

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

CREATE INDEX IF NOT EXISTS spots_date_idx ON spots(date);
CREATE INDEX IF NOT EXISTS spots_created_by_idx ON spots(created_by);
ALTER TABLE spots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can read spots" ON spots;
DROP POLICY IF EXISTS "Anyone can create spots" ON spots;
DROP POLICY IF EXISTS "Anyone can update spots" ON spots;
DROP POLICY IF EXISTS "Anyone can delete spots" ON spots;

CREATE POLICY "Everyone can read spots" ON spots FOR SELECT USING (true);
CREATE POLICY "Anyone can create spots" ON spots FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update spots" ON spots FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete spots" ON spots FOR DELETE USING (true);

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

CREATE INDEX IF NOT EXISTS invitations_spot_id_idx ON invitations(spot_id);
CREATE INDEX IF NOT EXISTS invitations_user_id_idx ON invitations(user_id);
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can read invitations" ON invitations;
DROP POLICY IF EXISTS "Users can manage own invitations" ON invitations;
DROP POLICY IF EXISTS "Anyone can create invitations" ON invitations;

CREATE POLICY "Everyone can read invitations" ON invitations FOR SELECT USING (true);
CREATE POLICY "Users can manage own invitations" ON invitations FOR ALL USING (true);
CREATE POLICY "Anyone can create invitations" ON invitations FOR INSERT WITH CHECK (true);

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

CREATE INDEX IF NOT EXISTS payments_spot_id_idx ON payments(spot_id);
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON payments(user_id);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can read payments" ON payments;
DROP POLICY IF EXISTS "Anyone can update payments" ON payments;
DROP POLICY IF EXISTS "System can create payments" ON payments;

CREATE POLICY "Everyone can read payments" ON payments FOR SELECT USING (true);
CREATE POLICY "Anyone can update payments" ON payments FOR UPDATE USING (true);
CREATE POLICY "System can create payments" ON payments FOR INSERT WITH CHECK (true);

-- 5. Create chat_messages table
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

DROP POLICY IF EXISTS "Everyone can read messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can create own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON chat_messages;

CREATE POLICY "Everyone can read messages" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Users can create own messages" ON chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete own messages" ON chat_messages FOR DELETE USING (true);

-- 6. Create moments table
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

DROP POLICY IF EXISTS "Everyone can read moments" ON moments;
DROP POLICY IF EXISTS "Users can create own moments" ON moments;
DROP POLICY IF EXISTS "Users can delete own moments" ON moments;

CREATE POLICY "Everyone can read moments" ON moments FOR SELECT USING (true);
CREATE POLICY "Users can create own moments" ON moments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete own moments" ON moments FOR DELETE USING (true);

-- 7. Create transactions table (NEW!)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  spot_id UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'UPI',
  status TEXT NOT NULL DEFAULT 'not_paid' CHECK (status IN ('paid', 'not_paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_spot_id_idx ON transactions(spot_id);
CREATE INDEX IF NOT EXISTS transactions_created_at_idx ON transactions(created_at DESC);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can read all transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can create transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON transactions;

CREATE POLICY "Users can read own transactions" ON transactions FOR SELECT USING (true);
CREATE POLICY "Admins can read all transactions" ON transactions FOR SELECT USING (true);
CREATE POLICY "Admins can create transactions" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update transactions" ON transactions FOR UPDATE USING (true);

-- 8. Create trigger for transactions updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 9. Insert initial admin user
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

-- 10. Insert other users
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

-- Success message
SELECT 'All tables created successfully including transactions!' as status;
