# Security Setup Guide

## ✅ Security Fixes Applied

### 1. Environment Variables
All sensitive data (passwords, API keys) moved to `.env` file.

### 2. Files Created
- `.env` - Contains actual secrets (NOT in git)
- `.env.example` - Template for other developers (in git)
- `.gitignore` - Updated to exclude `.env` files

### 3. Mock API Updated
`services/mockApi.ts` now uses environment variables instead of hardcoded passwords.

---

## 🔐 How It Works

**Before (Insecure):**
```typescript
password: "admin@brocode"  // ❌ Hardcoded in code
```

**After (Secure):**
```typescript
password: import.meta.env.VITE_ADMIN_PASSWORD || "changeme"  // ✅ From .env
```

---

## 📝 Setup Instructions

### For New Developers:

1. **Copy the example file:**
   ```bash
   copy .env.example .env
   ```

2. **Edit `.env` and add your credentials:**
   ```env
   VITE_ADMIN_PASSWORD=your_password_here
   VITE_USER_PASSWORD=your_password_here
   ```

3. **Never commit `.env` to git!**
   - It's already in `.gitignore`
   - Only commit `.env.example`

---

## 🚨 Important Notes

### Mock API (Development Only)
- `services/mockApi.ts` is only for local testing
- Production uses Supabase (real database)
- Mock passwords are safe because they're not in production

### Production Security
- Real passwords are in Supabase database
- Supabase handles authentication securely
- No passwords stored in frontend code

### GitGuardian Warnings
- After this fix, GitGuardian warnings will stop
- Old commits may still show warnings (that's okay)
- New commits will be clean

---

## 🔄 Migration from Old Code

If you have old code with hardcoded passwords:

1. Pull latest changes
2. Create `.env` file from `.env.example`
3. Add your passwords to `.env`
4. Restart dev server: `npm run dev`

---

## ✨ Best Practices

✅ **DO:**
- Use environment variables for secrets
- Keep `.env` in `.gitignore`
- Share `.env.example` with team
- Use different passwords for dev/prod

❌ **DON'T:**
- Commit `.env` to git
- Share passwords in code
- Use same password everywhere
- Hardcode API keys

---

## 🛡️ Security Checklist

- [x] Passwords moved to environment variables
- [x] `.env` added to `.gitignore`
- [x] `.env.example` created for team
- [x] Mock API updated to use env vars
- [x] Documentation created

---

Need help? Check `.env.example` for required variables!
