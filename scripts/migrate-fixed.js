#!/usr/bin/env node

const admin = require('firebase-admin');
const sqlite3 = require('sqlite3').verbose();

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('❌ Error: GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
  process.exit(1);
}

const dbPath = '/Users/abhchoug/work/Daily ToDo /data/tasks.db';
const userId = '0iNaxUNxiXSPEON5QiweUexWVWv1';

admin.initializeApp();
const db = admin.firestore();

/**
 * Convert and validate date from D-M-YYYY to YYYY-MM-DD
 * Handles invalid months (0 -> 12) and corrects year if needed
 */
function convertAndFixDate(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    console.warn(`  ⚠️  Invalid date format: ${dateStr}`);
    return null;
  }

  let day = parseInt(parts[0]);
  let month = parseInt(parts[1]);
  let year = parseInt(parts[2]);

  // Fix invalid month 0 (should be 12 of previous year)
  if (month === 0) {
    month = 12;
    year -= 1;
  }

  // Validate month range
  if (month < 1 || month > 12) {
    console.warn(`  ⚠️  Invalid month ${month} in date: ${dateStr}`);
    return null;
  }

  // Validate day range
  if (day < 1 || day > 31) {
    console.warn(`  ⚠️  Invalid day ${day} in date: ${dateStr}`);
    return null;
  }

  // Convert year 2026 to 2025 if it's an outlier (assuming typo)
  // This is a heuristic - most dates are 2025
  if (year === 2026) {
    year = 2025;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

async function migrateWithValidation() {
  return new Promise((resolve, reject) => {
    const sqlite = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error(`❌ Error opening database: ${err.message}`);
        reject(err);
        return;
      }
      console.log(`📂 Connected to SQLite database\n`);
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

        console.log(`📊 Found ${rows.length} tasks to process\n`);

        // First pass: validate and report issues
        let validCount = 0;
        let invalidCount = 0;
        const dateIssues = [];

        console.log('🔍 Validating dates...\n');
        rows.forEach((row) => {
          const newDate = convertAndFixDate(row.date);
          if (newDate) {
            validCount++;
          } else {
            invalidCount++;
            dateIssues.push(row.date);
          }
        });

        console.log(`  Valid dates: ${validCount}`);
        console.log(`  Invalid dates: ${invalidCount}`);

        if (invalidCount > 0) {
          console.log(`\n  Problem dates: ${[...new Set(dateIssues)].slice(0, 5).join(', ')}`);
        }

        // Clear existing tasks
        console.log(`\n🗑️  Clearing old tasks...`);
        const userRef = db.collection('users').doc(userId);
        const tasksRef = userRef.collection('tasks');
        const snapshot = await tasksRef.get();

        let batch = db.batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        if (snapshot.size > 0) {
          await batch.commit();
          console.log(`  ✅ Cleared ${snapshot.size} old tasks\n`);
        }

        // Second pass: migrate with validation
        console.log(`📤 Uploading ${validCount} valid tasks...\n`);

        batch = db.batch();
        let batchCount = 1;
        let uploadCount = 0;
        const batchSize = 100;

        for (const row of rows) {
          const convertedDate = convertAndFixDate(row.date);
          if (!convertedDate) {
            console.warn(`  Skipping invalid date: ${row.date}`);
            continue;
          }

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
            originalDate: row.date,
            migratedFrom: 'sqlite',
          };

          const docRef = tasksRef.doc(`task_${row.id}`);
          batch.set(docRef, taskData);
          uploadCount++;

          if (uploadCount % batchSize === 0) {
            await batch.commit();
            console.log(`  ✅ Batch ${batchCount} complete (${uploadCount} tasks)`);
            batch = db.batch();
            batchCount++;
          }
        }

        // Commit remaining
        if (uploadCount % batchSize !== 0) {
          await batch.commit();
          console.log(`  ✅ Final batch complete (${uploadCount} tasks)\n`);
        }

        // Verify
        const finalSnapshot = await tasksRef.get();
        console.log(`✔️ Verification: ${finalSnapshot.size} tasks in Firestore\n`);

        // Show date distribution
        const monthMap = {};
        finalSnapshot.docs.forEach((doc) => {
          const date = doc.data().date;
          const month = date.split('-')[1];
          if (!monthMap[month]) monthMap[month] = 0;
          monthMap[month]++;
        });

        console.log(`📅 Tasks by month:`);
        Object.keys(monthMap)
          .sort()
          .forEach((month) => {
            const monthName = new Date(2025, parseInt(month) - 1).toLocaleString('en-US', {
              month: 'short',
            });
            console.log(`  ${monthName}: ${monthMap[month]} tasks`);
          });

        console.log(`\n✅ Migration complete!`);
        sqlite.close();
        resolve();
      }
    );
  });
}

console.log('╔══════════════════════════════════════════════════╗');
console.log('║  Migration with Date Validation & Correction   ║');
console.log('╚══════════════════════════════════════════════════╝\n');

migrateWithValidation().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
