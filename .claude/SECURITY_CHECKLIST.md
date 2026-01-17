# Security Checklist - CW Dashboard (Electron)

## Quick Scan (Every Commit)

Before every commit, verify:

- [ ] No hardcoded passwords, tokens, or API keys
- [ ] No `console.log` with sensitive data (URLs with credentials, tokens)
- [ ] SQL queries use parameterized statements (better-sqlite3 `?` placeholders)
- [ ] File paths validated before reading
- [ ] IPC inputs validated before use

## Electron Security Configuration

### Required Settings (main.ts)
```typescript
webPreferences: {
  preload: path.join(__dirname, 'preload.js'),
  contextIsolation: true,    // REQUIRED: Isolate renderer from Node
  nodeIntegration: false,    // REQUIRED: No Node.js in renderer
  sandbox: true,             // REQUIRED: OS-level sandboxing
}
```

### Window Security
```typescript
// Block new window creation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
});
```

### Navigation Security
```typescript
// Block navigation to external URLs
contents.on('will-navigate', (event, url) => {
  if (!url.startsWith('file://')) {
    event.preventDefault();
  }
});
```

## Code Security Patterns

### Never Use
```typescript
// NEVER: nodeIntegration enabled
nodeIntegration: true  // DANGEROUS

// NEVER: contextIsolation disabled
contextIsolation: false  // DANGEROUS

// NEVER: Remote module
require('@electron/remote')  // DEPRECATED & DANGEROUS

// NEVER: Shell.openExternal with user input
shell.openExternal(userProvidedUrl)  // Validate first

// NEVER: eval() or Function constructor
eval(userInput)
new Function(userInput)
```

### Always Use
```typescript
// ALWAYS: Parameterized queries
db.prepare('SELECT * FROM projects WHERE id = ?').get(id);

// ALWAYS: Validate file paths
if (filename.includes('..') || filename.includes('/')) {
  throw new Error('Invalid filename');
}

// ALWAYS: Secure credential storage
import { safeStorage } from 'electron';
const encrypted = safeStorage.encryptString(token);

// ALWAYS: IPC channel whitelisting
const validChannels = ['sync:progress', 'sync:completed'];
if (!validChannels.includes(channel)) {
  throw new Error('Invalid channel');
}
```

## IPC Security

### Handler Validation
```typescript
ipcMain.handle('projects:getById', async (_, id: unknown) => {
  // Validate input types
  if (typeof id !== 'number' || !Number.isInteger(id) || id < 1) {
    throw new Error('Invalid project ID');
  }
  return projectService.getById(id);
});
```

### Event Channel Whitelisting
```typescript
const validEventChannels = [
  'sync:progress',
  'sync:completed',
  'sync:error',
];

on: (channel: string, callback: Function) => {
  if (!validEventChannels.includes(channel)) {
    console.warn(`Invalid event channel: ${channel}`);
    return () => {};
  }
  // ... subscribe to channel
}
```

## Credential Security

### GitHub Token Storage
```typescript
// Use Electron's safeStorage API
import { safeStorage } from 'electron';

// Store
const encrypted = safeStorage.encryptString(token);
// Save encrypted buffer to database

// Retrieve
const token = safeStorage.decryptString(encryptedBuffer);
```

### Windows Authentication (NTLM)
```typescript
// Restrict to known domains (avoid wildcard '*')
session.defaultSession.allowNTLMCredentialsForDomains(
  '*.yourdomain.com,reportserver.internal.com'
);
```

## Database Security

### Queries
- Always use `?` placeholders for parameters
- Never concatenate user input into SQL strings
- Use transactions for multi-step operations

### File Location
- Database stored in `%APPDATA%/cw-dashboard/`
- Contains business data - consider sensitivity level
- No encryption by default (acceptable for local desktop app)

## Network Security

### HTTPS
- All SSRS feed URLs should use HTTPS
- Validate SSL certificates (default behavior)

### Content Security Policy
```typescript
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
      ]
    }
  });
});
```

## Auto-Update Security

### Signature Verification
- electron-updater verifies download integrity
- For production: implement code signing

### Update Source
- Updates only from configured GitHub repository
- HTTPS transport for downloads

## Dependency Security

### Regular Audits
```bash
npm audit
cd frontend && npm audit
```

### Update Strategy
- Monitor for security advisories
- Update Electron for security patches
- Review breaking changes before major updates

## Pre-Release Checklist

- [ ] Context isolation enabled
- [ ] Node integration disabled
- [ ] Sandbox enabled
- [ ] New window creation blocked
- [ ] Sensitive credentials use safeStorage
- [ ] IPC inputs validated
- [ ] File path inputs validated
- [ ] CSP configured
- [ ] No high-severity npm audit findings
- [ ] Debug logging reviewed for sensitive data

## Incident Response

If you discover a security issue:

1. **Assess** - Determine scope and impact
2. **Document** - Record what was found and how
3. **Fix** - Implement the fix
4. **Review** - Check for similar issues elsewhere
5. **Test** - Verify the fix doesn't break functionality
6. **Release** - Deploy fix promptly for security issues
