# Claude Code Context: Aphiria.com

**Project**: Aphiria.com - Documentation website for the Aphiria PHP framework
**Language**: PHP 8.4+
**Framework**: Aphiria
**Repository**: https://github.com/aphiria/aphiria.com

---

## Critical Work Principles

### NEVER Guess - Always Research

**FORBIDDEN BEHAVIORS**:
- ❌ Claiming certainty when uncertain
- ❌ Defending wrong answers when challenged
- ❌ Presenting solutions without verification
- ❌ Implementing workarounds before checking for official solutions
- ❌ Going down rabbit holes without validating the actual problem exists

**REQUIRED BEHAVIORS**:
- ✅ Explicitly state "I don't know - let me research" when uncertain
- ✅ Search for official documentation/APIs BEFORE implementing custom solutions
- ✅ Verify the problem exists before attempting fixes
- ✅ Test solutions (when possible without violating constraints) before presenting them
- ✅ Admit mistakes immediately when corrected - don't argue

**Decision Framework**:
1. **Do I know this with 100% certainty?**
   - NO → Research first, present findings, then propose solution
   - YES → Still verify if it's a critical path (exports, APIs, build systems)

2. **Is there a standard library/API for this?**
   - Check official docs FIRST
   - GitHub/Stack Overflow examples SECOND
   - Custom implementation LAST RESORT

3. **Have I verified this problem actually exists?**
   - Check error messages carefully
   - Use diagnostic commands to confirm root cause
   - Don't fix phantom problems

**Example - What NOT to do**:
- User: "Exports aren't working"
- ❌ Bad: "The issue is dynamic imports, use `module.exports = require()`" (guessing)
- ✅ Good: "Let me check: 1) What does Pulumi docs say about exports? 2) What does the compiled code look like? 3) Does the stack have any resources deployed?"

**Time-Saving Rule**: 5 minutes of research saves hours of wrong implementations.

### Always Consider Idempotency and Existing State

**FORBIDDEN BEHAVIORS**:
- ❌ Only testing "first run" scenarios
- ❌ Assuming data doesn't already exist
- ❌ Creating duplicate entries without checking
- ❌ Not handling "workflow runs multiple times" scenarios

**REQUIRED BEHAVIORS**:
- ✅ Think through full lifecycle: 1st run, 2nd run, 3rd run
- ✅ Ask "what if this already exists?"
- ✅ Make operations idempotent (same result if run multiple times)
- ✅ Test mentally: empty state → partial state → full state → re-run
- ✅ Handle cleanup of old data before adding new data

**Example - What NOT to do**:
```javascript
// ❌ Bad: Adds label without checking if it exists
const newLabels = [...existingLabels, 'my-label'];
```

**Example - What TO do**:
```javascript
// ✅ Good: Removes label first to avoid duplicates
const newLabels = [
  ...existingLabels.filter(l => l !== 'my-label'),
  'my-label'
];
```

**Edge Cases Checklist**:
- First time running (empty state)
- Re-running after success (data already exists)
- Re-running after partial failure (incomplete state)
- Running concurrently (race conditions)

---

## Architecture Overview

This codebase provides **two distinct applications** in a monorepo:

### 1. Web Frontend (`./public-web`)
- Serves the documentation website (HTML, CSS, JS)
- Static documentation files compiled from Markdown
- Client-side Prism syntax highlighting (pre-rendered server-side during build)

### 2. API Backend (`./public-api`)
- PHP REST API built with Aphiria
- Serves search results from indexed documentation
- Provides full-text search via PostgreSQL TSVectors

### Build & Deployment Pipeline

**Docker Build Stages**:

1. **Build Image** (`./infrastructure/docker/build/Dockerfile`):
   - Clones https://github.com/aphiria/docs (Markdown documentation)
   - Compiles Markdown → HTML with server-side Prism syntax highlighting
   - Runs `gulp build` to generate static assets
   - Produces compiled documentation in `./public-web`

2. **Runtime Images**:
   - **API Image** (`./infrastructure/docker/runtime/api/Dockerfile`):
     - Copies compiled documentation from build image
     - Includes PHP application code + dependencies
   - **Web Image** (`./infrastructure/docker/runtime/web/Dockerfile`):
     - Copies compiled documentation from build image
     - Serves static HTML/CSS/JS

**Database Seeding & Search Indexing**:

After deployment, the **LexemeSeeder** (Phinx seed) runs to power the search API:

- **Location**: Database migration job in `./infrastructure/kubernetes/base/database/jobs.yml`
- **Process**:
  1. Reads compiled HTML documentation files (copied into API container)
  2. Extracts text content from HTML elements
  3. Applies weighting: `<h1>` > `<h2>` > `<p>` for search relevance
  4. Creates PostgreSQL TSVectors (full-text search indexes)
  5. Stores lexemes in database for API queries

**Critical Dependencies**:
- API search requires LexemeSeeder to complete successfully
- LexemeSeeder requires compiled documentation from build image
- Ephemeral environments MUST run db-migration job to populate search index
- Build failures in doc compilation break both web display AND API search

### Deployment Architecture

**Production/Ephemeral environments run**:
- **Web container**: nginx + static HTML files (from build image)
- **API container**: nginx + PHP-FPM + Aphiria + compiled docs
- **Database**: PostgreSQL with TSVector-indexed lexemes
- **Init**: Kubernetes Job runs Phinx migrations + LexemeSeeder

---

## Infrastructure Anti-Patterns (CRITICAL)

**NEVER use workarounds when proper solutions exist. Question every deviation from best practices.**

### Port-Forwarding in CI/CD

❌ **NEVER** use `kubectl port-forward` in GitHub Actions workflows or CI/CD pipelines
- Port-forwarding is a **debugging tool**, not infrastructure automation
- Creates race conditions, requires process management, fails unpredictably
- If a task needs cluster resources, run it **inside the cluster** (Kubernetes Job, init container)

✅ **ALWAYS** use Kubernetes Jobs for cluster-internal tasks:
- Database initialization/migrations
- Seed data loading
- Cluster configuration tasks

**Example - Database Creation:**
```typescript
// ❌ WRONG: Port-forward + Pulumi PostgreSQL provider
kubectl port-forward service/db 5432:5432 &
const provider = new postgresql.Provider("pg", { host: "localhost" });

// ✅ CORRECT: Kubernetes Job provisioned by Pulumi
const dbInitJob = new k8s.batch.v1.Job("db-init", {
    spec: {
        template: {
            spec: {
                containers: [{
                    name: "db-init",
                    image: "postgres:16-alpine",
                    command: ["psql", "-c", "CREATE DATABASE ..."],
                }],
            },
        },
    },
});
```

### Decision Framework: Where Should This Run?

When implementing any infrastructure task, ask:

1. **Does this need access to cluster-internal resources?**
   - YES → Run inside cluster (Job, init container, sidecar)
   - NO → Run from CI/CD runner is acceptable

2. **Is this a one-time setup task or ongoing operation?**
   - One-time → Kubernetes Job
   - Ongoing → Init container or deployment lifecycle hook

3. **Am I using a "workaround" or a "pattern"?**
   - If it feels hacky, it probably is
   - If you need to manage background processes, it's wrong
   - If documentation says "for debugging/development", don't use it in production

### Kubernetes Resource Management (NON-NEGOTIABLE)

**CRITICAL**: All Kubernetes containers MUST have resource requests and limits defined.

**Why This Matters**:
1. **ResourceQuotas** - Namespaces with quotas will reject pods without limits (deployment fails immediately)
2. **Cost Control** - Prevents runaway resource usage in preview environments
3. **Stability** - Protects cluster from resource exhaustion and noisy neighbor problems
4. **Quality of Service** - Ensures predictable performance and proper eviction behavior

**Rules**:
- ✅ **ALWAYS** set `resources.requests` and `resources.limits` on every container
- ✅ **ALWAYS** include limits on Jobs and init containers (even if short-lived)
- ✅ **ALWAYS** set both CPU and memory (never skip one)
- ❌ **NEVER** deploy containers without resource specifications in production-like environments

**Example - Correct Resource Specification**:
```typescript
// ✅ CORRECT: All containers have resource limits
const dbInitJob = new k8s.batch.v1.Job("db-init", {
    spec: {
        template: {
            spec: {
                containers: [{
                    name: "db-init",
                    image: "postgres:16-alpine",
                    resources: {
                        requests: {
                            cpu: "100m",      // Minimum guaranteed
                            memory: "128Mi",
                        },
                        limits: {
                            cpu: "200m",      // Maximum allowed
                            memory: "256Mi",
                        },
                    },
                }],
            },
        },
    },
});

// ❌ WRONG: Missing resource limits (will fail if namespace has ResourceQuota)
const dbInitJob = new k8s.batch.v1.Job("db-init", {
    spec: {
        template: {
            spec: {
                containers: [{
                    name: "db-init",
                    image: "postgres:16-alpine",
                    // Missing resources field - Kubernetes will reject this!
                }],
            },
        },
    },
});
```

**Sizing Guidelines**:
- **Jobs/Init Containers**: Start with 100m CPU / 128Mi memory (requests), 200m / 256Mi (limits)
- **API Containers**: Start with 250m CPU / 512Mi memory
- **Web Containers**: Start with 100m CPU / 256Mi memory
- **Monitor and adjust** based on actual usage (use `kubectl top pod`)

### Container Image Best Practices (IMMUTABILITY)

**CRITICAL**: Always use full SHA256 digests for container images in production-like environments.

**Why This Matters**:
1. **Immutability** - Ensures exact same image is deployed every time (no surprises)
2. **Security** - Prevents tag hijacking attacks (`:latest` can be overwritten)
3. **Reproducibility** - Can recreate exact deployment state months later
4. **Audit Trail** - Know exactly what code is running in production

**Rules**:
- ✅ **ALWAYS** use full 64-character SHA256 digests: `sha256:abc123...` (71 chars total with prefix)
- ✅ **ALWAYS** get digests from `docker/build-push-action` outputs
- ✅ **NEVER** truncate or modify digests (Docker will reject them as invalid)
- ✅ **NEVER** use mutable tags like `:latest` or `:pr-123` in production
- ✅ **ALWAYS** pass digests via type-safe mechanisms (workflow inputs, not labels/comments)

**Example - Correct Digest Handling**:
```typescript
// ✅ CORRECT: Full SHA256 digest (64 hex characters)
const deployment = new k8s.apps.v1.Deployment("api", {
    spec: {
        template: {
            spec: {
                containers: [{
                    name: "api",
                    // Full 64-character digest after sha256: prefix
                    image: "ghcr.io/org/app@sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                }],
            },
        },
    },
});

// ❌ WRONG: Truncated digest (invalid - Docker will fail with "invalid reference format")
image: "ghcr.io/org/app@sha256:1234567890ab"  // Only 12 chars - FAILS!

// ❌ WRONG: Mutable tag (not reproducible - someone could push new code to same tag)
image: "ghcr.io/org/app:pr-123"
```

**GitHub Actions Pattern - The Enterprise Way**:
```yaml
# BUILD WORKFLOW: Capture full digest, trigger deploy with inputs
jobs:
  build:
    outputs:
      web-digest: ${{ steps.web.outputs.digest }}
      api-digest: ${{ steps.api.outputs.digest }}
    steps:
      - name: Build web image
        id: web
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/org/app-web:pr-${{ github.event.pull_request.number }}

  trigger-deploy:
    needs: build
    steps:
      - name: Trigger deployment with digests
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.actions.createWorkflowDispatch({
              owner: context.repo.owner,
              repo: context.repo.repo,
              workflow_id: 'deploy-preview.yml',
              ref: context.ref,
              inputs: {
                pr_number: '${{ github.event.pull_request.number }}',
                web_digest: '${{ needs.build.outputs.web-digest }}',  // Full SHA256
                api_digest: '${{ needs.build.outputs.api-digest }}'   // Full SHA256
              }
            });

# DEPLOY WORKFLOW: Accept typed inputs (enterprise pattern)
on:
  workflow_dispatch:
    inputs:
      pr_number:
        description: 'PR number to deploy'
        required: true
        type: number
      web_digest:
        description: 'Full SHA256 digest for web image'
        required: true
        type: string
      api_digest:
        description: 'Full SHA256 digest for API image'
        required: true
        type: string

jobs:
  deploy:
    steps:
      - name: Use digests directly from inputs
        run: |
          echo "Deploying web: ${{ inputs.web_digest }}"
          echo "Deploying API: ${{ inputs.api_digest }}"
```

**Why workflow_dispatch inputs > alternatives**:
- ✅ **Type-safe**: GitHub validates input types (string, number, boolean)
- ✅ **Explicit contract**: Inputs are documented, self-describing
- ✅ **No parsing**: Direct parameter access, no regex/JSON extraction
- ✅ **Auditable**: GitHub logs show exact inputs used for each run
- ✅ **Manual override**: Can manually trigger with specific digests for rollback
- ❌ **PR labels**: 100-char limit (fatal for 71-char SHA256 digests)
- ❌ **GitHub Artifacts**: Requires upload/download, retention limits, complexity
- ❌ **Comment parsing**: Fragile, can be edited by users, not machine-readable

### Other Anti-Patterns to Avoid

❌ **Temporary files without cleanup**
❌ **Background processes in CI/CD** (use Jobs instead)
❌ **Hardcoded timeouts/retries** (use proper readiness checks)

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

### Directory/File Conventions

- Always stick with industry-standard directory/file naming conventions and location/nesting

### YAML Style Requirements

- YAML files MUST end with .yml

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

**Source code** (`src/`): Domain-driven organization with Binders (DI), Controllers, Services, and Models per domain

**Tests** (`tests/`): unit/, integration/, and contract/ directories

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
4. **Inline Comments**: Explain complex logic, not obvious code, and do not comment on code that has been removed

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

### GitHub Secrets & PAT Documentation (REQUIRED)

**CRITICAL**: All GitHub repository secrets and Personal Access Tokens (PATs) MUST be documented in `SECRETS.md`.

**Why This Matters**:
1. **Onboarding** - New maintainers need to know what secrets exist and how to rotate them
2. **Security** - Undocumented secrets become orphaned and never rotated
3. **Incident Response** - When a token expires or is compromised, you need to know what breaks
4. **Compliance** - Audit trail of what credentials exist and their purpose

**Rules**:
- ✅ **ALWAYS** document new secrets in `SECRETS.md` when adding them to workflows
- ✅ **ALWAYS** include: secret name, purpose, PAT scopes (if applicable), rotation schedule, used by (which workflows)
- ✅ **ALWAYS** provide step-by-step rotation procedures for each PAT
- ❌ **NEVER** add secrets to workflows without updating `SECRETS.md`
- ❌ **NEVER** commit actual secret values (document the NAME and PURPOSE only)

**Template for `SECRETS.md` entries**:

```markdown
### SECRET_NAME

**Why this is needed**: Brief explanation of why default GITHUB_TOKEN isn't sufficient

**Generate new token**:
1. https://github.com/settings/tokens
2. "Generate new token (classic)"
3. Name: `Descriptive Name (project-name)`
4. Scopes: `scope1`, `scope2`, `scope3`
5. Expiration: 1 year (or no expiration with justification)
6. Copy the token

**Update repository secret**:
1. https://github.com/org/repo/settings/secrets/actions
2. Click `SECRET_NAME` (or "New repository secret")
3. Paste new token value
4. Save

**Test**: Describe how to verify the secret works (e.g., "Push commit to PR, verify workflow succeeds")

**Cleanup**: Delete old token at https://github.com/settings/tokens
```

**Example - WORKFLOW_DISPATCH_TOKEN**:
- **Secret Name**: `WORKFLOW_DISPATCH_TOKEN`
- **Purpose**: Trigger preview deployment workflow from build workflow (default `GITHUB_TOKEN` cannot trigger workflows per GitHub security policy)
- **PAT Scopes**: `workflow` (allows triggering workflow_dispatch events)
- **Rotation**: Annually
- **Used By**: `build-preview-images.yml` (trigger-deploy job)

---

## Pre-Commit Checklist

Before committing any PHP code changes:

- [ ] `composer phpcs-fix` - Code style fixed
- [ ] `composer phpunit` - All tests pass
- [ ] `composer psalm` - No static analysis errors
- [ ] New files MUST be added to git (`git add`)
- [ ] Sensitive files added to `.gitignore`
- [ ] `.env.dist` updated if new env vars added
- [ ] Tests written for new functionality
- [ ] PHPDoc added for public methods
- [ ] No `TODO` or `FIXME` comments without issue tracking

**Before committing GitHub Actions workflow changes**:

- [ ] New secrets documented in `SECRETS.md` (name, purpose, scopes, rotation)
- [ ] PAT scopes are minimal (only what's required)
- [ ] Secret usage is justified (can't use default `GITHUB_TOKEN`)
- [ ] Rotation procedure documented with test steps
- [ ] `workflow_dispatch` ref parameter uses a branch name (not `context.ref` from PR workflows)
- [ ] Triggered workflows exist on the target branch (usually `master`)

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

### Simplicity Principle

**NEVER over-engineer solutions.** This project values simple, maintainable code over clever abstractions.

**GitHub Actions Workflows**:
- ❌ **DON'T**: Duplicate setup logic across jobs when the task is simple
- ❌ **DON'T**: Add complex abstractions for tasks that are fundamentally "run command, post comment"
- ❌ **DON'T**: Create elaborate job chains when a single job with clear steps suffices
- ✅ **DO**: Keep workflows as simple as possible - extract PR number, run command, post result
- ✅ **DO**: Question complexity - if a workflow feels complicated, simplify first
- ✅ **DO**: Prefer inline scripts over external files unless reused 3+ times

**Pulumi/Infrastructure**:
- ✅ **DO**: Reuse shared components across environments (local, preview, production)
- ❌ **DON'T**: Create layers of abstraction that hide what's actually being deployed
- ✅ **DO**: Keep stack programs readable - anyone should understand what gets deployed

**Code Reviews**:
- When proposing changes, ask: "Is this the simplest solution that works?"
- If a file exceeds 100 lines for a simple task, reconsider the approach
- Favor boring, obvious code over clever, concise code

---

---

## GitHub Actions Gotchas

### workflow_dispatch Ref Parameter

**CRITICAL**: When triggering workflows via `workflow_dispatch`, the `ref` parameter MUST be a **branch or tag name**, not a PR merge ref.

**Common Mistake**:
```javascript
// ❌ WRONG: Using context.ref from PR workflow
await github.rest.actions.createWorkflowDispatch({
  workflow_id: 'deploy.yml',
  ref: context.ref,  // This is "refs/pull/123/merge" - NOT VALID!
  inputs: { ... }
});
```

**Correct Approach**:
```javascript
// ✅ CORRECT: Use a branch name
await github.rest.actions.createWorkflowDispatch({
  workflow_id: 'deploy.yml',
  ref: 'master',  // Use the branch where the workflow file exists
  inputs: { ... }
});
```

**Why This Matters**:
- PR merge refs (`refs/pull/123/merge`) are virtual refs created by GitHub for PR validation
- They are **not real branches** and cannot be used to trigger workflows
- Using them results in: `No ref found for: refs/pull/123/merge` (HTTP 422)

**Best Practice**:
- For security-gated deployments, trigger workflows on `master` (ensures workflow code is reviewed/merged)
- The triggered workflow runs the master version of the YAML file
- Pass PR-specific data (PR number, image digests, etc.) via `inputs` parameters

**SpecKit Checklist**:
- [ ] `workflow_dispatch` uses branch name (`master`, `main`, etc.), not `context.ref`
- [ ] Triggered workflow exists on the target branch
- [ ] PR-specific data passed via `inputs`, not inferred from workflow ref

---

## GitHub Actions Standards

### Naming Conventions

- **Workflow names** (top-level `name:`): Title Case (e.g., "Build Preview Images", "Test")
- **Job names** (`jobs.<job_id>.name`): Title Case (e.g., "Build Docker Images", "Deploy Preview Environment")
- **Step names** (`steps[].name`): Sentence case (e.g., "Install dependencies", "Run Pulumi preview")
- **Job IDs** (`jobs.<job_id>`): lowercase-with-hyphens (e.g., `build`, `preview-infra`, `deploy`)
- **Workflow file names**: lowercase-with-hyphens.yml (e.g., `build-preview-images.yml`, `test.yml`)

### Gotchas

- **Secret naming**: Cannot use `GITHUB_` prefix (reserved by GitHub system). Use alternatives like `GHCR_TOKEN` instead of `GITHUB_CONTAINER_REGISTRY_TOKEN`.

---

**Last Updated**: 2025-12-20
**Constitution Version**: 1.0.0
