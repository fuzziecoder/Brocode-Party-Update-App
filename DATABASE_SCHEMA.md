# Supabase Database Schema

This document describes the database schema required for the BroCode application.

## Tables

### 1. `profiles` table

Stores user profile information.

```sql
CREATE TABLE profiles (
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
CREATE UNIQUE INDEX profiles_username_unique ON profiles(username);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all profiles
CREATE POLICY "Users can read all profiles" ON profiles
  FOR SELECT USING (true);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

### 2. `spots` table

Stores spot/meetup information.

```sql
CREATE TABLE spots (
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
CREATE INDEX spots_date_idx ON spots(date);

-- Enable RLS
ALTER TABLE spots ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read spots
CREATE POLICY "Everyone can read spots" ON spots
  FOR SELECT USING (true);

-- Policy: Only admins can create spots
CREATE POLICY "Admins can create spots" ON spots
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can update spots
CREATE POLICY "Admins can update spots" ON spots
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can delete spots
CREATE POLICY "Admins can delete spots" ON spots
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

### 3. `invitations` table

Stores RSVP invitations for spots.

```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('confirmed', 'pending', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(spot_id, user_id)
);

-- Create indexes for faster queries
CREATE INDEX invitations_spot_id_idx ON invitations(spot_id);
CREATE INDEX invitations_user_id_idx ON invitations(user_id);

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read invitations
CREATE POLICY "Everyone can read invitations" ON invitations
  FOR SELECT USING (true);

-- Policy: Users can create/update their own invitations
CREATE POLICY "Users can manage own invitations" ON invitations
  FOR ALL USING (auth.uid() = user_id);
```

### 4. `payments` table

Stores payment information for spots.

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_paid' CHECK (status IN ('paid', 'not_paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(spot_id, user_id)
);

-- Create indexes for faster queries
CREATE INDEX payments_spot_id_idx ON payments(spot_id);
CREATE INDEX payments_user_id_idx ON payments(user_id);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read payments
CREATE POLICY "Everyone can read payments" ON payments
  FOR SELECT USING (true);

-- Policy: Admins can update payments
CREATE POLICY "Admins can update payments" ON payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: System can create payments (via service role)
CREATE POLICY "System can create payments" ON payments
  FOR INSERT WITH CHECK (true);
```

### 5. `chat_messages` table

Stores chat messages.

```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_text TEXT,
  content_image_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reactions JSONB DEFAULT '{}'::jsonb
);

-- Create index on created_at for faster queries
CREATE INDEX chat_messages_created_at_idx ON chat_messages(created_at);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read messages
CREATE POLICY "Everyone can read messages" ON chat_messages
  FOR SELECT USING (true);

-- Policy: Users can create their own messages
CREATE POLICY "Users can create own messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own messages
CREATE POLICY "Users can delete own messages" ON chat_messages
  FOR DELETE USING (auth.uid() = user_id);
```

### 6. `moments` table

Stores user moments/photos.

```sql
CREATE TABLE moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id and created_at
CREATE INDEX moments_user_id_idx ON moments(user_id);
CREATE INDEX moments_created_at_idx ON moments(created_at DESC);

-- Enable RLS
ALTER TABLE moments ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read moments
CREATE POLICY "Everyone can read moments" ON moments
  FOR SELECT USING (true);

-- Policy: Users can create their own moments
CREATE POLICY "Users can create own moments" ON moments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own moments
CREATE POLICY "Users can delete own moments" ON moments
  FOR DELETE USING (auth.uid() = user_id);
```

<<<<<<< HEAD
### 7. `transactions` table

Stores transaction history for payment tracking.

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  spot_id UUID NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'UPI',
  status TEXT NOT NULL DEFAULT 'not_paid' CHECK (status IN ('paid', 'not_paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX transactions_user_id_idx ON transactions(user_id);
CREATE INDEX transactions_spot_id_idx ON transactions(spot_id);
CREATE INDEX transactions_created_at_idx ON transactions(created_at DESC);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own transactions
CREATE POLICY "Users can read own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Admins can read all transactions
CREATE POLICY "Admins can read all transactions" ON transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can create transactions
CREATE POLICY "Admins can create transactions" ON transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can update transactions
CREATE POLICY "Admins can update transactions" ON transactions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

=======
>>>>>>> bedb01a0af53821680ce26a67bce5af226a10c8b
## Real-time Subscriptions

Enable real-time for the following tables in Supabase Dashboard:
- `spots` - for spot updates
- `invitations` - for RSVP updates
- `payments` - for payment status updates
- `chat_messages` - for chat updates
<<<<<<< HEAD
- `transactions` - for transaction history updates
=======
>>>>>>> bedb01a0af53821680ce26a67bce5af226a10c8b

## Initial Data

After creating the tables, you can insert the admin user:

```sql
INSERT INTO profiles (id, name, username, email, phone, password, role, location, is_verified)
VALUES (
  'admin',
  'Ram',
  'ramvj2005',
  'ramvj2005@gmail.com',
  '7826821130',
  'ramkumar',
  'admin',
  'Attibele',
  true
);
```

## Notes

1. Make sure to enable Row Level Security (RLS) on all tables
2. Adjust policies based on your security requirements
3. The `username` field has a UNIQUE constraint to ensure uniqueness
4. All timestamps use `TIMESTAMP WITH TIME ZONE` for proper timezone handling
5. Foreign key constraints ensure data integrity
