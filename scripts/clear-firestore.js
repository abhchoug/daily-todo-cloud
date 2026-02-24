#!/usr/bin/env node

const admin = require('firebase-admin');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('❌ Error: GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
  process.exit(1);
}

admin.initializeApp();
const db = admin.firestore();

const uid = '0iNaxUNxiXSPEON5QiweUexWVWv1';

async function clearOldTasks() {
  console.log('🗑️  Deleting old tasks from Firestore...\n');

  try {
    const tasksRef = db.collection('users').doc(uid).collection('tasks');
    const snapshot = await tasksRef.get();

    console.log(`📊 Found ${snapshot.size} tasks to delete\n`);

    if (snapshot.size === 0) {
      console.log('✅ No tasks to delete');
      return;
    }

    let deleted = 0;
    const batchSize = 100;
    let batch = db.batch();

    snapshot.docs.forEach((doc, index) => {
      batch.delete(doc.ref);
      deleted++;

      // Commit batch every 100 documents
      if (deleted % batchSize === 0) {
        console.log(`  Deleting batch: ${deleted}/${snapshot.size}`);
      }

      if (deleted % batchSize === 0 && deleted < snapshot.size) {
        batch.commit();
        batch = db.batch();
      }
    });

    if (deleted % batchSize !== 0) {
      await batch.commit();
    }

    console.log(`\n✅ Deleted ${deleted} old tasks`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

clearOldTasks().then(() => {
  console.log('\n✨ Ready for new migration!');
  process.exit(0);
});
