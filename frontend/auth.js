// Authentication Module

// DOM Elements
const authContainer = document.getElementById('authContainer');
const appContainer = document.getElementById('appContainer');
const logoutBtn = document.getElementById('logoutBtn');
const userNameDisplay = document.getElementById('userName');

// Form elements
const emailForm = document.getElementById('emailForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const googleBtn = document.getElementById('googleBtn');
const githubBtn = document.getElementById('githubBtn');

/**
 * Show notification to user
 */
function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.classList.remove('hidden');
  
  setTimeout(() => {
    notification.classList.add('hidden');
  }, 3000);
}

/**
 * Show/hide loading indicator
 */
function setLoading(isLoading) {
  const indicator = document.getElementById('loadingIndicator');
  if (isLoading) {
    indicator.classList.remove('hidden');
  } else {
    indicator.classList.add('hidden');
  }
}

/**
 * Display auth screen or app screen
 */
function displayAuth() {
  authContainer.classList.remove('hidden');
  appContainer.classList.add('hidden');
}

function displayApp(user) {
  authContainer.classList.add('hidden');
  appContainer.classList.remove('hidden');
  userNameDisplay.textContent = user.displayName || user.email;
}

/**
 * Email/Password Sign In or Sign Up
 */
emailForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  
  if (!email || !password) {
    showNotification('Please fill in all fields', 'error');
    return;
  }
  
  setLoading(true);
  
  try {
    // Try to sign in first
    try {
      await auth.signInWithEmailAndPassword(email, password);
      showNotification('Signed in successfully!', 'success');
    } catch (signInError) {
      // If sign in fails, try to create account
      if (signInError.code === 'auth/user-not-found') {
        await auth.createUserWithEmailAndPassword(email, password);
        showNotification('Account created! Welcome!', 'success');
      } else {
        throw signInError;
      }
    }
  } catch (error) {
    console.error('Auth error:', error);
    
    let message = 'An error occurred. Please try again.';
    if (error.code === 'auth/invalid-email') {
      message = 'Invalid email address';
    } else if (error.code === 'auth/weak-password') {
      message = 'Password must be at least 6 characters';
    } else if (error.code === 'auth/email-already-in-use') {
      message = 'Email already in use. Please sign in.';
    } else if (error.code === 'auth/wrong-password') {
      message = 'Incorrect password. Try again.';
    }
    
    showNotification(message, 'error');
  } finally {
    setLoading(false);
  }
});

/**
 * Google Sign-In
 */
googleBtn.addEventListener('click', async () => {
  setLoading(true);
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
    showNotification('Signed in with Google!', 'success');
  } catch (error) {
    console.error('Google sign-in error:', error);
    showNotification('Google sign-in failed. Please try again.', 'error');
  } finally {
    setLoading(false);
  }
});

/**
 * GitHub Sign-In
 */
githubBtn.addEventListener('click', async () => {
  setLoading(true);
  try {
    const provider = new firebase.auth.GithubAuthProvider();
    await auth.signInWithPopup(provider);
    showNotification('Signed in with GitHub!', 'success');
  } catch (error) {
    console.error('GitHub sign-in error:', error);
    showNotification('GitHub sign-in failed. Please try again.', 'error');
  } finally {
    setLoading(false);
  }
});

/**
 * Logout
 */
logoutBtn.addEventListener('click', async () => {
  try {
    await auth.signOut();
    emailForm.reset();
    emailInput.focus();
    showNotification('Logged out successfully', 'success');
  } catch (error) {
    console.error('Logout error:', error);
    showNotification('Logout failed. Please try again.', 'error');
  }
});

/**
 * Monitor auth state changes
 */
auth.onAuthStateChanged((user) => {
  if (user) {
    // User is signed in
    displayApp(user);
    
    // Initialize app functionality with user
    if (typeof initializeApp === 'function') {
      initializeApp(user);
    }
  } else {
    // User is signed out
    displayAuth();
  }
});

// Clear sensitive fields on page load
window.addEventListener('load', () => {
  emailInput.value = '';
  passwordInput.value = '';
  emailInput.focus();
});
