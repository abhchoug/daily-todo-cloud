// Firebase Configuration
// Replace these values with your Firebase project credentials
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get references to services
const auth = firebase.auth();
const db = firebase.firestore();

// (Optional) Enable Firestore/Auth Emulators for local development
// Uncomment these lines to use emulators when testing locally
/*
if (location.hostname === 'localhost') {
  try {
    db.useEmulator('localhost', 8080);
    auth.useEmulator('http://localhost:9099', { disableWarnings: true });
  } catch (e) {
    // Already set up
  }
}
*/

// API base URL for Cloud Functions
// Update this after deploying Cloud Functions
const API_BASE_URL = "https://us-central1-your-project.cloudfunctions.net/api";
