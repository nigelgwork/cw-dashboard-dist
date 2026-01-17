# Ways of Working - CW Dashboard

## Project Philosophy

### Core Principles
1. **Simplicity Over Complexity** - Prefer straightforward solutions
2. **Security First** - Context isolation, input validation, secure credential storage
3. **Type Safety** - TypeScript strict mode throughout
4. **Offline First** - All data stored locally in SQLite, sync when available
5. **Electron Native** - Leverage native Windows features (NTLM auth, file system)

### Development Workflow

1. **Phase-Based Development** - Complete features in distinct phases
2. **Quality Gates** - Test before marking phases complete
3. **Atomic Commits** - One logical change per commit
4. **Frequent Pushes** - Don't batch commits

---

## Code Standards

### TypeScript (Electron Main Process)
- **Strict Mode**: Always enabled
- **No `any` Types**: Use proper typing
- **Service Pattern**: Business logic in `/electron/services/`
- **IPC Handlers**: Centralized in `/electron/ipc/handlers.ts`
- **File Length**: <500 lines preferred

### TypeScript (React Frontend)
- **Strict Mode**: Always enabled
- **No `any` Types**: Use proper typing
- **Component Size**: <300 lines
- **Prop Types**: Full TypeScript interfaces
- **Hooks**: Custom hooks for reusable logic

### Naming Conventions

**Electron (Main Process)**:
- Services: `camelCase` files, exported functions (e.g., `projects.ts`, `getById()`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `SCHEMA_VERSION`)
- Database columns: `snake_case` (e.g., `external_id`)
- IPC channels: `namespace:action` (e.g., `projects:getById`)

**React (Frontend)**:
- Interfaces: `PascalCase` (e.g., `ProjectProps`)
- Functions: `camelCase` (e.g., `handleProjectClick`)
- Components: `PascalCase` (e.g., `ProjectCard`)
- Hooks: `useXxx` pattern (e.g., `usePinnedItems`)
- Files: `PascalCase` for components (e.g., `ProjectCard.tsx`)

---

## Architecture Guidelines

### Electron Process Separation
- **Main Process**: Database, sync, file system, native features
- **Renderer Process**: React UI, user interactions
- **Preload Script**: Type-safe IPC bridge only

### IPC Communication
```typescript
// Main process (handlers.ts)
ipcMain.handle('projects:getAll', async () => {
  return projectService.getAll();
});

// Preload (preload.ts)
projects: {
  getAll: () => ipcRenderer.invoke('projects:getAll'),
}

// Renderer (component)
const projects = await window.api.projects.getAll();
```

### Database Access
- All database operations through service layer
- Use parameterized queries (better-sqlite3 handles this)
- Migrations versioned with `SCHEMA_VERSION`

---

## Documentation Standards

### Code Documentation
- JSDoc for public service functions
- Type hints on all function parameters and returns
- Comments explain WHY not WHAT
- Keep inline comments minimal if code is self-explanatory

### Commit Messages
```
Brief summary (imperative mood, <50 chars)

Detailed explanation:
- What changed and why
- Key features added or modified

Co-Authored-By: Claude <model> <noreply@anthropic.com>
```

---

## Testing Strategy

### Test Levels
- **Unit**: Individual functions/services
- **Integration**: IPC handler + service interactions
- **Component**: React component behavior

### Test Structure (Arrange-Act-Assert)
```typescript
describe('formatCurrency', () => {
  it('formats positive numbers with dollar sign', () => {
    // Arrange
    const value = 1234.56;

    // Act
    const result = formatCurrency(value);

    // Assert
    expect(result).toBe('$1,234.56');
  });
});
```

### Test Location
- Frontend tests: `frontend/src/**/*.test.ts`
- Use Vitest for all tests

---

## Security Practices

### Never Do
- Store credentials in plaintext database (use `safeStorage`)
- Disable context isolation or enable nodeIntegration
- Use `eval()` or dynamic code execution
- Trust user input without validation

### Always Do
- Use parameterized queries (better-sqlite3)
- Validate file paths before reading
- Validate IPC inputs in handlers
- Keep Electron and dependencies updated

---

## Progress Tracking

### TodoWrite Tool Usage
- Use for multi-step tasks (3+ steps)
- Mark tasks immediately when complete
- Keep only ONE task as `in_progress`
- Remove stale/irrelevant tasks

### Quality Gates Before Phase Completion
1. All tests pass
2. No TypeScript errors
3. Documentation updated
4. Manual testing of affected features

---

## Git Workflow

### Branch Strategy
- `main` - Production-ready code
- Feature branches for significant work

### Commit Frequency
- Commit after each logical unit of work
- Don't batch unrelated changes
- Push frequently

### Release Process
1. Update version in `package.json` (both root and frontend)
2. Commit with version in message: `"Description (v2.0.0)"`
3. Push to main
4. Create and push git tag: `git tag v2.0.0 && git push origin v2.0.0`
5. GitHub Actions builds and publishes automatically

### Pre-Commit Checklist
- [ ] Code compiles (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] No hardcoded secrets
- [ ] Commit message follows format
