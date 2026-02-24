#!/usr/bin/env node

const admin = require('firebase-admin');
const sqlite3 = require('sqlite3').verbose();

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Error: GOOGLE_APPLICATION_CREDENTIALS not set');
  process.exit(1);
}

const dbPath = '/Users/abhchoug/work/Daily ToDo /data/tasks.db';
const userId = '0iNaxUNxiXSPEON5QiweUexWVWv1';

admin.initializeApp();
const db = admin.firestore();

/**
 * Convert SQLite date (D-M-YYYY, 0-indexed month) to ISO (YYYY-MM-DD, 1-indexed month)
 * 
 * SQLite: 24-1-2026 means Feb 24, 2026 (month 1 = February, 0-indexed)
 * ISO:    2026-02-24 means Feb 24, 2026 (month 02 = February, 1-indexed)
 * 
 * So we add +1 to the month during conversion.
 */
function convertDate(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0]);
  const month0 = parseInt(parts[1]); // 0-indexed: 0=Jan, 1=Feb, ..., 11=Dec
  const year = parseInt(parts[2]);

  const month1 = month0 + 1; // Convert to 1-indexed: 1=Jan, 2=Feb, ..., 12=Dec

  if (month1 < 1 || month1 > 12 || day < 1 || day > 31) {
    console.warn('  Invalid date after conversion: ' + dateStr + ' -> month=' + month1 + ', day=' + day);
    return null;
  }

  return year + '-' + String(month1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

async function migrate() {
  return new Promise(function(resolve, reject) {
    var sqlite = new sqlite3.Database(dbPath, function(err) {
      if (err) { reject(err); return; }
      console.log('Connected to SQLite database\n');
    });

    sqlite.all(
      'SELECT id, date, text, checked, created_at, updated_at FROM tasks ORDER BY date, id',
      async function(err, rows) {
        if (err) { sqlite.close(); reject(err); return; }

        console.log('Found ' + rows.length + ' tasks\n');

        // Show conversion examples
        console.log('Date conversion examples:');
        var seen = {};
        var sampleCount = 0;
        for (var i = 0; i < rows.length && sampleCount < 8; i++) {
          if (!seen[rows[i].date]) {
            seen[rows[i].date] = true;
            console.log('   ' + rows[i].date + ' (0-indexed) -> ' + convertDate(rows[i].date) + ' (1-indexed ISO)');
            sampleCount++;
          }
        }
        console.log('');

        // Clear existing tasks
        console.log('Clearing old tasks...');
        var tasksRef = db.collection('users').doc(userId).collection('tasks');
        var snapshot = await tasksRef.get();

        if (snapshot.size > 0) {
          var delBatch = db.batch();
          var delCount = 0;
          for (var j = 0; j < snapshot.docs.length; j++) {
            delBatch.delete(snapshot.docs[j].ref);
            delCount++;
            if (delCount % 100 === 0) {
              await delBatch.commit();
              delBatch = db.batch();
            }
          }
          if (delCount % 100 !== 0) await delBatch.commit();
          console.log('   Cleared ' + delCount + ' old tasks\n');
        }

        // Migrate with correct date conversion
        console.log('Uploading tasks with corrected dates...\n');

        var batch = db.batch();
        var uploaded = 0;
        var skipped = 0;

        for (var k = 0; k < rows.length; k++) {
          var row = rows[k];
          var isoDate = convertDate(row.date);
          if (!isoDate) { skipped++; continue; }

          var docRef = tasksRef.doc('task_' + row.id);
          batch.set(docRef, {
            date: isoDate,
            text: row.text || '',
            checked: !!row.checked,
            createdAt: admin.firestore.Timestamp.fromMillis(
              row.created_at ? new Date(row.created_at).getTime() : Date.now()
            ),
            updatedAt: admin.firestore.Timestamp.fromMillis(
              row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
            ),
            migratedFrom: 'sqlite',
          });
          uploaded++;

          if (uploaded % 100 === 0) {
            await batch.commit();
            console.log('   Batch complete (' + uploaded + '/' + rows.length + ')');
            batch = db.batch();
          }
        }

        if (uploaded % 100 !== 0) {
          await batch.commit();
          console.log('   Final batch (' + uploaded + '/' + rows.length + ')\n');
        }

        if (skipped > 0) console.log('   Skipped ' + skipped + ' invalid dates\n');

        // Verify
        var finalSnapshot = await tasksRef.get();
        var monthMap = {};
        for (var m = 0; m < finalSnapshot.docs.length; m++) {
          var ym = finalSnapshot.docs[m].data().date.substring(0, 7);
          monthMap[ym] = (monthMap[ym] || 0) + 1;
        }

        console.log(finalSnapshot.size + ' tasks in Firestore\n');
        console.log('Tasks by month:');
        Object.keys(monthMap).sort().forEach(function(key) {
          console.log('   ' + key + ': ' + monthMap[key] + ' tasks');
        });

        console.log('\nMigration complete!');
        sqlite.close();
        resolve();
      }
    );
  });
}

console.log('=== Final Migration: 0-indexed -> 1-indexed months ===\n');

migrate().catch(function(err) {
  console.error('Failed:', err.message);
  process.exit(1);
});
