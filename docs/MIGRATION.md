# Data Migration Guide

Guide to migrate existing tasks from SQLite to Cloud Firestore.

## Migration Overview

This process converts your existing SQLite tasks to Firestore with proper user structure:

```
SQLite (Single User):
┌─────────────────┐
│ tasks table     │
│ - One database  │
│ - All tasks     │
└─────────────────┘

                  ↓ MIGRATION ↓

Firestore (User-Specific):
┌────────────────────────┐
│ users/{userId}         │
│  └─ tasks/{taskId}     │
│     - User-isolated    │
│     - Organized        │
└────────────────────────┘
```

## Prerequisites

- Firestore database created and running
- Firebase CLI configured (`firebase login`)
- Node.js 18+ installed
- SQLite database file (`tasks.db`)

## Step 1: Export SQLite Data

### 1.1 Export as JSON

```bash
cd /Users/abhchoug/work/Daily\ ToDo
python3 -c "
import sqlite3
import json
from datetime import datetime

# Connect to SQLite
conn = sqlite3.connect('tasks.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Fetch all tasks
cursor.execute('SELECT * FROM tasks ORDER BY date, id')
rows = cursor.fetchall()

# Convert to JSON
tasks = {}
for row in rows:
    date = row['date']
    if date not in tasks:
        tasks[date] = []
    tasks[date].append({
        'text': row['text'],
        'checked': bool(row['checked']),
        'createdAt': row['created_at'],
        'updatedAt': row['updated_at']
    })

# Save to file
with open('tasks_export.json', 'w') as f:
    json.dump(tasks, f, indent=2)

print(f'✅ Exported {sum(len(v) for v in tasks.values())} tasks to tasks_export.json')
"
```

### 1.2 Verify Export

```bash
cat tasks_export.json | head -50
```

Should show tasks grouped by date:
```json
{
  "2025-01-15": [
    {
      "text": "Task 1",
      "checked": false,
      "createdAt": "2025-01-15 10:30:00",
      "updatedAt": "2025-01-15 10:30:00"
    }
  ]
}
```

## Step 2: Prepare Migration Script

Create migration script at `scripts/migrate-data.js`:

```bash
cat > /Users/abhchoug/daily-todo-cloud/scripts/migrate-data.js << 'EOF'
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../path/to/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function migrateData(jsonFilePath, userId) {
  try {
    console.log(`📂 Reading tasks from: ${jsonFilePath}`);
    
    if (!fs.existsSync(jsonFilePath)) {
      throw new Error(`File not found: ${jsonFilePath}`);
    }
    
    const tasksData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    let totalTasks = 0;
    
    // Create or verify user profile
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.log(`👤 Creating user profile: ${userId}`);
      await userRef.set({
        email: 'migrate@example.com',
        displayName: 'Migrated User',
        createdAt: admin.firestore.Timestamp.now(),
        lastLogin: admin.firestore.Timestamp.now(),
      });
    }
    
    // Migrate tasks in batches
    const batchSize = 500;
    let batch = db.batch();
    let batchCount = 0;
    let savedBatches = 0;
    
    for (const [dateKey, tasksList] of Object.entries(tasksData)) {
      for (const task of tasksList) {
        const taskRef = userRef.collection('tasks').doc();
        
        batch.set(taskRef, {
          date: dateKey,
          text: task.text,
          checked: task.checked || false,
          createdAt: admin.firestore.Timestamp.fromDate(
            new Date(task.createdAt)
          ),
          updatedAt: admin.firestore.Timestamp.fromDate(
            new Date(task.updatedAt)
          ),
        });
        
        batchCount++;
        totalTasks++;
        
        // Commit batch every 500 documents
        if (batchCount >= batchSize) {
          console.log(`📤 Committing batch ${savedBatches + 1} (${batchCount} tasks)...`);
          await batch.commit();
          savedBatches++;
          batch = db.batch();
          batchCount = 0;
        }
      }
    }
    
    // Commit final batch
    if (batchCount > 0) {
      console.log(`📤 Committing final batch (${batchCount} tasks)...`);
      await batch.commit();
      savedBatches++;
    }
    
    console.log(`\n✅ Migration complete!`);
    console.log(`   📊 Total tasks migrated: ${totalTasks}`);
    console.log(`   👤 User ID: ${userId}`);
    console.log(`   📁 Batches committed: ${savedBatches}`);
    
    // Verify migration
    const snapshot = await userRef.collection('tasks').get();
    console.log(`   ✔️ Verified: ${snapshot.size} tasks in Firestore`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await admin.app().delete();
  }
}

// Get arguments
const jsonFile = process.argv[2];
const userId = process.argv[3];

if (!jsonFile || !userId) {
  console.error('Usage: node migrate-data.js <json-file> <user-id>');
  console.error('Example: node migrate-data.js tasks_export.json user123');
  process.exit(1);
}

migrateData(jsonFile, userId);
EOF
```

## Step 3: Get Firebase Service Account

This is needed to run the migration script.

### 3.1 Download Service Account Key

1. Go to Firebase Console
2. Click **Settings** ⚙️
3. Go to **Service accounts** tab
4. Click **Generate new private key**
5. Save as `serviceAccountKey.json`
6. Move to project root:
   ```bash
   mv ~/Downloads/serviceAccountKey.json /Users/abhchoug/daily-todo-cloud/
   ```

### 3.2 Add to .gitignore

```bash
echo "serviceAccountKey.json" >> /Users/abhchoug/daily-todo-cloud/.gitignore
```

⚠️ **IMPORTANT**: Never commit this file to Git!

## Step 4: Run Migration

### 4.1 Install Migration Script Dependencies

```bash
cd /Users/abhchoug/daily-todo-cloud
npm install firebase-admin
```

### 4.2 Create Primary User

First, create your primary user account through the app:

1. Visit your deployed application
2. Sign up with email/password or Google
3. Copy your User ID from browser console:
   ```javascript
   firebase.auth().currentUser.uid
   ```

### 4.3 Run Migration Script

```bash
node scripts/migrate-data.js /Users/abhchoug/work/Daily\ ToDo/tasks_export.json YOUR_USER_ID
```

Expected output:
```
📂 Reading tasks from: tasks_export.json
👤 Creating user profile: user123abc...
📤 Committing batch 1 (500 tasks)...
📤 Committing final batch (45 tasks)...

✅ Migration complete!
   📊 Total tasks migrated: 545
   👤 User ID: user123abc...
   📁 Batches committed: 2
   ✔️ Verified: 545 tasks in Firestore
```

## Step 5: Verify Migration

### 5.1 Check Firestore Console

1. Go to Firebase Console → Firestore Database
2. Navigate to `users/{your-user-id}/tasks`
3. You should see all your migrated tasks

### 5.2 Test in Application

1. Log in with your migrated user account
2. Verify all tasks appear
3. Test editing a task
4. Test creating a new task

### 5.3 Verify Data Structure

```bash
# Query Firestore for your user's tasks
firebase firestore:data-export /tmp/firestore_export.json
```

## Step 6: Backup SQLite

Keep your original database as backup:

```bash
# Create timestamped backup
cp /Users/abhchoug/work/Daily\ ToDo/tasks.db tasks.db.backup_$(date +%Y%m%d_%H%M%S)
```

## Step 7: Create Additional Users (Optional)

If you have multiple people using the app:

1. Have each person sign up through the app
2. Their user ID will be automatically created
3. They can start adding tasks immediately

## Rollback Plan

If something goes wrong:

### 5.1 Clear Firestore Data

```bash
# Delete all tasks for wrong user
firebase firestore:delete users/{wrong-user-id}/tasks --recursive
```

### 5.2 Re-run Migration

```bash
node scripts/migrate-data.js tasks_export.json correct-user-id
```

## Common Issues

### "serviceAccountKey.json not found"

Make sure file is in project root:
```bash
ls -la serviceAccountKey.json
```

### "Permission denied" errors

Check Firestore security rules are set correctly:

```bash
firebase deploy --only firestore:rules
```

### Tasks not appearing in app

1. Clear browser cache: Ctrl+Shift+Del
2. Verify user ID matches
3. Check Firestore rules allow reads
4. Check Cloud Functions API is working

## Migration Statistics

Run this to get stats after migration:

```bash
firebase firestore:query 'users' --limit=1000 | jq '.documents[] | select(.fields.tasks) | .fields.tasks.arrayValue.values | length'
```

## Data Transformation Details

The migration converts each SQLite task like:

```javascript
// Input (SQLite)
{
  id: 1,
  date: "28-10-2025",
  text: "Buy groceries",
  checked: false,
  created_at: "2025-10-28 10:30:00",
  updated_at: "2025-10-28 10:30:00"
}

// Output (Firestore)
{
  date: "28-10-2025",
  text: "Buy groceries",
  checked: false,
  createdAt: Timestamp(2025-10-28T10:30:00Z),
  updatedAt: Timestamp(2025-10-28T10:30:00Z)
}
```

Notes:
- `id` is auto-generated by Firestore
- Date format stays the same
- Timestamps converted to Firestore Timestamp objects
- Nested under user ID for isolation

## Next Steps

1. [Set up GitHub Actions for auto-deployment](SETUP.md#github-pages-setup)
2. [Review security rules](SECURITY.md)
3. [Monitor costs](SETUP.md#cost-monitoring)

---

**Data migration successful!** 🎉
