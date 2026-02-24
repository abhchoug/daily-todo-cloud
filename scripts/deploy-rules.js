#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('❌ Error: GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
  process.exit(1);
}

admin.initializeApp();

const rulesPath = '/Users/abhchoug/daily-todo-cloud/firestore.rules';
const rules = fs.readFileSync(rulesPath, 'utf8');

async function deployRules() {
  try {
    console.log('📋 Deploying Firestore rules...\n');
    
    // Need to use the REST API to deploy rules
    const projectId = 'daily-todo-cloud';
    const rulesContent = rules;
    
    // For now, just log what would be deployed
    console.log('Rules to deploy:');
    console.log('================');
    console.log(rulesContent);
    console.log('================\n');
    
    // Use the Firestore REST API
    const db = admin.firestore();
    
    // Get the default database
    const databases = await db.listCollections();
    console.log('✅ Connected to Firestore');
    console.log('📍 Project: ' + projectId);
    console.log('\n⚠️  Please deploy rules manually via Firebase Console:');
    console.log('1. Go to: https://console.firebase.google.com/project/' + projectId + '/firestore/rules');
    console.log('2. Paste the new rules above');
    console.log('3. Click "Publish"');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deployRules();
