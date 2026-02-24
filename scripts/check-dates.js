#!/usr/bin/env node

const admin = require('firebase-admin');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Error: GOOGLE_APPLICATION_CREDENTIALS not set');
  process.exit(1);
}

admin.initializeApp();
const db = admin.firestore();

async function checkDates() {
  const uid = '0iNaxUNxiXSPEON5QiweUexWVWv1';
  const tasksRef = db.collection('users').doc(uid).collection('tasks');
  
  const snapshot = await tasksRef.get();
  
  const monthMap = {};
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const date = data.date;
    const parts = date.split('-');
    const month = parts[1];
    
    if (!monthMap[month]) {
      monthMap[month] = [];
    }
    monthMap[month].push(date);
  });
  
  console.log('\nStored dates in Firestore by month:');
  console.log('===================================\n');
  
  Object.keys(monthMap).sort().forEach(month => {
    const count = monthMap[month].length;
    const sample = monthMap[month][0];
    const monthName = new Date(2025, parseInt(month) - 1).toLocaleString('en-US', { month: 'long' });
    console.log(`  Month ${month} (${monthName}): ${count} tasks`);
    console.log(`    Sample: ${sample}`);
  });
  
  process.exit(0);
}

checkDates().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
