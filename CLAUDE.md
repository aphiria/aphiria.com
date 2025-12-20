# Claude Code Context: Aphiria.com

**Project**: Aphiria.com - Documentation website for the Aphiria PHP framework
**Language**: PHP 8.4+
**Framework**: Aphiria
**Repository**: https://github.com/aphiria/aphiria.com

---

## Constitution

This project follows the **Aphiria.com Constitution** located at `specs/.specify/memory/constitution.md` (v1.0.0).

**Core Principles**:
1. PHP Framework Standards (PSR-4, PSR-12, strict types)
2. Documentation-First Development
3. Test Coverage (NON-NEGOTIABLE)
4. Static Analysis & Code Quality
5. Production Reliability

All work must comply with these principles. See constitution for details.

---

## Critical Workflow Rules

### 1. Always Run Quality Gates

Before completing any task involving PHP code:

```bash
# Run these in sequence - ALL must pass
composer phpcs-fix      # Auto-fix code style
composer phpunit        # Run all tests
composer psalm          # Static analysis
```

**NEVER** skip these steps. If any fail, fix the issues before proceeding.

### 2. Test Coverage is Mandatory

For every new feature or bug fix:
- **Unit tests**: Business logic (PHPUnit)
- **Integration tests**: Database interactions, external dependencies
- **Contract tests**: API endpoints

Write tests FIRST, ensure they FAIL, then implement.

### 3. Git Workflow

#### Always Stage New Files

When creating new files:

```bash
git add <new-file>
```

**NEVER** leave new files unstaged unless explicitly instructed.

#### Sensitive Files Go to .gitignore

Automatically add these patterns to `.gitignore` if not already present:

```gitignore
# Credentials and secrets
.env
*.key
*.pem
credentials.json
secrets.yaml
kubeconfig*

# IDE and local
.idea/
.vscode/
*.swp
*.swo
*~

# Build artifacts
/vendor/
/node_modules/
/tmp/*
/public-web/css/*
/public-web/js/*
.phpunit.result.cache
.php-cs-fixer.cache

# OS files
.DS_Store
Thumbs.db
```

Check if sensitive files already exist in `.gitignore` before adding duplicates.

---

## Code Standards

### PHP Style Requirements

**PSR Compliance**:
- PSR-4 autoloading: `App\` namespace maps to `src/`
- PSR-12 coding style
- Strict types: `declare(strict_types=1);` in EVERY file

**Type Safety**:
```php
<?php declare(strict_types=1);

namespace App\Feature;

final class Example
{
    public function __construct(
        private readonly DependencyInterface $dependency
    ) {
    }

    public function process(string $input): Result
    {
        // Method implementation
    }
}
```

**Aphiria Patterns**:
- Dependency Injection: Use Binders for DI configuration
- Routing: Use route attributes or route builders
- Controllers: Thin controllers, business logic in services
- Content Negotiation: Leverage Aphiria's built-in negotiation

### Directory Structure

```
src/
├── [Domain]/              # Domain-driven organization
│   ├── Binders/          # DI configuration
│   ├── Controllers/      # HTTP controllers
│   ├── Services/         # Business logic
│   └── Models/           # Data models
└── ...

tests/
├── unit/                 # Unit tests
├── integration/          # Integration tests
└── contract/             # API contract tests
```

### Database

- **ORM**: Use Aphiria's query builders and ORM patterns
- **Migrations**: Phinx with reversible up/down methods
- **Queries**: ALWAYS use parameterized statements (no string concatenation)

---

## Industry Best Practices

### PHP Best Practices

1. **Immutability**: Prefer `readonly` properties where applicable
2. **Value Objects**: Use for domain concepts (e.g., Email, Money)
3. **Enums**: Use native PHP enums for fixed sets (PHP 8.1+)
4. **Null Safety**: Avoid nulls; use Option/Result types where possible
5. **Exceptions**: Use specific exception types, not generic `Exception`

### Testing Best Practices

1. **AAA Pattern**: Arrange, Act, Assert
2. **One Assertion Per Test**: Keep tests focused
3. **Test Names**: Descriptive method names (e.g., `testUserCannotLoginWithInvalidPassword`)
4. **Test Data**: Use factories or builders, not hard-coded arrays
5. **Mocking**: Mock external dependencies, not internal logic

### Security Best Practices

1. **Input Validation**: Validate ALL user input at boundaries
2. **SQL Injection**: Always use parameterized queries
3. **XSS Prevention**: Escape output, use content negotiation properly
4. **CSRF Protection**: Ensure Aphiria's CSRF middleware is active
5. **Secrets**: NEVER commit secrets; use environment variables

### Documentation Standards

1. **PHPDoc**: Document public APIs, especially complex methods
2. **README Updates**: Update README.md when adding new setup steps
3. **Architecture Decisions**: Document "why" in code comments, not just "what"
4. **Inline Comments**: Explain complex logic, not obvious code

---

## Environment Configuration

### Required Environment Variables

Document new variables in `.env.dist`:

```env
# Example: New API integration
EXTERNAL_API_URL=https://api.example.com
EXTERNAL_API_KEY=your-api-key-here
```

### Kubernetes Secrets

For production secrets, use Kubernetes secrets (not ConfigMaps):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  api-key: <base64-encoded-value>
```

Reference in deployment manifests.

---

## Pre-Commit Checklist

Before committing any PHP code changes:

- [ ] `composer phpcs-fix` - Code style fixed
- [ ] `composer phpunit` - All tests pass
- [ ] `composer psalm` - No static analysis errors
- [ ] New files added to git (`git add`)
- [ ] Sensitive files added to `.gitignore`
- [ ] `.env.dist` updated if new env vars added
- [ ] Tests written for new functionality
- [ ] PHPDoc added for public methods
- [ ] No `TODO` or `FIXME` comments without issue tracking

---

## Deployment Workflow

### Local Development

```bash
# Build application
eval $(minikube -p minikube docker-env) \
&& docker build -t aphiria.com-build -f ./infrastructure/docker/build/Dockerfile . \
&& docker build -t aphiria.com-api -f ./infrastructure/docker/runtime/api/Dockerfile . --build-arg BUILD_IMAGE=aphiria.com-build \
&& docker build -t aphiria.com-web -f ./infrastructure/docker/runtime/web/Dockerfile . --build-arg BUILD_IMAGE=aphiria.com-build

# Apply Kubernetes manifests
kubectl apply -k ./infrastructure/kubernetes/environments/dev

# Restart deployments
kubectl rollout restart deployment api
kubectl rollout restart deployment web
```

### Production Deployment

- Builds run via GitHub Actions CI/CD
- Kubernetes manifests must validate before deployment
- Database migrations tested in dev cluster first
- Documentation built with `gulp build` (must succeed)

---

## Common Tasks

### Adding a New Feature

1. Create feature branch: `git checkout -b feature-name`
2. Write tests first (TDD)
3. Implement feature
4. Run quality gates (phpcs-fix, phpunit, psalm)
5. Update documentation if user-facing
6. Commit with descriptive message
7. Open pull request

### Adding a New Dependency

1. Add via Composer: `composer require vendor/package`
2. Justify in PR description (Minimal Dependencies principle)
3. Pin to specific version for stability
4. Update `.env.dist` if configuration needed
5. Document in README if setup required

### Database Migration

1. Create migration: `vendor/bin/phinx create MigrationName`
2. Implement `up()` and `down()` methods (reversible)
3. Test locally: `vendor/bin/phinx migrate`
4. Test rollback: `vendor/bin/phinx rollback`
5. Commit migration file

### Debugging

- Local logs: `kubectl logs -f deployment/web` or `deployment/api`
- Database access: `kubectl port-forward service/db 5432:5432`
- Shell access: `kubectl exec -it deployment/web -- /bin/bash`

---

## Project-Specific Technologies

### Current Stack

- **PHP**: 8.4+
- **Framework**: Aphiria (latest)
- **Database**: PostgreSQL
- **Migrations**: Phinx
- **Testing**: PHPUnit
- **Static Analysis**: Psalm
- **Code Style**: PHP-CS-Fixer
- **Frontend Build**: Gulp (documentation assets)
- **Container**: Docker
- **Orchestration**: Kubernetes (DigitalOcean)
- **Deployment**: Helmfile + Kustomize

### Recent Features

- **Ephemeral Environments** (001-ephemeral-environment): Preview environments for PRs

---

## Anti-Patterns to Avoid

❌ **DON'T**:
- Skip running phpcs-fix, phpunit, or psalm
- Commit code without tests
- Hard-code configuration values
- Use raw SQL string concatenation
- Suppress Psalm errors without justification
- Leave new files unstaged
- Commit secrets or credentials
- Use `var_dump()` or `echo` for debugging (use logging)
- Create "God classes" (keep classes focused)
- Ignore deprecation warnings

✅ **DO**:
- Follow TDD (tests first)
- Use dependency injection
- Leverage Aphiria patterns
- Write defensive code (validate inputs)
- Document complex logic
- Keep methods short and focused
- Use descriptive variable names
- Follow SOLID principles

---

## Emergency Procedures

### Rollback Deployment

```bash
# Rollback to previous deployment
kubectl rollout undo deployment/web
kubectl rollout undo deployment/api
```

### Database Rollback

```bash
# Rollback last migration
vendor/bin/phinx rollback
```

### Clear Caches

```bash
# Clear application cache
php aphiria cache:flush
```

---

## Resources

- **Aphiria Documentation**: https://www.aphiria.com/docs
- **Constitution**: `specs/.specify/memory/constitution.md`
- **PSR Standards**: https://www.php-fig.org/psr/
- **PHP Manual**: https://www.php.net/manual/en/

---

## Notes for Claude Code

- **Always check constitution** before starting work
- **Run quality gates** before marking tasks complete
- **Ask for clarification** if requirements unclear
- **Suggest improvements** that align with best practices
- **Document decisions** in code comments or commit messages
- **Test thoroughly** - the website serves the Aphiria community
- **Be explicit** about what files were changed and why

---

**Last Updated**: 2025-12-19
**Constitution Version**: 1.0.0
