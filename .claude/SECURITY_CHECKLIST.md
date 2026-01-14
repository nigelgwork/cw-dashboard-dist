# Security Checklist - CW Dashboard

## Quick Scan (Every Commit)

Before every commit, verify:

- [ ] No `.env` files staged (only `.env.example`)
- [ ] No hardcoded passwords or API keys
- [ ] No `console.log` with sensitive data
- [ ] SQL queries use parameterized statements (SQLAlchemy ORM)
- [ ] User input validated before use

## Code Security Patterns

### Never Use
```python
# NEVER: String interpolation in SQL
f"SELECT * FROM users WHERE id = {user_id}"

# NEVER: eval() or exec()
eval(user_input)

# NEVER: Hardcoded credentials
password = "admin123"
```

### Always Use
```python
# ALWAYS: SQLAlchemy ORM
db.query(User).filter(User.id == user_id).first()

# ALWAYS: Pydantic validation
class TaskCreate(BaseModel):
    client_name: str = Field(..., min_length=1, max_length=200)

# ALWAYS: Environment variables
password = os.environ.get("DB_PASSWORD")
```

## API Security

### Input Validation
- All endpoints use Pydantic models
- String lengths are bounded
- Enum values validated
- IDs are validated as integers

### CORS Configuration
- Explicit origin whitelist
- No wildcard (`*`) in production
- Credentials require explicit origins

### WebSocket Security
- Connection validation
- Message size limits
- Rate limiting consideration

## Database Security

### Connection
- Use environment variables for credentials
- Never log connection strings
- Use connection pooling

### Queries
- Always use ORM (SQLAlchemy)
- No raw SQL with user input
- Validate all filter parameters

## Docker Security

### Images
- Use specific version tags (not `latest`)
- Non-root user in containers where possible
- Minimal base images (alpine preferred)

### Secrets
- Use Docker secrets or environment variables
- Never bake secrets into images
- Mount secrets at runtime

## Pre-Deployment Checklist

- [ ] All environment variables documented in `.env.example`
- [ ] Database credentials are strong and unique
- [ ] CORS origins are production URLs only
- [ ] Debug mode disabled
- [ ] Error messages don't leak internal details
- [ ] Rate limiting configured
- [ ] HTTPS enabled (via reverse proxy)

## Incident Response

If you discover a security issue:

1. **Don't commit the fix publicly** if it reveals the vulnerability
2. **Document** what was found and how
3. **Assess** the impact and exposure
4. **Fix** the issue in a private branch if needed
5. **Review** related code for similar issues
