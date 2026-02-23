# Setup Guide

A complete guide to set up the Daily ToDo Cloud application from scratch.

## Prerequisites

Before starting, ensure you have:

- **Node.js 18+** - [Download](https://nodejs.org/)
- **Firebase CLI** - `npm install -g firebase-tools`
- **Git** - [Download](https://git-scm.com/)
- **GitHub Account** - [Create here](https://github.com)
- **Google Cloud Account** - [Sign up](https://cloud.google.com)

## Step 1: Create Firebase Project

### 1.1 Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Create a project"**
3. Project name: `daily-todo-cloud` (or your preference)
4. Accept terms and click **Create project**
5. Wait for project creation to complete

### 1.2 Enable Firestore

1. In Firebase Console, go to **Build → Firestore Database**
2. Click **Create database**
3. Select region: `us-central1` (or nearest to you)
4. Start in **Production mode**
5. Click **Create**

### 1.3 Enable Authentication

1. Go to **Build → Authentication**
2. Click **Get started**
3. Click **Email/Password** provider
4. Enable **Email/Password** and **Email link (passwordless)**
5. Click **Google** provider
6. Add your Support email
7. Click **Save**
8. Click **GitHub** provider
9. [Get OAuth credentials](#github-oauth-setup)
10. Add Client ID and Secret
11. Click **Save**

### 1.4 Enable Cloud Functions

1. Go to **Build → Functions**
2. Click **Get started**
3. Select region: **us-central1**
4. Click **Next**

## Step 2: GitHub OAuth Setup

To enable GitHub sign-in:

1. Go to GitHub Settings → [Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - **Application name**: `Daily ToDo Cloud`
   - **Homepage URL**: `https://your-domain.github.io` (we'll update this later)
   - **Authorization callback URL**: `https://your-project.firebaseapp.com/__/auth/handler`
4. Click **Register application**
5. Copy **Client ID** and generate **Client Secret**
6. Add these to Firebase Console → Authentication → GitHub

## Step 3: Local Repository Setup

### 3.1 Clone Repository

```bash
git clone https://github.com/abhchoug/daily-todo-cloud.git
cd daily-todo-cloud
```

### 3.2 Install Dependencies

```bash
# Install Firebase CLI (if not done yet)
npm install -g firebase-tools

# Install function dependencies
cd functions
npm install
cd ..
```

### 3.3 Firebase Login

```bash
firebase login
```

This opens a browser - sign in with your Google account that owns the Firebase project.

### 3.4 Initialize Firebase Project

```bash
firebase init
```

When prompted:

```
? Which Firebase features do you want to use?
→ Choose: Functions, Hosting, Firestore

? Associate with Firebase project?
→ Select your `daily-todo-cloud` project

? What language for Cloud Functions?
→ TypeScript

? Do you want to use ESLint?
→ Yes

? Do you want to install dependencies?
→ Yes

? What do you want to use as your public directory?
→ frontend

? Configure as single-page app?
→ Yes

? Set up automatic builds/deploys?
→ No
```

## Step 4: Update Firebase Configuration

### 4.1 Get Firebase Config

1. Go to Firebase Console
2. Click **Project settings** (⚙️)
3. Scroll down to **Your apps**
4. If no apps, click **Add app** → Web
5. Copy the config object

### 4.2 Update Frontend Config

Edit `frontend/firebase-config.js`:

```javascript
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Step 5: Deploy Firestore Security Rules

```bash
firebase deploy --only firestore:rules
```

## Step 6: Build and Deploy Cloud Functions

```bash
cd functions
npm run build
cd ..

firebase deploy --only functions
```

This deploys your backend API to Cloud Functions.

## Step 7: Build and Deploy Frontend

```bash
firebase deploy --only hosting
```

Your app is now live at: `https://your-project.web.app`

## Step 8: GitHub Pages Setup (Optional)

If you prefer GitHub Pages instead of Firebase Hosting:

### 8.1 Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Repository name: `daily-todo-cloud`
3. Description: `Cloud-native task management app`
4. Choose **Public** (for GitHub Pages)
5. Click **Create repository**

### 8.2 Push Code to GitHub

```bash
git remote add origin https://github.com/abhchoug/daily-todo-cloud.git
git branch -M main
git push -u origin main
```

### 8.3 Enable GitHub Pages

1. Go to repository **Settings → Pages**
2. Source: `Deploy from a branch`
3. Branch: `main`, Folder: `/frontend`
4. Click **Save**

Your site is now at: `https://abhchoug.github.io/daily-todo-cloud`

### 8.4 Update OAuth Callback URL

Update GitHub OAuth app:
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Edit **Authorization callback URL**
3. Change to: `https://abhchoug.github.io/daily-todo-cloud/__/auth/handler`
4. Click **Update application**

## Step 9: Test Locally with Emulator

To test without deploying to cloud:

```bash
firebase emulators:start
```

This starts:
- Firestore Emulator (localhost:8080)
- Auth Emulator (localhost:9099)
- Cloud Functions Emulator (localhost:5001)

Update `frontend/firebase-config.js` to use emulators:

```javascript
if (location.hostname === 'localhost') {
  // Connect to emulators
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
}
```

## Step 10: Environment Setup

### 10.1 Create `.env.local`

```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_API_BASE_URL=https://us-central1-your-project.cloudfunctions.net/api
```

## Step 11: Verify Setup

### Check Cloud Functions are running:

```bash
curl https://us-central1-your-project.cloudfunctions.net/api
```

Response should be:
```json
{"status": "ok", "message": "Daily ToDo Cloud Functions API"}
```

### Check Frontend loads:

1. Visit your deployed URL
2. You should see login screen
3. Test sign-up with email

## Troubleshooting

### Cloud Functions not deploying

```bash
# Check errors
firebase deploy --only functions --debug

# Check logs
firebase functions:log
```

### CORS errors

Make sure Firebase CORS settings allow your domain:

```javascript
// In Cloud Functions (src/index.ts)
app.use(cors({
  origin: ['https://your-project.web.app', 'https://abhchoug.github.io'],
  credentials: true
}));
```

### Firestore rules blocking access

Test with emulator first:
```bash
firebase emulators:start
```

Then gradually enable production rules.

### Authentication not working

1. Check Firebase Console → Authentication → Settings
2. Verify OAuth provider credentials
3. Update authorized domains in Firebase Console
4. Clear browser cookies and cache

## Cost Monitoring

Monitor your costs at:
1. Firebase Console → Settings → Usage and billing
2. Google Cloud Console → Billing

Set up **Budget alerts** at $5/month to control costs.

## Next Steps

1. [Migrate data from SQLite](MIGRATION.md)
2. [Understand security rules](SECURITY.md)
3. [API documentation](API.md)
4. Customize theme and features

## Support

Having issues?

- Check [Firebase Documentation](https://firebase.google.com/docs)
- Review [Cloud Functions Documentation](https://cloud.google.com/functions/docs)
- Check GitHub Issues in this repo

---

**Congratulations!** Your Daily ToDo Cloud app is now set up! 🎉
