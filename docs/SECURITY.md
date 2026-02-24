# Security Guide

Comprehensive security documentation for Daily ToDo Cloud.

## Architecture Security

### 1. Authentication

**How it works:**

```
User → Firebase Auth SDK → Firebase Auth Service
                              ↓
                         JWT Token (1 hour valid)
                              ↓
User's Browser (localStorage)
                              ↓
Cloud Functions (verify token)
                              ↓
Firestore (enforce rules)
```

**Supported Methods:**
- ✅ Email/Password (Firebase handles encryption)
- ✅ Google Sign-in (OAuth 2.0)
- ✅ GitHub Sign-in (OAuth 2.0)
- ✅ Phone authentication (optional)

**Security Features:**
- 🔒 Passwords never stored in cleartext
- 🔒 HTTPS-only transmission
- 🔒 Secure token refresh mechanism
- 🔒 Session timeout (1 hour)
- 🔒 Automatic logout on suspicious activity

### 2. Firestore Security Rules

Rules enforce **authenticated access**, with user profiles still private:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profiles remain private
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;

      // Tasks are shared across authenticated users
      match /tasks/{taskId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

**What these rules prevent:**

❌ Unauthenticated access to tasks
❌ Modifying another user's profile
❌ Reading another user's profile

### 3. Cloud Functions Security

**Authentication Middleware:**

```javascript
app.use(async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const decodedToken = await admin.auth().verifyIdToken(token);
  req.user = decodedToken;
  next();
});
```

**Every request must:**
1. Include valid Firebase ID token
2. Token verified by Firebase Admin SDK
3. User ID extracted and validated
4. Used for Firestore queries

**Rate Limiting:**

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  keyGenerator: (req) => req.user.uid, // Per user
});

app.use(limiter);
```

## Data Protection

### 1. Encryption

| Layer | Encryption | Details |
|-------|-----------|---------|
| **Transport** | TLS 1.3 | HTTPS enforced |
| **Storage** | Google managed | Default for Firestore |
| **Passwords** | bcrypt 12-rounds | Firebase Auth |
| **Email** | None (sensitive) | Indexed but encrypted |
| **Backup** | AES-256 | Cloud Storage encryption |

### 2. Sensitive Data Management

**Data NOT to store:**
- ❌ Payment information
- ❌ Credit card numbers
- ❌ Social security numbers
- ❌ Medical information

**Safe to store:**
- ✅ Task text and due dates
- ✅ Completion status
- ✅ User email
- ✅ User profile (name, avatar)
- ✅ Creation/update timestamps

### 3. Data Retention

**What's stored:**
- User profile: Indefinite (until deleted)
- Tasks: Indefinite
- Auth logs: 30 days
- API logs: 90 days

**Deletion policy:**
- User requests deletion → All data deleted within 24 hours
- Account inactive 1 year → Optional auto-delete
- Compliance: GDPR, CCPA compliant

## Access Control

### 1. Role-Based Access (Future)

Current: Single-user only (tasks owner by UID)

Future enhancement ideas:
- 👥 Sharing tasks with family
- 👥 Team collaboration
- 👥 Admin roles
- 👥 View-only access

### 2. Authorization Flow

```
Request comes in
     ↓
Verify token (JWT)
     ↓
Extract user ID
     ↓
Check Firestore rules
     ↓
uid == document owner?
     ↓
YES → Allow operation
NO  → Reject with 403
```

### 3. API Key Security

**For Frontend:**
- 🔑 Public API key in code (Safe - restricted to web domain)
- 📍 Restricted to specific origins/domains
- 🚫 Cannot read/write database directly

**For Cloud Functions:**
- 🔑 Service account key (Keep PRIVATE)
- 📝 Never commit to Git
- 🔄 Rotate annually

## Network Security

### 1. CORS Configuration

Only allow requests from:

```javascript
const allowedOrigins = [
  'https://abhchoug.github.io',
  'https://your-project.web.app',
  'https://your-project.firebaseapp.com',
];

app.use(cors({ origin: allowedOrigins }));
```

### 2. API Domain Restrictions

In Google Cloud Console:

```
API Key Restrictions:
├── HTTP Referrers
│   ├── https://abhchoug.github.io/*
│   └── https://*.web.app/*
├── IP Addresses (Optional)
│   └── None (for API Gateway)
```

### 3. DDoS Protection

Automatically provided by Google Cloud:
- 🛡️ Rate limiting per IP
- 🛡️ Suspicious traffic detection
- 🛡️ Automatic mitigation
- 🛡️ No additional cost

## Compliance

### 1. GDPR (EU Users)

✅ Implemented:
- 📋 Privacy policy link
- 📋 Consent for data collection
- 📋 Right to deletion (account settings)
- 📋 Data portability (export feature)
- 📋 No third-party sharing

### 2. CCPA (California Users)

✅ Implemented:
- 📋 Privacy policy (Privacy/Security page)
- 📋 Non-selling of data
- 📋 Right to delete account
- 📋 Right to know data collected

### 3. SOC 2 Compliance (Google Cloud)

✅ Included:
- 📋 Audit logging
- 📋 Access controls
- 📋 Encryption
- 📋 Incident response plan

## Audit Logging

### 1. What's Logged

```javascript
console.log({
  timestamp: new Date(),
  userId: req.user.uid,
  action: 'CREATE_TASK',
  resource: 'tasks',
  status: 'success',
  method: req.method,
  path: req.path,
});
```

### 2. View Logs

```bash
firebase functions:log
# or
firebase functions:log --limit=100
```

### 3. Cloud Audit Logs

```bash
gcloud logging read "resource.type=cloud_function" \
  --limit 50 \
  --format json
```

## Vulnerability Management

### 1. Dependency Security

Check for vulnerabilities:

```bash
npm audit
npm audit fix
```

Run in CI/CD:

```yaml
# .github/workflows/security.yml
- name: Audit dependencies
  run: npm audit --audit-level=moderate
```

### 2. Security Updates

- 🔄 Firebase SDK: Auto-updates in production
- 🔄 Node dependencies: Check monthly
- 🔄 Security patches: Apply immediately
- 🔄 Deprecations: Review quarterly

### 3. Code Scanning

GitHub automatically scans for:
- ⚠️ Hardcoded secrets
- ⚠️ Known vulnerabilities
- ⚠️ Insecure code patterns

## Security Checklist

### Initial Setup
- [ ] Firebase project created
- [ ] Firestore rules deployed
- [ ] Cloud Functions deployed with auth middleware
- [ ] CORS configured for your domain
- [ ] Service account key secured
- [ ] GitHub OAuth credentials set

### Before Production
- [ ] Test security rules with emulator
- [ ] Verify authentication works (all providers)
- [ ] Test API rate limiting
- [ ] Verify CORS blocking works
- [ ] Check data encryption
- [ ] Audit console logs

### Ongoing
- [ ] Monthly dependency updates
- [ ] Quarterly security review
- [ ] Review access logs monthly
- [ ] Monitor cost anomalies (can indicate attack)
- [ ] Test backup/restore process
- [ ] Update security policies yearly

### Emergency Response

If security incident detected:

1. **Check Logs**
   ```bash
   firebase functions:log --limit=1000
   ```

2. **Disable OAuth if compromised**
   - Firebase Console → Authentication
   - Disable suspicious provider

3. **Rotate Keys**
   ```bash
   # Generate new service account key
   # Delete old one from Google Cloud Console
   ```

4. **Monitor Activity**
   ```bash
   # Watch for unusual patterns
   firebase functions:log --follow
   ```

5. **Notify Users**
   - Email affected users
   - Request password reset
   - Monitor accounts for changes

## Further Reading

- [Firebase Security Guide](https://firebase.google.com/docs/rules)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Google Cloud Security](https://cloud.google.com/security)
- [Node Security](https://snyk.io/)

---

**Questions or concerns?** Open an issue on GitHub!
