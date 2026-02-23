# API Documentation

Complete documentation for Daily ToDo Cloud Functions API.

## Base URL

```
https://us-central1-{PROJECT_ID}.cloudfunctions.net/api
```

Example:
```
https://us-central1-daily-todo-cloud.cloudfunctions.net/api
```

## Authentication

All endpoints require Firebase ID token in Authorization header:

```javascript
const token = await firebase.auth().currentUser.getIdToken();
const response = await fetch(`${API_BASE}/tasks`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## Response Format

### Success Response (2xx)

```json
{
  "data": { /* endpoint-specific data */ },
  "message": "Operation successful"
}
```

### Error Response (4xx, 5xx)

```json
{
  "error": "Error message explaining what went wrong",
  "code": "ERROR_CODE"
}
```

## Rate Limiting

- **Limit**: 100 requests per minute per user
- **Response**: 429 Too Many Requests
- **Retry-After**: Seconds to wait before retrying

## Endpoints

### 1. Get All Tasks

**GET** `/tasks`

Retrieve all tasks for the authenticated user.

**Request:**
```bash
curl -H "Authorization: Bearer {token}" \
  https://us-central1-daily-todo-cloud.cloudfunctions.net/api/tasks
```

**Response (200 OK):**
```json
{
  "2025-02-23": [
    {
      "id": "task-uuid-1",
      "date": "2025-02-23",
      "text": "Buy groceries",
      "checked": false,
      "createdAt": "2025-02-23T10:30:00Z",
      "updatedAt": "2025-02-23T10:30:00Z"
    },
    {
      "id": "task-uuid-2",
      "date": "2025-02-23",
      "text": "Call mom",
      "checked": true,
      "createdAt": "2025-02-22T14:15:00Z",
      "updatedAt": "2025-02-23T09:00:00Z"
    }
  ],
  "2025-02-22": [
    {
      "id": "task-uuid-3",
      "date": "2025-02-22",
      "text": "Finish project",
      "checked": false,
      "createdAt": "2025-02-21T16:45:00Z",
      "updatedAt": "2025-02-21T16:45:00Z"
    }
  ]
}
```

**Errors:**
- `401 Unauthorized` - Invalid or missing token
- `500 Internal Server Error` - Server error

---

### 2. Get Tasks by Month

**GET** `/tasks/month/:year/:month`

Retrieve tasks for a specific month.

**Parameters:**
- `year` (integer): Full year (e.g., 2025)
- `month` (integer): Month number 1-12 (e.g., 2 for February)

**Request:**
```bash
# Get all February 2025 tasks
curl -H "Authorization: Bearer {token}" \
  https://us-central1-daily-todo-cloud.cloudfunctions.net/api/tasks/month/2025/2
```

**Response (200 OK):**
```json
{
  "2025-02-01": [
    {
      "id": "task-uuid-4",
      "date": "2025-02-01",
      "text": "New month tasks start",
      "checked": false,
      "createdAt": "2025-02-01T00:00:00Z",
      "updatedAt": "2025-02-01T00:00:00Z"
    }
  ],
  "2025-02-23": [
    // ... other tasks
  ]
}
```

**Errors:**
- `400 Bad Request` - Invalid year/month
- `401 Unauthorized` - Invalid token
- `500 Internal Server Error` - Server error

---

### 3. Create Task

**POST** `/tasks`

Create a new task.

**Request Body:**
```json
{
  "date": "2025-02-23",
  "text": "Task description",
  "checked": false
}
```

**Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-02-23",
    "text": "Buy groceries",
    "checked": false
  }' \
  https://us-central1-daily-todo-cloud.cloudfunctions.net/api/tasks
```

**Response (201 Created):**
```json
{
  "id": "task-uuid-5",
  "date": "2025-02-23",
  "text": "Buy groceries",
  "checked": false,
  "createdAt": "2025-02-23T10:30:00Z",
  "updatedAt": "2025-02-23T10:30:00Z"
}
```

**Request Parameters:**
- `date` (required, string): Date in format YYYY-MM-DD
- `text` (required, string): Task description (1-500 chars)
- `checked` (optional, boolean): Default false

**Errors:**
- `400 Bad Request` - Missing or invalid fields
- `401 Unauthorized` - Invalid token
- `500 Internal Server Error` - Server error

---

### 4. Update Task

**PUT** `/tasks/:taskId`

Update an existing task.

**Parameters:**
- `taskId` (string, in URL): Task identifier

**Request Body:**
```json
{
  "text": "Updated task description",
  "checked": true
}
```

**Request:**
```bash
curl -X PUT \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Updated: Buy groceries and cook",
    "checked": false
  }' \
  https://us-central1-daily-todo-cloud.cloudfunctions.net/api/tasks/task-uuid-5
```

**Response (200 OK):**
```json
{
  "id": "task-uuid-5",
  "date": "2025-02-23",
  "text": "Updated: Buy groceries and cook",
  "checked": false,
  "updatedAt": "2025-02-23T10:35:00Z"
}
```

**Request Body Fields (all optional):**
- `text` - New task description
- `checked` - New completion status
- `date` - New date (to move task to different date)

**Errors:**
- `400 Bad Request` - Invalid data
- `401 Unauthorized` - Invalid token
- `404 Not Found` - Task doesn't exist
- `500 Internal Server Error` - Server error

---

### 5. Delete Task

**DELETE** `/tasks/:taskId`

Delete a task.

**Parameters:**
- `taskId` (string, in URL): Task identifier

**Request:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer {token}" \
  https://us-central1-daily-todo-cloud.cloudfunctions.net/api/tasks/task-uuid-5
```

**Response (200 OK):**
```json
{
  "id": "task-uuid-5",
  "deleted": true
}
```

**Errors:**
- `401 Unauthorized` - Invalid token
- `404 Not Found` - Task doesn't exist
- `500 Internal Server Error` - Server error

---

### 6. Batch Save Tasks

**POST** `/tasks/batch-save`

Save multiple tasks in a single request (useful for offline sync).

**Request Body:**
```json
{
  "tasks": [
    {
      "date": "2025-02-23",
      "text": "New task 1",
      "checked": false
    },
    {
      "id": "task-uuid-6",
      "text": "Updated existing task",
      "checked": true
    }
  ]
}
```

**Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {
        "date": "2025-02-23",
        "text": "Task 1",
        "checked": false
      },
      {
        "id": "task-uuid-6",
        "text": "Updated Task 2",
        "checked": true
      }
    ]
  }' \
  https://us-central1-daily-todo-cloud.cloudfunctions.net/api/tasks/batch-save
```

**Response (200 OK):**
```json
{
  "saved": 2,
  "results": [
    {
      "id": "task-uuid-7"
    },
    {
      "id": "task-uuid-6"
    }
  ]
}
```

**Notes:**
- Tasks without `id` are created as new
- Tasks with `id` are updated
- Max 500 tasks per request
- All operations atomic (all succeed or all fail)

**Errors:**
- `400 Bad Request` - Invalid task data
- `401 Unauthorized` - Invalid token
- `500 Internal Server Error` - Server error

---

### 7. Health Check

**GET** `/`

Check if API is running.

**Request:**
```bash
curl https://us-central1-daily-todo-cloud.cloudfunctions.net/api
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "message": "Daily ToDo Cloud Functions API"
}
```

---

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `UNAUTHORIZED` | 401 | Invalid or missing authentication token |
| `FORBIDDEN` | 403 | User doesn't have permission to access resource |
| `NOT_FOUND` | 404 | Task or resource doesn't exist |
| `BAD_REQUEST` | 400 | Invalid request parameters |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests, retry later |
| `INTERNAL_ERROR` | 500 | Server error (we're looking into it!) |

---

## Client Libraries

### JavaScript/TypeScript

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

// Sign in
const user = await signInWithEmailAndPassword(auth, email, password);

// Get token
const token = await user.user.getIdToken();

// Call API
const response = await fetch(`${API_BASE}/tasks`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const tasks = await response.json();
```

### React Hook Example

```javascript
import { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';

function TaskList() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      const token = await user.getIdToken();
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/tasks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setTasks(data);
      setLoading(false);
    }

    if (user) loadTasks();
  }, [user]);

  if (loading) return <p>Loading...</p>;
  
  return (
    <div>
      {Object.entries(tasks).map(([date, taskList]) => (
        <div key={date}>
          <h3>{date}</h3>
          {taskList.map(task => (
            <div key={task.id}>{task.text}</div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

---

## Testing with cURL

### Setup

```bash
# Set variables
API_BASE="https://us-central1-your-project.cloudfunctions.net/api"
TOKEN="your-firebase-id-token"
```

### Test All Endpoints

```bash
# Create task
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date": "2025-02-23", "text": "Test task"}' \
  $API_BASE/tasks

# Get all tasks
curl -H "Authorization: Bearer $TOKEN" $API_BASE/tasks

# Get month tasks
curl -H "Authorization: Bearer $TOKEN" $API_BASE/tasks/month/2025/2
```

---

## Changelog

### Version 1.0.0 (Current)
- ✅ CRUD operations for tasks
- ✅ User authentication
- ✅ Batch operations
- ✅ Rate limiting

### Planned Features
- 🔄 Task categories
- 🔄 Due date reminders
- 🔄 Task sharing
- 🔄 Archive/delete permanently
- 🔄 Search functionality
- 🔄 Statistics endpoint

---

**Need help?** Check the [Setup Guide](SETUP.md) or open an issue on GitHub.
