# Transaction History Setup Guide

## Quick Setup (2 minutes)

### Option 1: Supabase Dashboard (Recommended - Easiest)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com
   - Login and select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query" button

3. **Copy & Paste**
   - Open the file: `supabase_migration_transactions.sql`
   - Copy ALL the content (Ctrl+A, Ctrl+C)
   - Paste in Supabase SQL Editor (Ctrl+V)

4. **Run**
   - Click "Run" button (or press Ctrl+Enter)
   - Wait for success message

5. **Done!**
   - Refresh your app
   - Transaction history will now appear on Payment page

---

## Option 2: Using Supabase CLI (If you want to install CLI)

### Install Supabase CLI:
```powershell
# Using Scoop (recommended for Windows)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# OR using npm
npm install -g supabase
```

### Run Migration:
```powershell
# Link your project (one time only)
supabase link --project-ref your-project-ref

# Run migration
supabase db push
```

---

## Verify Installation

After running the SQL:

1. Go to Supabase Dashboard > Database > Tables
2. You should see a new table called `transactions`
3. Open your app and go to Payment page
4. You should see "Transaction History" section at the bottom

---

## Troubleshooting

**If you see "table does not exist" error:**
- The migration hasn't been run yet
- Go back to Option 1 and run the SQL in dashboard

**If transaction history is empty:**
- That's normal! Transactions will appear when:
  - Admin marks a payment as "Paid"
  - New payments are processed

**If you see permission errors:**
- Make sure you're logged in as admin
- Check RLS policies in Supabase Dashboard

---

## What This Feature Does

✅ Shows complete payment history
✅ Displays: Date, Amount, Payment Method, Status
✅ Users see only their own transactions
✅ Admins see all transactions
✅ Automatic transaction creation when payment is marked paid
✅ Mobile responsive design

---

Need help? The SQL file is ready at: `supabase_migration_transactions.sql`
Just copy-paste it in Supabase SQL Editor and click Run!
