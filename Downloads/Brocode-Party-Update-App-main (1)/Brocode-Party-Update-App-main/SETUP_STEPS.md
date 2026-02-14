# 🚨 CRITICAL: Database Setup Steps

## The Error You're Seeing

```
Failed to create spot
Could not find the table 'public.spots' in the schema cache
```

**This means:** The database tables don't exist yet in your Supabase project.

## ✅ Solution (5 Minutes)

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Login to your account
3. Click on your project

### Step 2: Open SQL Editor
1. In the left sidebar, click **"SQL Editor"**
2. Click the **"New Query"** button (top right)

### Step 3: Copy the Migration SQL
1. In your project folder, open the file: **`supabase_migration.sql`**
2. Select ALL the text (Ctrl+A / Cmd+A)
3. Copy it (Ctrl+C / Cmd+C)

### Step 4: Paste and Run
1. Go back to Supabase SQL Editor
2. Paste the SQL code (Ctrl+V / Cmd+V)
3. Click the **"Run"** button (or press Ctrl+Enter)
4. Wait for the success message ✅

### Step 5: Verify Tables Were Created
1. In Supabase dashboard, click **"Table Editor"** (left sidebar)
2. You should see these 6 tables:
   - ✅ profiles
   - ✅ spots
   - ✅ invitations
   - ✅ payments
   - ✅ chat_messages
   - ✅ moments

### Step 6: Refresh Your App
1. Go back to your app
2. Refresh the page (F5)
3. The error should be gone!

## 🎯 Quick Checklist

- [ ] Opened Supabase dashboard
- [ ] Went to SQL Editor
- [ ] Opened `supabase_migration.sql` file
- [ ] Copied ALL the SQL code
- [ ] Pasted into Supabase SQL Editor
- [ ] Clicked "Run" button
- [ ] Saw success message
- [ ] Verified tables in Table Editor
- [ ] Refreshed the app

## 📸 Visual Guide

```
Supabase Dashboard
├── SQL Editor (click here)
│   └── New Query button
│       └── Paste SQL from supabase_migration.sql
│           └── Click "Run"
│
└── Table Editor (verify here)
    └── Should see 6 tables
```

## ❓ Still Having Issues?

1. **Check your `.env.local` file exists** with:
   ```
   VITE_SUPABASE_URL=your_url
   VITE_SUPABASE_ANON_KEY=your_key
   ```

2. **Check browser console** (F12) for detailed errors

3. **Verify Supabase project is active** (not paused)

4. **Make sure you ran ALL the SQL** - not just part of it

## 🎉 After Setup

Once tables are created:
- ✅ You can create spots
- ✅ History page will work
- ✅ RSVP system will work
- ✅ Real-time updates will work

---

**Remember:** You only need to do this ONCE per Supabase project!
