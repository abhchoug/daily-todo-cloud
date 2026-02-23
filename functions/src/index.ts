import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Create Express app
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// ==================== AUTHENTICATION MIDDLEWARE ====================

/**
 * Verify Firebase ID token and attach user info to request
 */
app.use(async (req, res, next) => {
  const authToken = req.headers.authorization?.split('Bearer ')[1];
  
  if (!authToken) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(authToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
});

// ==================== TASK ENDPOINTS ====================

/**
 * GET /tasks - Get all user tasks
 */
app.get('/tasks', async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await admin
      .firestore()
      .collection('users')
      .doc(userId)
      .collection('tasks')
      .orderBy('date', 'desc')
      .get();
    
    const tasks = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      const dateKey = data.date;
      if (!tasks[dateKey]) {
        tasks[dateKey] = [];
      }
      tasks[dateKey].push({
        id: doc.id,
        ...data,
      });
    });
    
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

/**
 * GET /tasks/month/:year/:month - Get tasks for specific month
 */
app.get('/tasks/month/:year/:month', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { year, month } = req.params;
    const monthStr = String(month).padStart(2, '0');
    
    // Query tasks that start with YYYY-MM
    const datePrefix = `${year}-${monthStr}`;
    
    const snapshot = await admin
      .firestore()
      .collection('users')
      .doc(userId)
      .collection('tasks')
      .where('date', '>=', datePrefix)
      .where('date', '<', String(Number(datePrefix) + 1))
      .orderBy('date', 'desc')
      .get();
    
    const tasks = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      const dateKey = data.date;
      if (!tasks[dateKey]) {
        tasks[dateKey] = [];
      }
      tasks[dateKey].push({
        id: doc.id,
        ...data,
      });
    });
    
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching monthly tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

/**
 * POST /tasks - Create new task
 */
app.post('/tasks', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { date, text, checked } = req.body;
    
    if (!date || !text) {
      return res.status(400).json({ error: 'Missing required fields: date, text' });
    }
    
    const taskRef = admin
      .firestore()
      .collection('users')
      .doc(userId)
      .collection('tasks')
      .doc();
    
    const now = admin.firestore.Timestamp.now();
    
    await taskRef.set({
      date,
      text,
      checked: checked || false,
      createdAt: now,
      updatedAt: now,
    });
    
    res.json({ id: taskRef.id, date, text, checked: checked || false });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

/**
 * PUT /tasks/:taskId - Update task
 */
app.put('/tasks/:taskId', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { taskId } = req.params;
    const { text, checked, date } = req.body;
    
    const taskRef = admin
      .firestore()
      .collection('users')
      .doc(userId)
      .collection('tasks')
      .doc(taskId);
    
    const updateData = {
      updatedAt: admin.firestore.Timestamp.now(),
    };
    
    if (text !== undefined) updateData.text = text;
    if (checked !== undefined) updateData.checked = checked;
    if (date !== undefined) updateData.date = date;
    
    await taskRef.update(updateData);
    
    res.json({ id: taskId, ...updateData });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

/**
 * DELETE /tasks/:taskId - Delete task
 */
app.delete('/tasks/:taskId', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { taskId } = req.params;
    
    await admin
      .firestore()
      .collection('users')
      .doc(userId)
      .collection('tasks')
      .doc(taskId)
      .delete();
    
    res.json({ id: taskId, deleted: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

/**
 * POST /tasks/batch-save - Save multiple tasks at once
 */
app.post('/tasks/batch-save', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { tasks } = req.body;
    
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: 'Expected tasks array' });
    }
    
    const batch = admin.firestore().batch();
    const results = [];
    const now = admin.firestore.Timestamp.now();
    
    tasks.forEach(task => {
      if (task.id) {
        // Update existing
        const ref = admin
          .firestore()
          .collection('users')
          .doc(userId)
          .collection('tasks')
          .doc(task.id);
        
        batch.update(ref, {
          ...task,
          updatedAt: now,
        });
      } else {
        // Create new
        const ref = admin
          .firestore()
          .collection('users')
          .doc(userId)
          .collection('tasks')
          .doc();
        
        batch.set(ref, {
          date: task.date,
          text: task.text,
          checked: task.checked || false,
          createdAt: now,
          updatedAt: now,
        });
        
        results.push({ id: ref.id });
      }
    });
    
    await batch.commit();
    res.json({ saved: tasks.length, results });
  } catch (error) {
    console.error('Error batch saving tasks:', error);
    res.status(500).json({ error: 'Failed to save tasks' });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Daily ToDo Cloud Functions API' });
});

// ==================== ERROR HANDLER ====================

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ==================== EXPORT FUNCTION ====================

export const api = functions
  .region('us-central1')
  .https.onRequest(app);
