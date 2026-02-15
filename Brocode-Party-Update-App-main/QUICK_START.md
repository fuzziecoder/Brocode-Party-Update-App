# Quick Start Guide

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign up/login
2. Click "New Project"
3. Fill in project details and wait for it to be created (~2 minutes)

## Step 2: Get Your Credentials

1. In Supabase dashboard → **Settings** → **API**
2. Copy:
   - **Project URL** 
   - **anon/public key**

## Step 3: Set Up Environment Variables

Create `.env.local` in your project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## Step 4: Create Database Tables ⚠️ IMPORTANT

**This is the step you're missing!**

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the **entire contents** of `supabase_migration.sql`
4. Paste it into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)
6. Wait for "Success" message

This will create all required tables:
- ✅ profiles
- ✅ spots
- ✅ invitations
- ✅ payments
- ✅ chat_messages
- ✅ moments

## Step 5: Enable Real-time (Optional but Recommended)

1. Go to **Database** → **Replication**
2. Enable replication for:
   - `spots`
   - `invitations`
   - `payments`
   - `chat_messages`

## Step 6: Restart Your Dev Server

```bash
npm run dev
```

## Step 7: Test

1. Login with: `ramvj2005@gmail.com` / `ramkumar`
2. Try creating a spot
3. Check History page

## Troubleshooting

### Error: "Could not find the table 'public.spots'"
**Solution:** You haven't run the SQL migration yet. Go to Step 4 above.

### Error: "Failed to create spot"
**Solution:** 
1. Make sure you ran the SQL migration (Step 4)
2. Check browser console for detailed error
3. Verify your `.env.local` has correct credentials

### Tables exist but still getting errors
1. Check Supabase dashboard → **Table Editor** → verify tables are there
2. Check **Authentication** → **Policies** → verify RLS policies exist
3. Try refreshing the page

## Need Help?

Check the detailed guides:
- `SUPABASE_SETUP.md` - Full setup guide
- `DATABASE_SCHEMA.md` - Database structure details
