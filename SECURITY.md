# 🔐 Security Guidelines

## Critical: Credential Management

### Files That Must NEVER Be Committed

The following files contain sensitive credentials and are **automatically excluded** via `.gitignore`:

1. **Firebase Service Account Key**
   - File: `firebase/serviceAccountKey.json`
   - Contains: Private keys for Firebase Admin SDK
   - ⚠️ **NEVER commit this file to Git**

2. **Environment Variables**
   - File: `.env`
   - Contains: API keys, database URLs, secrets
   - ⚠️ **NEVER commit this file to Git**

3. **Any `.key` or `.pem` files**
   - Private encryption keys
   - ⚠️ **NEVER commit these files to Git**

---

## What's Protected

### Firebase Credentials
```json
{
  "project_id": "wizz-456517",
  "private_key": "-----BEGIN PRIVATE KEY-----...",
  "client_email": "firebase-adminsdk-fbsvc@wizz-456517.iam.gserviceaccount.com"
}
```

### API Keys
```
FIREBASE_API_KEY=AIzaSyDGPJq9LeV9JX2H8BGqunY2oOHTJnbXrpE
```

---

## Setup for Developers

### 1. Get Credentials (One-Time)

Ask the project owner for:
- `serviceAccountKey.json` (Firebase)
- `.env` file with API keys

### 2. Place Files Correctly

```bash
# Firebase credentials
cp serviceAccountKey.json firebase/serviceAccountKey.json

# Environment variables
cp .env-template .env
# Then edit .env with your keys
```

### 3. Verify Protection

```bash
# Check gitignore is working
git status

# These should NOT appear:
# ❌ firebase/serviceAccountKey.json
# ❌ .env
```

If they appear, they're NOT being ignored! Stop and fix `.gitignore`.

---

## Emergency: If Credentials Were Committed

### Immediate Actions

1. **Revoke the exposed credentials immediately**
   ```bash
   # Go to Firebase Console
   # Project Settings → Service Accounts
   # Delete the compromised key
   # Generate a new one
   ```

2. **Remove from Git history**
   ```bash
   # Remove file from Git completely
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch firebase/serviceAccountKey.json" \
     --prune-empty --tag-name-filter cat -- --all

   # Force push (WARNING: rewrites history)
   git push origin --force --all
   ```

3. **Rotate all keys**
   - Generate new Firebase service account key  
   - Update API keys
   - Update `.env` file
   - Distribute new credentials to team

---

## Best Practices

### ✅ DO

- Store credentials in `.env` and `.gitignore` them
- Use environment variables in code
- Share credentials via secure channels (1Password, encrypted email)
- Rotate keys regularly
- Use different keys for dev/staging/production

### ❌ DON'T

- Commit credentials to Git
- Hard-code API keys in source files
- Share credentials in Slack/Discord/public channels
- Use production credentials in development
- Store credentials in code comments

---

## Environment Variable Usage

### Backend (API Gateway)

```typescript
// api-gateway/src/config.ts
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  firebaseApiKey: process.env.FIREBASE_API_KEY,
  port: process.env.PORT || 4000
};
```

### Frontend (React)

```typescript
// web-frontend/src/firebase.ts
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID
};
```

**Note:** Vite requires `VITE_` prefix for environment variables.

---

## Deployment Security

### Production Environment

For production deployments (Firebase, Vercel, etc.):

1. **Use platform secrets management**
   ```bash
   # Firebase Functions
   firebase functions:config:set \
     firebase.api_key="AIzaSy..." \
     firebase.project_id="wizz-456517"

   # Vercel
   vercel secrets add firebase_api_key "AIzaSy..."
   ```

2. **Never expose credentials in client bundle**
   - Backend API keys: Server-side only
   - Firebase client config: Public but restricted by Firebase rules

3. **Enable security rules**
   - Firestore: Restrict read/write access
   - Storage: Require authentication
   - Functions: Validate requests

---

## Verification Checklist

Before committing:

- [ ] `firebase/serviceAccountKey.json` is gitignored
- [ ] `.env` is gitignored  
- [ ] No API keys in source code
- [ ] `git status` shows no sensitive files
- [ ] Environment variables use `process.env` or `import.meta.env`
- [ ] No credentials in commit messages

---

## Questions?

If you're unsure whether a file should be committed:

1. Does it contain passwords, keys, or tokens? → **Don't commit**
2. Does it have `key`, `secret`, `token` in filename? → **Don't commit**
3. Would you be comfortable posting it publicly? → If no, **don't commit**

**When in doubt, ask the team lead!**

---

## Current Protected Files

```
firebase/serviceAccountKey.json    ← Firebase Admin SDK credentials
.env                               ← API keys and configuration
```

These files are essential for the app to work but **must never be in Git**.

---

**Last Updated:** December 11, 2025
**Security Level:** CRITICAL
