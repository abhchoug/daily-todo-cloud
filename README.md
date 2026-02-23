# Daily ToDo - Cloud Edition

A modern, cloud-native task management application using Firebase (Cloud Firestore), Cloud Functions, and GitHub Pages.

## Features

- 🔐 **User Authentication** - Email, Google, and GitHub sign-in
- ☁️ **Cloud Database** - Firestore for scalable, real-time data
- 🚀 **Serverless Backend** - Cloud Functions (no server management)
- 🌐 **GitHub Pages Hosting** - Free, fast static hosting
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🔒 **Data Privacy** - User-specific data isolation with security rules
- 💾 **Offline Support** - Works offline with automatic sync
- 📊 **Task Statistics** - View monthly and yearly statistics

## Architecture

```
┌─────────────────┐
│  GitHub Pages   │  Frontend (HTML/CSS/JS + Firebase SDK)
│   (Frontend)    │
└────────┬────────┘
         │
         │ HTTPS API Calls
         │
┌────────▼────────┐
│  Cloud Functions│  Node.js Functions (Auth, CRUD, Sync)
│  (Backend API)  │
└────────┬────────┘
         │
         │ Firestore SDK
         │
┌────────▼────────┐
│  Cloud Firestore│  User-specific collections
│   (Database)    │  with security rules
└─────────────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+ 
- Firebase CLI (`npm install -g firebase-tools`)
- Git

### Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/abhchoug/daily-todo-cloud.git
   cd daily-todo-cloud
   ```

2. **Set up Firebase project**
   ```bash
   firebase init
   firebase login
   ```

3. **Deploy Cloud Functions**
   ```bash
   cd functions
   npm install
   firebase deploy --only functions
   ```

4. **Deploy Frontend**
   ```bash
   cd frontend
   npm install
   npm run build
   firebase deploy --only hosting
   ```

5. **Open in browser**
   - Visit `https://your-project.github.io`

## Project Structure

```
daily-todo-cloud/
├── frontend/                   # Static hosting (GitHub Pages)
│   ├── index.html             # Main app
│   ├── styles.css             # Styling
│   ├── app.js                 # Task management logic
│   ├── auth.js                # Authentication
│   └── assets/                # Images, icons
├── functions/                  # Cloud Functions (Node.js)
│   ├── src/
│   │   ├── index.js           # Entry point
│   │   ├── auth.js            # Auth middleware
│   │   ├── tasks.js           # Task handlers
│   │   ├── validation.js      # Input validation
│   │   └── utils.js           # Helper functions
│   ├── package.json
│   └── .firebaserc
├── scripts/
│   ├── migrate-data.js        # SQLite → Firestore migration
│   └── backup.js              # Backup utilities
├── docs/
│   ├── SETUP.md               # Detailed setup guide
│   ├── MIGRATION.md           # Data migration guide
│   ├── SECURITY.md            # Security rules & best practices
│   ├── API.md                 # API endpoint documentation
│   └── ARCHITECTURE.md        # Architecture details
├── .github/
│   └── workflows/
│       └── deploy.yml         # GitHub Actions CI/CD
├── firebase.json              # Firebase configuration
├── .gitignore
└── README.md
```

## Documentation

- [Setup Guide](docs/SETUP.md) - Detailed Firebase & development setup
- [Migration Guide](docs/MIGRATION.md) - Migrate data from SQLite to Firestore
- [Security](docs/SECURITY.md) - Firestore rules and security practices
- [API Documentation](docs/API.md) - Cloud Functions API endpoints
- [Architecture](docs/ARCHITECTURE.md) - System design details

## Development

### Local Development with Emulator

```bash
firebase emulators:start
```

This starts:
- Firestore Emulator (port 8080)
- Authentication Emulator (port 9099)
- Cloud Functions Emulator

### Testing

```bash
cd functions
npm test
```

### Deploying

**Cloud Functions:**
```bash
firebase deploy --only functions
```

**Frontend:**
```bash
git push origin main  # Triggers GitHub Actions → GitHub Pages
```

**Both:**
```bash
firebase deploy
```

## API Endpoints

All endpoints require Firebase authentication token.

### Tasks
- `GET /tasks` - Get all user tasks
- `GET /tasks/month/:year/:month` - Get tasks for specific month
- `POST /tasks` - Create new task
- `PUT /tasks/:taskId` - Update task
- `DELETE /tasks/:taskId` - Delete task
- `POST /tasks/batch-save` - Save multiple tasks

### Authentication
- `POST /auth/register` - Create account
- `POST /auth/login` - User login
- `POST /logout` - User logout

See [API.md](docs/API.md) for full documentation.

## Security

- 🔒 Firestore security rules enforce user-specific data access
- 🚨 Cloud Functions validate all requests
- 🔑 Firebase handles authentication securely
- 📝 Audit logging for compliance
- 🛡️ HTTPS enforced everywhere

See [SECURITY.md](docs/SECURITY.md) for details.

## Cost

**Free Tier (Generous):**
- 50K Firestore reads/day
- 20K Firestore writes/day
- 2M Cloud Functions invocations/month
- GitHub Pages: Unlimited free hosting

**Typical Cost (100 active users):** $5-15/month

See [SETUP.md](docs/SETUP.md) for cost breakdown.

## Support & Contribution

- Report issues on GitHub
- Submit pull requests for improvements
- Star ⭐ if you find this helpful!

## License

MIT - Feel free to use for personal and commercial projects

## Roadmap

- [ ] Real-time collaboration
- [ ] Task categories/tags
- [ ] Recurring tasks
- [ ] Calendar view
- [ ] Export to PDF
- [ ] Email notifications
- [ ] Mobile app (React Native)
- [ ] Dark mode

---

**Version:** 1.0.0 (Cloud Migration)  
**Last Updated:** February 2026
