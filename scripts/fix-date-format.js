#!/usr/bin/env node

const admin = require('firebase-admin');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('❌ Error: GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
  process.exit(1);
}

admin.initializeApp();
const db = admin.firestore();

const uid = '0iNaxUNxiXSPEON5QiweUexWVWv1';

function convertDateFormat(oldFormat) {
  // Convert D-M-YYYY to YYYY-MM-DD
  const parts = oldFormat.split('-');
  
  if (parts.length === 3) {
    const day = parts[0];
    const month = parts[1];
    const year = parts[2];
    
    // Check if already in correct format (YYYY-MM-DD)
    if (parts[0].length === 4) {
      return oldFormat; // Already correct
    }
    
    // Convert D-M-YYYY to YYYY-MM-DD
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  
  return oldFormat;
}

async function fixDateFormats() {
  console.log('🔄 Converting date formats from D-M-YYYY to YYYY-MM-DD...\n');

  try {
    const tasksRef = db.collection('users').doc(uid).collection('tasks');
    const snapshot = await tasksRef.get();

    console.log(`📊 Found ${snapshot.size} tasks to process\n`);

    const batch = db.batch();
    let updated = 0;
    let skipped = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const oldDate = data.date;
      const newDate = convertDateFormat(oldDate);

      if (oldDate !== newDate) {
        console.log(`  ${oldDate} → ${newDate}`);
        batch.update(doc.ref, { date: newDate });
        updated++;
      } else {
        skipped++;
      }
    });

    if (updated > 0) {
      await batch.commit();
      console.log(`\n✅ Updated ${updated} tasks`);
    }
    
    console.log(`⏭️  Already correct: ${skipped} tasks`);
    console.log('\n✅ All dates normalized to YYYY-MM-DD format!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixDateFormats();
