# Supabase Setup Guide

This guide will help you set up Supabase for the BroCode application with real-time functionality.

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in your project details:
   - Name: `brocode` (or your preferred name)
   - Database Password: (save this securely)
   - Region: Choose closest to your users
5. Wait for the project to be created (takes ~2 minutes)

## Step 2: Get Your Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys")

## Step 3: Configure Environment Variables

1. Create a `.env.local` file in the root of your project
2. Add your Supabase credentials:

```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Example:
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 4: Set Up Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Copy and paste the SQL from `DATABASE_SCHEMA.md`
3. Run the SQL to create all tables, indexes, and policies

## Step 5: Enable Real-time

1. In Supabase dashboard, go to **Database** → **Replication**
2. Enable replication for the following tables:
   - `spots`
   - `invitations`
   - `payments`
   - `chat_messages`

## Step 6: Insert Initial Data

1. In SQL Editor, run the admin user insert from `DATABASE_SCHEMA.md`
2. Or use the Supabase dashboard to manually insert users

## Step 7: Test the Connection

1. Start your development server: `npm run dev`
2. Try logging in with:
   - Email: `ramvj2005@gmail.com`
   - Password: `ramkumar`
3. Create a new spot as admin
4. Check if real-time updates work by opening the app in multiple tabs

## Troubleshooting

### "Supabase credentials are not configured" warning
- Make sure `.env.local` exists in the project root
- Check that variable names start with `VITE_`
- Restart your dev server after creating `.env.local`

### Real-time not working
- Check that replication is enabled for the tables
- Verify RLS policies allow reading the data
- Check browser console for errors

### Authentication errors
- Verify RLS policies are set correctly
- Check that user exists in `profiles` table
- Ensure password matches (if using custom auth)

## Security Notes

- Never commit `.env.local` to git (it's in `.gitignore`)
- The `anon` key is safe for client-side use (RLS protects your data)
- Use service role key only on server-side (never expose it)

## Next Steps

- Set up email authentication in Supabase Auth (optional)
- Configure storage buckets for images (optional)
- Set up database backups
- Configure custom domains (optional)
