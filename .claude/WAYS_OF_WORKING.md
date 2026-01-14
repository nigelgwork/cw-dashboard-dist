# Ways of Working - CW Dashboard

## Project Philosophy

### Core Principles
1. **Simplicity Over Complexity** - Prefer straightforward solutions
2. **Security First** - Never commit secrets, validate all inputs
3. **Type Safety** - TypeScript strict mode, Python type hints everywhere
4. **Real-Time First** - WebSocket updates for all data changes
5. **Docker-Native** - Application runs entirely in containers

### Development Workflow

1. **Phase-Based Development** - Complete features in distinct phases
2. **Quality Gates** - Test before marking phases complete
3. **Atomic Commits** - One logical change per commit
4. **Frequent Pushes** - Don't batch commits

---

## Code Standards

### Python (Backend)
- **Formatter**: Black (line length 100)
- **Linter**: Ruff
- **Type Checker**: mypy (strict mode)
- **Docstrings**: Google-style for all public functions
- **Function Length**: <50 lines
- **File Length**: <500 lines

### TypeScript (Frontend)
- **Strict Mode**: Always enabled
- **No `any` Types**: Use proper typing
- **Component Size**: <300 lines
- **Prop Types**: Full TypeScript interfaces

### Naming Conventions

**Python**:
- Classes: `PascalCase` (e.g., `TaskRouter`)
- Functions: `snake_case` (e.g., `get_all_tasks`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `API_TIMEOUT`)
- Private: `_leading_underscore`

**TypeScript**:
- Interfaces: `PascalCase` (e.g., `TaskProps`)
- Functions: `camelCase` (e.g., `handleTaskDrop`)
- Components: `PascalCase` (e.g., `TaskCard`)
- Hooks: `useXxx` pattern (e.g., `useWebSocket`)

---

## Documentation Standards

### Code Documentation
- Google-style docstrings for all public methods
- Type hints on all function parameters and returns
- Comments explain WHY not WHAT
- Examples in docstrings where helpful

### Commit Messages
```
Brief summary (imperative mood, <50 chars)

Detailed explanation:
- What changed and why
- Key features added or modified

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <name> <noreply@anthropic.com>
```

---

## Testing Strategy

### Test Levels
- **Unit**: Individual functions/methods
- **Integration**: Component interactions
- **E2E**: Complete user workflows

### Test Structure (Arrange-Act-Assert)
```python
def test_feature():
    """Brief description of what's tested"""
    # Arrange - Set up test data
    task = Task(client_name="SA Water")

    # Act - Perform the action
    result = task_service.create(task)

    # Assert - Verify results
    assert result.id is not None
```

---

## Security Practices

### Never Do
- Commit `.env` files (use `.env.example`)
- Hardcode credentials in code
- Use `eval()` or `exec()`
- Trust user input without validation

### Always Do
- Use parameterized queries (SQLAlchemy ORM)
- Validate all API inputs with Pydantic
- Sanitize data before display
- Keep dependencies updated

---

## Progress Tracking

### TodoWrite Tool Usage
- Use for multi-step tasks (3+ steps)
- Mark tasks immediately when complete
- Keep only ONE task as `in_progress`
- Remove stale/irrelevant tasks

### Quality Gates Before Phase Completion
1. All tests pass
2. No linting errors
3. Documentation updated
4. Security quick scan passed

---

## Git Workflow

### Branch Strategy
- `main` - Production-ready code
- Feature branches for significant work

### Commit Frequency
- Commit after each logical unit of work
- Don't batch unrelated changes
- Push frequently

### Pre-Commit Checklist
- [ ] Code compiles/builds
- [ ] Tests pass
- [ ] No hardcoded secrets
- [ ] Commit message follows format
