#!/usr/bin/env node

/**
 * SQLite to Firebase Firestore Migration Script (v2)
 * Migrates from the updated database with 600 tasks
 * 
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=key.json node migrate-v2.js <sqlite-db-path> <user-id>
 * 
 * Example:
 *   GOOGLE_APPLICATION_CREDENTIALS=key.json node migrate-v2.js "/Users/abhchoug/work/Daily ToDo /data/tasks.db" "0iNaxUNxiXSPEON5QiweUexWVWv1"
 */

const admin = require('firebase-admin');
const sqlite3 = require('sqlite3').verbose();

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('❌ Error: GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
  process.exit(1);
}

const dbPath = process.argv[2];
const userId = process.argv[3];

if (!dbPath || !userId) {
  console.error('Usage: node migrate-v2.js <sqlite-db-path> <user-id>');
  console.error('\nExample:');
  console.error('  node migrate-v2.js "/Users/abhchoug/work/Daily ToDo /data/tasks.db" "0iNaxUNxiXSPEON5QiweUexWVWv1"');
  process.exit(1);
}

admin.initializeApp();
const db = admin.firestore();

/**
 * Convert date from D-M-YYYY to YYYY-MM-DD format
 * Example: "1-6-2025" → "2025-06-01"
 */
function convertDateFormat(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    console.error(`Invalid date format: ${dateStr}`);
    return dateStr;
  }

  const day = parts[0];
  const month = parts[1];
  const year = parts[2];

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

async function migrateData() {
  return new Promise((resolve, reject) => {
    const sqlite = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error(`❌ Error opening database: ${err.message}`);
        reject(err);
        return;
      }
      console.log(`\n📂 Connected to SQLite database: ${dbPath}`);
    });

    sqlite.all(
      'SELECT id, date, text, checked, created_at, updated_at FROM tasks ORDER BY date, id',
      async (err, rows) => {
        if (err) {
          console.error(`❌ Error querying database: ${err.message}`);
          sqlite.close();
          reject(err);
          return;
        }

        const totalTasks = rows.length;
        console.log(`📊 Found ${totalTasks} tasks to migrate\n`);

        if (totalTasks === 0) {
          console.log('✅ No tasks to migrate');
          sqlite.close();
          resolve();
          return;
        }

        // Ensure user document exists
        console.log(`👤 Setting up user: ${userId}`);
        const userRef = db.collection('users').doc(userId);

        try {
          await userRef.set(
            {
              email: 'abhijitchougule23@gmail.com',
              displayName: 'Migrated User',
              migratedAt: admin.firestore.Timestamp.now(),
              taskCount: totalTasks,
            },
            { merge: true }
          );
          console.log(`   User profile ready\n`);

          // Migrate tasks in batches
          await migrateTasks(userRef, rows);
          sqlite.close();
          resolve();
        } catch (error) {
          console.error(`❌ Error setting up user: ${error.message}`);
          sqlite.close();
          reject(error);
        }
      }
    );
  });
}

async function migrateTasks(userRef, rows) {
  const batchSize = 500;
  const tasksRef = userRef.collection('tasks');

  console.log(`📤 Uploading tasks in batches of ${batchSize}...\n`);

  let batch = db.batch();
  let batchCount = 1;
  let taskCount = 0;

  for (const row of rows) {
    const originalDate = row.date;
    const convertedDate = convertDateFormat(originalDate);

    const taskData = {
      date: convertedDate,
      text: row.text || '',
      checked: !!row.checked,
      createdAt: admin.firestore.Timestamp.fromMillis(
        row.created_at ? new Date(row.created_at).getTime() : Date.now()
      ),
      updatedAt: admin.firestore.Timestamp.fromMillis(
        row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
      ),
      migratedFrom: 'sqlite',
    };

    const docRef = tasksRef.doc(`task_${row.id}`);
    batch.set(docRef, taskData);
    taskCount++;

    if (taskCount % batchSize === 0) {
      await batch.commit();
      console.log(`  ✅ Batch ${batchCount} complete (${taskCount}/${rows.length} tasks)`);
      batch = db.batch();
      batchCount++;
    }
  }

  // Commit remaining tasks
  if (taskCount % batchSize !== 0) {
    await batch.commit();
    console.log(`  ✅ Final batch complete (${taskCount}/${rows.length} tasks)\n`);
  }

  // Verify migration
  await verifyMigration(tasksRef, rows.length);
}

async function verifyMigration(tasksRef, expectedCount) {
  console.log(`\n✔️ Verifying migration...\n`);

  const snapshot = await tasksRef.get();
  console.log(`📊 Verification Results:`);
  console.log(`   Total tasks migrated: ${snapshot.size}`);
  console.log(`   Expected: ${expectedCount}`);
  console.log(`   Status: ${snapshot.size === expectedCount ? '✅ PASS' : '❌ FAIL'}\n`);

  // Show sample tasks
  if (snapshot.size > 0) {
    console.log(`📋 Sample migrated tasks:\n`);
    const samples = snapshot.docs.slice(0, 5);
    samples.forEach((doc) => {
      const data = doc.data();
      const checked = data.checked ? '✓' : '○';
      console.log(`   📌 ${data.date}: "${data.text}" ${checked}`);
    });
  }

  // Group by date
  const dates = new Set();
  snapshot.docs.forEach((doc) => {
    dates.add(doc.data().date);
  });

  console.log(`\n📅 Tasks grouped by date: ${dates.size} unique dates`);
  console.log(`\n✅ Migration successful! All ${snapshot.size} tasks migrated.`);
}

console.log('╔════════════════════════════════════════════════════╗');
console.log('║   SQLite → Firebase Firestore Migration (v2)      ║');
console.log('╚════════════════════════════════════════════════════╝');

migrateData().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
