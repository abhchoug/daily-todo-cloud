#!/usr/bin/env node

/**
 * Fix user ID mismatch after migration
 * Moves tasks from email-based path to UID-based path
 */

const admin = require('firebase-admin');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('❌ Error: GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
  process.exit(1);
}

admin.initializeApp();
const db = admin.firestore();

const email = 'abhijitchougule23@gmail.com';
const uid = '0iNaxUNxiXSPEON5QiweUexWVWv1';

async function fixUserPath() {
  console.log('🔄 Moving tasks from email path to UID path...\n');

  try {
    // Get all tasks from email path
    const oldPath = db.collection('users').doc(email).collection('tasks');
    const snapshot = await oldPath.get();

    console.log(`📊 Found ${snapshot.size} tasks to move`);

    if (snapshot.size === 0) {
      console.log('No tasks found at email path');
      process.exit(0);
    }

    // Copy to UID path
    const newPath = db.collection('users').doc(uid).collection('tasks');
    let count = 0;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      const newRef = newPath.doc(doc.id);
      batch.set(newRef, doc.data());
      count++;
    });

    await batch.commit();
    console.log(`✅ Moved ${count} tasks to UID path\n`);

    // Update user document under uid
    const userRef = db.collection('users').doc(uid);
    await userRef.set(
      {
        email: email,
        displayName: 'Migrated User',
        migratedAt: admin.firestore.Timestamp.now(),
      },
      { merge: true }
    );

    console.log('✅ User document updated!');
    console.log(`\n📍 Tasks are now at: users/${uid}/tasks/\n`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixUserPath();
