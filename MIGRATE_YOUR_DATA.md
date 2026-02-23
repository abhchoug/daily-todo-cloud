# Quick Start: Migrate Your Data

Your database has **483 tasks** to migrate. Here's how:

## STEP 1: Get Firebase Project Ready ⚡

Before migrating, you need:
1. Firebase project created
2. Firestore database running
3. Service account key file

[Follow SETUP.md Steps 1-3 first](SETUP.md#step-1-create-firebase-project)

---

## STEP 2: Get Service Account Key 🔐

1. Go to Firebase Console → Project Settings (⚙️)
2. Click "Service Accounts" tab
3. Click "Generate new private key"
4. **Save file as: `serviceAccountKey.json`**
5. **Move to your project root:**
   ```bash
   mv ~/Downloads/serviceAccountKey.json /Users/abhchoug/daily-todo-cloud/
   ```

⚠️ **IMPORTANT**: Add to .gitignore (already done)

---

## STEP 3: Install Migration Tool 📦

```bash
cd /Users/abhchoug/daily-todo-cloud
npm install firebase-admin sqlite3
```

---

## STEP 4: Run Migration 🚀

Before running, identify your **User ID**. Choose one:

**Option A: Use your email address**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/Users/abhchoug/daily-todo-cloud/serviceAccountKey.json"
node scripts/migrate-sqlite-to-firestore.js "/Users/abhchoug/work/Daily ToDo /tasks.db" "your-email@example.com"
```

**Option B: Use a unique user ID**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/Users/abhchoug/daily-todo-cloud/serviceAccountKey.json"
node scripts/migrate-sqlite-to-firestore.js "/Users/abhchoug/work/Daily ToDo /tasks.db" "user-12345"
```

**Option C: Use Firebase UID (after signing up)**
1. Sign up in the app
2. Get UID from browser console: `firebase.auth().currentUser.uid`
3. Run migration with that UID

---

## Expected Output 📊

```
╔════════════════════════════════════════════════════╗
║   SQLite → Firebase Firestore Migration           ║
╚════════════════════════════════════════════════════╝

📂 Connected to SQLite database: /Users/abhchoug/work/Daily ToDo /tasks.db
📊 Found 483 tasks to migrate

👤 Setting up user: your-email@example.com
   Creating user profile...

📤 Uploading tasks in batches of 500...

  ✅ Batch 1 complete (483/483 tasks)

✔️ Verifying migration...

📊 Verification Results:
   Total tasks migrated: 483
   Tasks in Firestore: 483
   Errors: 0

🎉 Migration successful! All 483 tasks migrated.
```

---

## STEP 5: Verify in Firebase Console 🔍

1. Go to Firebase Console
2. Click Firestore Database
3. Browse to: `users` → `{your-user-id}` → `tasks`
4. You should see all 483 tasks!

---

## STEP 6: Test in Your App 🧪

1. Deploy Cloud Functions (from SETUP.md)
2. Deploy Frontend (from SETUP.md)
3. Sign in with the same email/ID you used for migration
4. Your tasks should appear!

---

## Troubleshooting 🔧

**"GOOGLE_APPLICATION_CREDENTIALS not set"**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/Users/abhchoug/daily-todo-cloud/serviceAccountKey.json"
```

**"Cannot find module 'firebase-admin'"**
```bash
npm install firebase-admin sqlite3
```

**"Database file not found"**
- Check path has correct spaces: `/Users/abhchoug/work/Daily ToDo /tasks.db`
- Verify file exists: `ls "/Users/abhchoug/work/Daily ToDo /tasks.db"`

**"Permission denied" on Firestore**
- Make sure security rules are deployed
- Run: `firebase deploy --only firestore:rules`

**"User not found in Firestore"**
- User document is auto-created during migration
- Check Firestore console for the user document

---

## Multiple Users? 🧑‍🤝‍🧑

To migrate data for multiple users:
```bash
# Repeat for each user with different ID
node scripts/migrate-sqlite-to-firestore.js "/path/to/db.db" "user1-id"
node scripts/migrate-sqlite-to-firestore.js "/path/to/db.db" "user2-id"
```

---

## Data Structure After Migration 📋

Your SQLite data:
```sql
id    | date       | text              | checked | created_at
------|------------|-------------------|---------|-------------------
1     | 2025-01-15 | Buy groceries     | 0       | 2025-01-15 10:30
2     | 2025-01-15 | Call mom          | 1       | 2025-01-15 14:15
...   | ...        | ...               | ...     | ...
```

Becomes Firestore structure:
```
users/
  {your-user-id}/
    profile/
      email: "your-email@example.com"
      displayName: "Migrated User"
      createdAt: Timestamp
    tasks/
      task_1/
        date: "2025-01-15"
        text: "Buy groceries"
        checked: false
        createdAt: Timestamp
        updatedAt: Timestamp
        migratedFrom: "sqlite"
        originalId: 1
      task_2/
        date: "2025-01-15"
        text: "Call mom"
        checked: true
        ...
```

---

## What Gets Migrated ✅

✅ Task text
✅ Date
✅ Completion status (checked)
✅ Creation/update timestamps
✅ All 483 tasks
✅ All 121 dates

**Preserved:**
- Original task ID (as `originalId`)
- Migration source (as `migratedFrom: "sqlite"`)

---

## Next Steps 🎯

1. ✅ Get Firebase ready
2. ✅ Run migration
3. ✅ Verify in Firebase Console
4. Deploy Cloud Functions
5. Deploy Frontend
6. Sign in and test

**Ready? Let's go!** 🚀
