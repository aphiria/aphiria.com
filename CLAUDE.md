# Claude Code Context: Aphiria.com

**Project**: Aphiria.com - Documentation website for the Aphiria PHP framework
**Language**: PHP 8.4+
**Framework**: Aphiria
**Repository**: https://github.com/aphiria/aphiria.com

---

## Critical Work Principles

### NEVER Guess - Always Research

**Core Rules**:
- ✅ Explicitly state "I don't know - let me research" when uncertain
- ✅ Search official docs BEFORE custom solutions
- ✅ Verify problems exist before attempting fixes
- ✅ Admit mistakes immediately when corrected
- ❌ Never claim certainty when uncertain
- ❌ Never implement workarounds before checking for official solutions

**Decision Framework**:
1. Do I know this with 100% certainty? → If NO, research first
2. Is there a standard library/API? → Check official docs FIRST
3. Have I verified this problem exists? → Check error messages, use diagnostics

**Critical Infrastructure Claims**: Before making ANY statement about Kubernetes, Docker, Pulumi, or GitHub Actions behavior:
1. STOP - Don't present theory yet
2. SEARCH - Look up official documentation
3. VERIFY - Cross-reference with at least 2 sources
4. STATE UNCERTAINTY - Say "I need to research this first" if unverified

### Always Consider Idempotency

**Core Rules**:
- ✅ Think through: 1st run, 2nd run, 3rd run
- ✅ Ask "what if this already exists?"
- ✅ Make operations idempotent
- ✅ Handle cleanup before adding new data
- ❌ Never assume data doesn't exist
- ❌ Never create duplicates without checking

**Example**:
```javascript
// ❌ Bad: Creates duplicates
const newLabels = [...existingLabels, 'my-label'];

// ✅ Good: Idempotent
const newLabels = [...existingLabels.filter(l => l !== 'my-label'), 'my-label'];
```

### ALWAYS Ask Before Deleting

**CRITICAL**: MUST ask for explicit confirmation before ANY deletion via GitHub CLI (`gh`).

**Rules**:
- ✅ List resources to delete and ASK first
- ✅ Wait for explicit "yes" before executing
- ✅ Explain WHY you think it's safe to delete
- ❌ Never run `gh secret remove` or `gh api -X DELETE` without asking

---

## Architecture Overview

### Monorepo Structure

1. **Web Frontend** (`./public-web`): Static HTML/CSS/JS documentation
2. **API Backend** (`./public-api`): PHP REST API with full-text search (PostgreSQL TSVectors)

### Build Pipeline

1. **Build Image**: Clones docs repo → Compiles Markdown→HTML → Runs `gulp build` → Produces static assets
2. **Runtime Images**:
   - API: nginx + PHP-FPM + compiled docs
   - Web: nginx + static files
3. **Database Init**: Kubernetes Job runs Phinx migrations + LexemeSeeder (indexes docs for search)

**Critical**: API search requires LexemeSeeder completion. Build failures break both web AND API.

### Deployment Architecture

- **Web**: nginx + static HTML
- **API**: nginx + PHP-FPM + Aphiria + compiled docs
- **Database**: PostgreSQL with TSVector indexes
- **Init**: Kubernetes Job (migrations + seeder)

---

## Infrastructure Anti-Patterns (CRITICAL)

### Port-Forwarding in CI/CD

❌ **NEVER** use `kubectl port-forward` in GitHub Actions
- It's a debugging tool, not automation
- Run cluster tasks inside the cluster (Kubernetes Jobs, init containers)

### Pulumi TypeScript Build Requirement

❌ **NEVER** run Pulumi without compiling TypeScript first
- Pulumi executes compiled JavaScript in `bin/`, not `.ts` source
- Changes to `.ts` have NO EFFECT until `npm run build`

**Required before EVERY Pulumi command**:
```bash
cd infrastructure/pulumi && npm run build
```

**Git commits**: ALWAYS commit both `.ts` AND compiled `.js` files

### kubectl Usage Policy

❌ **NEVER** use `kubectl` to modify cluster state
- kubectl is for inspection ONLY
- ALL infrastructure changes go through Pulumi

**Read-only operations**: `kubectl get`, `kubectl describe`, `kubectl logs`, `kubectl cluster-info`, `kubectl port-forward` (local debugging only)

**Decision**: Need to change state? → `npm run build` → `pulumi up`

### Pulumi Component Reusability

**CRITICAL**: All reusable infrastructure logic MUST be in components, not stacks.

- ✅ Components: Shared patterns, ConfigMaps, hardcoded constants
- ✅ Stacks: Configuration parameters only
- ❌ Never duplicate infrastructure code across stacks

### Kubernetes Resource Management

**NON-NEGOTIABLE**: ALL containers MUST have resource requests and limits.

**Why**: ResourceQuotas reject pods without limits, costs run away, cluster stability issues.

**Sizing**:
- Jobs/Init: 100m CPU / 128Mi memory (requests), 200m / 256Mi (limits)
- API: 250m CPU / 512Mi memory
- Web: 100m CPU / 256Mi memory

### Container Image Immutability

**CRITICAL**: Always use full SHA256 digests in production-like environments.

- ✅ Use full 64-char digests: `sha256:abc123...` (71 chars with prefix)
- ✅ Get from `docker/build-push-action` outputs
- ✅ Pass via workflow_dispatch inputs (type-safe, auditable)
- ❌ Never truncate digests (Docker rejects)
- ❌ Never use mutable tags (`:latest`, `:pr-123`)

### Cluster Connection Verification

**NEVER** assume which cluster kubectl is connected to.

**Before ANY kubectl command**:
1. Check endpoint: `kubectl cluster-info | head -1`
2. Compare with Pulumi: `pulumi stack output kubeconfig --stack <stack> --show-secrets | grep "server:"`
3. Use explicit kubeconfig for CI/CD debugging

### Container Architecture Validation

**NEVER** deploy without verifying ports match application protocol.

**Critical**:
- PHP-FPM speaks FastCGI on port 9000, NOT HTTP
- nginx speaks HTTP on port 80
- Probe protocol MUST match container (HTTP probe on FastCGI fails)
- Preview MUST use same architecture as production (no simplifying)

### Private Container Registry

**CRITICAL**: Private registries require imagePullSecrets.

- Store tokens in Pulumi ESC
- Create imagePullSecret in base stack
- Reference in ALL Deployments/Jobs/StatefulSets
- Same token for push (CI/CD) and pull (Kubernetes)

### GitHub Actions Gotchas

**workflow_dispatch ref**: MUST be branch name (`master`), not PR ref (`refs/pull/123/merge`)

---

## Constitution

**Location**: `specs/.specify/memory/constitution.md` (v1.0.0)

**Core Principles**:
1. PHP Framework Standards (PSR-4, PSR-12, strict types)
2. Documentation-First Development
3. Test Coverage (NON-NEGOTIABLE)
4. Static Analysis & Code Quality
5. Production Reliability

---

## Critical Workflow Rules

### Quality Gates (PHP)

Before completing ANY PHP task:
```bash
composer phpcs-fix  # Auto-fix code style
composer phpunit    # All tests
composer psalm      # Static analysis
```

**NEVER** skip these. If they fail, fix before proceeding.

### Test Coverage (Mandatory)

For every feature/bug fix:
- Unit tests (business logic)
- Integration tests (database, external deps)
- Contract tests (API endpoints)

Write tests FIRST (TDD).

### Git Workflow

**Stage new files**: `git add <new-file>` - NEVER leave unstaged

**Sensitive files to .gitignore**:
```gitignore
.env, *.key, *.pem, credentials.json, secrets.yaml, kubeconfig*
.idea/, .vscode/, *.swp
/vendor/, /node_modules/, /tmp/*, .phpunit.result.cache
.DS_Store, Thumbs.db
```

---

## Code Standards

### PHP

- PSR-4: `App\` → `src/`
- PSR-12 coding style
- `declare(strict_types=1);` in EVERY file
- Use `readonly` properties, value objects, enums
- Dependency Injection via Binders
- Parameterized queries ONLY

### Comments

- ❌ Don't comment self-explanatory code
- ✅ Do comment complex business logic, non-obvious decisions, workarounds

### YAML

- MUST end with `.yml`

---

## GitHub Secrets Documentation

**CRITICAL**: All secrets/PATs MUST be documented in `SECRETS.md`.

**Template**:
```markdown
### SECRET_NAME
**Why needed**: <explanation>
**Generate**: <steps with scopes>
**Update**: <rotation procedure>
**Cleanup**: <delete old token>
```

---

## Pre-Commit Checklist

**PHP**:
- [ ] `composer phpcs-fix`, `composer phpunit`, `composer psalm`
- [ ] New files staged
- [ ] Sensitive files in `.gitignore`
- [ ] Tests written
- [ ] No TODOs without issue tracking

**GitHub Actions**:
- [ ] Secrets documented in `SECRETS.md`
- [ ] PAT scopes minimal
- [ ] `workflow_dispatch` ref uses branch name (not `context.ref`)

---

## Common Tasks

### Adding Feature
1. Branch: `git checkout -b feature-name`
2. Write tests first (TDD)
3. Implement
4. Quality gates
5. Update docs
6. Commit + PR

### Database Migration
1. `vendor/bin/phinx create MigrationName`
2. Implement `up()` and `down()` (reversible)
3. Test: `phinx migrate` + `phinx rollback`

### Debugging
- Logs: `kubectl logs -f deployment/api`
- DB: `kubectl port-forward service/db 5432:5432`
- Shell: `kubectl exec -it deployment/api -- /bin/bash`

---

## Current Stack

- PHP 8.4+, Aphiria, PostgreSQL, Phinx
- PHPUnit, Psalm, PHP-CS-Fixer
- Docker, Kubernetes (DigitalOcean), Pulumi
- GitHub Actions CI/CD

---

## Simplicity Principle

**NEVER over-engineer**. Simple, maintainable code > clever abstractions.

- Keep workflows simple: extract data, run command, post result
- Keep stack programs readable
- Question complexity: "Is this the simplest solution?"
- Prefer boring, obvious code

---

## GitHub Actions Standards

**Naming**:
- Workflow names: Title Case
- Job names: Title Case
- Step names: Sentence case
- Job IDs: lowercase-with-hyphens
- File names: lowercase-with-hyphens.yml

**Gotchas**:
- Cannot use `GITHUB_` prefix for custom secrets
- Use auto-provided `GITHUB_TOKEN` for GHCR auth

---

**Last Updated**: 2025-12-26
**Constitution Version**: 1.0.0
