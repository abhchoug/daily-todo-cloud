#!/usr/bin/env node

/**
 * SQLite to Firebase Firestore Migration Script
 * 
 * Usage:
 *   1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable:
 *      export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
 *   
 *   2. Run the script:
 *      node migrate-sqlite-to-firestore.js <sqlite-db-path> <user-id>
 * 
 * Example:
 *   node migrate-sqlite-to-firestore.js "/Users/abhchoug/work/Daily ToDo /tasks.db" "user123"
 */

const admin = require('firebase-admin');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Validate environment
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('❌ Error: GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
  console.error('\nSet it with:');
  console.error('  export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"');
  process.exit(1);
}

// Get command line arguments
const dbPath = process.argv[2];
const userId = process.argv[3];

if (!dbPath || !userId) {
  console.error('Usage: node migrate-sqlite-to-firestore.js <sqlite-db-path> <user-id>');
  console.error('\nExample:');
  console.error('  node migrate-sqlite-to-firestore.js "/path/to/tasks.db" "user@example.com"');
  process.exit(1);
}

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Track statistics
let totalTasks = 0;
let createdTasks = 0;
let errors = 0;

/**
 * Read SQLite database and migrate to Firestore
 */
async function migrateData() {
  return new Promise((resolve, reject) => {
    const sqlite = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error(`❌ Error opening database: ${err.message}`);
        reject(err);
        return;
      }
      console.log(`📂 Connected to SQLite database: ${dbPath}`);
    });

    // Query all tasks
    sqlite.all(
      'SELECT id, date, text, checked, created_at, updated_at FROM tasks ORDER BY date, id',
      async (err, rows) => {
        if (err) {
          console.error(`❌ Error querying database: ${err.message}`);
          sqlite.close();
          reject(err);
          return;
        }

        totalTasks = rows.length;
        console.log(`📊 Found ${totalTasks} tasks to migrate\n`);

        if (totalTasks === 0) {
          console.log('✅ No tasks to migrate');
          sqlite.close();
          resolve();
          return;
        }

        // Create or verify user document
        console.log(`👤 Setting up user: ${userId}`);
        const userRef = db.collection('users').doc(userId);
        
        try {
          const userDoc = await userRef.get();
          if (!userDoc.exists) {
            console.log(`   Creating user profile...`);
            await userRef.set({
              email: userId,
              displayName: 'Migrated User',
              createdAt: admin.firestore.Timestamp.now(),
              lastLogin: admin.firestore.Timestamp.now(),
            });
          } else {
            console.log(`   User profile already exists`);
          }
        } catch (error) {
          console.error(`❌ Error creating user: ${error.message}`);
          errors++;
        }

        // Migrate tasks in batches
        await migrateTasks(userRef, rows);
        sqlite.close();
        resolve();
      }
    );
  });
}

/**
 * Migrate tasks to Firestore
 */
async function migrateTasks(userRef, rows) {
  const batchSize = 500;
  let currentBatch = 0;
  let batchNumber = 1;

  console.log(`\n📤 Uploading tasks in batches of ${batchSize}...\n`);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const batch = db.batch();

    // Fill batch
    while (currentBatch < batchSize && i < rows.length) {
      const row = rows[i];

      try {
        // Parse timestamps
        let createdAt, updatedAt;
        try {
          createdAt = admin.firestore.Timestamp.fromDate(
            new Date(row.created_at)
          );
        } catch (e) {
          createdAt = admin.firestore.Timestamp.now();
        }

        try {
          updatedAt = admin.firestore.Timestamp.fromDate(
            new Date(row.updated_at)
          );
        } catch (e) {
          updatedAt = admin.firestore.Timestamp.now();
        }

        const taskRef = userRef.collection('tasks').doc(`task_${row.id}`);
        batch.set(taskRef, {
          date: row.date,
          text: row.text,
          checked: row.checked ? true : false,
          createdAt: createdAt,
          updatedAt: updatedAt,
          migratedFrom: 'sqlite',
          originalId: row.id,
        });

        createdTasks++;
        currentBatch++;
      } catch (error) {
        console.error(`  ❌ Error processing task ${row.id}: ${error.message}`);
        errors++;
      }

      i++;
    }

    // Commit batch
    try {
      await batch.commit();
      console.log(
        `  ✅ Batch ${batchNumber} complete (${createdTasks}/${totalTasks} tasks)`
      );
      batchNumber++;
      currentBatch = 0;
    } catch (error) {
      console.error(`  ❌ Batch commit failed: ${error.message}`);
      errors++;
    }

    // Reset for last batch
    if (i >= rows.length) break;
  }
}

/**
 * Verify migration
 */
async function verifyMigration(userId) {
  console.log(`\n✔️ Verifying migration...\n`);

  try {
    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('tasks')
      .get();

    console.log(`📊 Verification Results:`);
    console.log(`   Total tasks migrated: ${createdTasks}`);
    console.log(`   Tasks in Firestore: ${snapshot.size}`);
    console.log(`   Errors: ${errors}`);

    if (snapshot.size === totalTasks) {
      console.log(`\n✅ Migration successful! All ${totalTasks} tasks migrated.\n`);
    } else {
      console.log(
        `\n⚠️  Warning: Expected ${totalTasks} tasks but found ${snapshot.size}\n`
      );
    }

    // Show sample tasks
    console.log(`📋 Sample migrated tasks:\n`);
    let count = 0;
    snapshot.forEach(doc => {
      if (count < 3) {
        const data = doc.data();
        console.log(`   📌 ${data.date}: "${data.text}" ${data.checked ? '✓' : '○'}`);
        count++;
      }
    });

    // Group by date
    const tasksByDate = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!tasksByDate[data.date]) {
        tasksByDate[data.date] = 0;
      }
      tasksByDate[data.date]++;
    });

    const dateCount = Object.keys(tasksByDate).length;
    console.log(`\n📅 Tasks grouped by date: ${dateCount} unique dates`);
  } catch (error) {
    console.error(`❌ Verification failed: ${error.message}`);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log(`\n╔════════════════════════════════════════════════════╗`);
    console.log(`║   SQLite → Firebase Firestore Migration           ║`);
    console.log(`╚════════════════════════════════════════════════════╝\n`);

    await migrateData();
    await verifyMigration(userId);

    await admin.app().delete();
    process.exit(errors > 0 ? 1 : 0);
  } catch (error) {
    console.error(`\n❌ Migration failed: ${error.message}`);
    await admin.app().delete();
    process.exit(1);
  }
}

main();
