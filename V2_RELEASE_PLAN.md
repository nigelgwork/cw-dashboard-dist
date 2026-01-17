# CW Dashboard v2.0.0 Release Plan

## Status: READY FOR RELEASE

All Phase 1-4 items have been completed. The application is ready for v2.0.0 production release.

---

## Phase 1: Documentation Fixes (No Risk) - COMPLETED

### 1.1 Fix Critical Documentation Errors
- [x] Rewrite `.claude/WAYS_OF_WORKING.md` for Electron/TypeScript stack
- [x] Rewrite `.claude/SECURITY_CHECKLIST.md` for Electron security practices

### 1.2 Update CLAUDE.md
- [x] Update tech stack versions (React 19, Vite 7, Tailwind 4)
- [x] Add PROJECT_DETAIL feed type documentation
- [x] Document templates feature
- [x] Update IPC channels table
- [x] Add missing services to project structure
- [x] Document default settings
- [x] Fix CSS syntax in design tokens

### 1.3 Sync Package Versions
- [x] Update `frontend/package.json` version to match root

---

## Phase 2: Security Hardening (Non-Breaking) - COMPLETED

### 2.1 Secure Token Storage (High Priority)
- [x] Implement Electron `safeStorage` API for GitHub token
- [x] Graceful fallback for legacy plaintext tokens
- [x] Update settings service to use secure storage

### 2.2 Add Content Security Policy
- [x] Add CSP headers via Electron session
- [x] Configure policy: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'`

### 2.3 Input Validation
- [x] Add path validation to `feeds.ts` importFeed function
- [x] Add path validation to `getTemplateContent` function
- [x] Validate file extensions before reading

---

## Phase 3: New Features - COMPLETED

### 3.1 Download Progress Bar
- [x] Add progress bar UI to Header component
- [x] Show download percentage during update
- [x] Animate download icon during progress

### 3.2 Periodic Update Check with Notification
- [x] Implement 24-hour automatic update check cycle
- [x] Add `update:available-background` IPC event
- [x] Show notification dot on update button when available
- [x] Smart scheduling based on last check time

---

## Phase 4: v2.0.0 Release - READY

### 4.1 Pre-Release Checklist
- [x] All Phase 1-3 items completed
- [x] TypeScript compilation successful (both electron and frontend)
- [x] Version updated to 2.0.0 in root `package.json`
- [x] Version updated to 2.0.0 in `frontend/package.json`

### 4.2 Release Process (To Do)
- [ ] Commit all changes with message "(v2.0.0)"
- [ ] Push to main branch
- [ ] Create and push git tag `v2.0.0`
- [ ] Verify GitHub Actions build succeeds
- [ ] Verify release assets are uploaded

---

## What's New in v2.0.0

### Security Enhancements
- GitHub tokens now encrypted using Electron's safeStorage API
- Content Security Policy (CSP) enabled for defense-in-depth
- Path validation prevents path traversal attacks on file imports

### User Experience
- **Download Progress Bar**: See real-time download progress when updating
- **Automatic Update Checks**: App checks for updates once per day
- **Update Notification**: Visual indicator when updates are available

### Documentation
- Complete rewrite of development guidelines for Electron/TypeScript
- Updated security checklist with Electron-specific practices
- Current tech stack versions documented

---

## Post-Release Improvements (v2.1.0+)

### Testing
- [ ] Add test step to CI/CD pipeline
- [ ] Add tests for sync, database, and feed parsing

### Code Quality
- [ ] Refactor large files (native-sync.ts, FullPageView.tsx)
- [ ] Consolidate type definitions

### Future Security
- [ ] Evaluate Electron 35+ upgrade for ASAR vulnerability fix
- [ ] Consider NTLM domain restriction options
- [ ] Implement structured logging

---

## Summary of Changes

| Category | Changes |
|----------|---------|
| Security | safeStorage for tokens, CSP, path validation |
| Features | Download progress, periodic update check, notification dot |
| Documentation | WAYS_OF_WORKING.md, SECURITY_CHECKLIST.md, CLAUDE.md |
| Version | 1.0.64 -> 2.0.0 |
