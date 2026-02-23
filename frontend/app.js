// Daily ToDo App - Main Logic

let currentDate = new Date();
let currentUser = null;
let allTasks = {};

// DOM Elements
const taskInput = document.getElementById('taskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const tasksList = document.getElementById('tasksList');
const dateDisplay = document.getElementById('dateDisplay');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const completedCount = document.getElementById('completedCount');

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date for display (e.g., "Monday, Feb 23")
 */
function formatDisplayDate(date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setTime(tomorrow.getTime() + 24 * 60 * 60 * 1000);
  
  if (formatDate(date) === formatDate(today)) {
    return 'Today';
  } else if (formatDate(date) === formatDate(yesterday)) {
    return 'Yesterday';
  } else if (formatDate(date) === formatDate(tomorrow)) {
    return 'Tomorrow';
  }
  
  const options = { weekday: 'long', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Get all tasks from Cloud Functions API
 */
async function fetchAllTasks() {
  try {
    const token = await currentUser.getIdToken();
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    allTasks = await response.json();
    renderTasks();
  } catch (error) {
    console.error('Error fetching tasks:', error);
    showNotification('Failed to load tasks. Please refresh.', 'error');
  }
}

/**
 * Render tasks for current date
 */
function renderTasks() {
  const dateKey = formatDate(currentDate);
  const dateTasks = allTasks[dateKey] || [];
  
  // Update date display
  dateDisplay.textContent = formatDisplayDate(currentDate);
  
  // Clear tasks list
  tasksList.innerHTML = '';
  
  if (dateTasks.length === 0) {
    tasksList.innerHTML = '<p class="empty-state">No tasks for this date. Add one to get started!</p>';
    completedCount.textContent = '0/0';
    return;
  }
  
  // Render tasks
  dateTasks.forEach(task => {
    const taskEl = createTaskElement(task);
    tasksList.appendChild(taskEl);
  });
  
  // Update stats
  const completed = dateTasks.filter(t => t.checked).length;
  completedCount.textContent = `${completed}/${dateTasks.length}`;
}

/**
 * Create task DOM element
 */
function createTaskElement(task) {
  const div = document.createElement('div');
  div.className = `task-item ${task.checked ? 'checked' : ''}`;
  div.dataset.taskId = task.id;
  
  div.innerHTML = `
    <input 
      type="checkbox" 
      class="task-checkbox" 
      ${task.checked ? 'checked' : ''}
    >
    <span class="task-text">${escapeHtml(task.text)}</span>
    <button class="task-delete" title="Delete task">✕</button>
  `;
  
  // Checkbox toggle
  const checkbox = div.querySelector('.task-checkbox');
  checkbox.addEventListener('change', async () => {
    await updateTask(task.id, { checked: checkbox.checked });
  });
  
  // Delete button
  const deleteBtn = div.querySelector('.task-delete');
  deleteBtn.addEventListener('click', async () => {
    if (confirm('Delete this task?')) {
      await deleteTask(task.id);
    }
  });
  
  return div;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Add new task
 */
async function addTask() {
  const text = taskInput.value.trim();
  
  if (!text) {
    showNotification('Please enter a task', 'error');
    return;
  }
  
  setLoading(true);
  
  try {
    const token = await currentUser.getIdToken();
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        date: formatDate(currentDate),
        text: text,
        checked: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const newTask = await response.json();
    
    // Add to local state
    const dateKey = formatDate(currentDate);
    if (!allTasks[dateKey]) {
      allTasks[dateKey] = [];
    }
    allTasks[dateKey].push(newTask);
    
    // Clear input and re-render
    taskInput.value = '';
    taskInput.focus();
    renderTasks();
    showNotification('Task added!', 'success');
  } catch (error) {
    console.error('Error adding task:', error);
    showNotification('Failed to add task', 'error');
  } finally {
    setLoading(false);
  }
}

/**
 * Update task
 */
async function updateTask(taskId, updates) {
  setLoading(true);
  
  try {
    const token = await currentUser.getIdToken();
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    await response.json();
    
    // Update local state
    const dateKey = formatDate(currentDate);
    const taskIndex = allTasks[dateKey]?.findIndex(t => t.id === taskId);
    if (taskIndex > -1) {
      Object.assign(allTasks[dateKey][taskIndex], updates);
    }
    
    renderTasks();
  } catch (error) {
    console.error('Error updating task:', error);
    showNotification('Failed to update task', 'error');
  } finally {
    setLoading(false);
  }
}

/**
 * Delete task
 */
async function deleteTask(taskId) {
  setLoading(true);
  
  try {
    const token = await currentUser.getIdToken();
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    // Remove from local state
    const dateKey = formatDate(currentDate);
    allTasks[dateKey] = allTasks[dateKey]?.filter(t => t.id !== taskId) || [];
    
    renderTasks();
    showNotification('Task deleted', 'success');
  } catch (error) {
    console.error('Error deleting task:', error);
    showNotification('Failed to delete task', 'error');
  } finally {
    setLoading(false);
  }
}

/**
 * Date navigation
 */
prevBtn.addEventListener('click', () => {
  currentDate.setDate(currentDate.getDate() - 1);
  renderTasks();
});

nextBtn.addEventListener('click', () => {
  currentDate.setDate(currentDate.getDate() + 1);
  renderTasks();
});

/**
 * Task input handling
 */
addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addTask();
  }
});

/**
 * Initialize app
 */
async function initializeApp(user) {
  currentUser = user;
  setLoading(true);
  
  try {
    await fetchAllTasks();
    taskInput.focus();
  } catch (error) {
    console.error('App initialization error:', error);
    showNotification('Failed to initialize app', 'error');
  } finally {
    setLoading(false);
  }
}
