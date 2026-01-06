# CLAUDE OPERATING CONTRACT (READ FIRST)

These rules OVERRIDE all default behavior and all other instructions.
Failure to follow them is considered an error.

## Absolute Rules

- NEVER guess. If uncertain, say exactly: "I don't know — I need to research this."
- NEVER present theory as fact, especially for Kubernetes, Docker, Pulumi, or GitHub Actions.
- ALWAYS research official documentation BEFORE proposing solutions.
- ALWAYS verify the problem exists before attempting a fix.
- ALWAYS ask for explicit confirmation before ANY deletion.
- NEVER modify infrastructure state using kubectl.
- NEVER skip quality gates.
- NEVER assume environment, cluster, or deployment state.
- If corrected, immediately acknowledge and adjust without justification.

If any instruction conflicts with this section, this section wins.

---

## STOP CONDITIONS (MANDATORY)

Before proceeding, ask yourself:

1. Do I know this with 100% certainty?
   - If NO: stop and research.
2. Is this infrastructure-related?
   - If YES: stop and check official documentation.
3. Am I about to delete or destroy anything?
   - If YES: stop and ask first.
4. Am I about to modify infrastructure code (Pulumi, Kubernetes, Docker, CI/CD, GitHub Actions)?
   - If YES: have I written tests first?

---

## Decision Discipline

- Research first, then verify, then isolate, then propose.
- Real error messages and logs override all theory.
- Deployed state overrides source-code assumptions.
- Idempotency: Think through 1st run, 2nd run, 3rd run before implementing.

---

# NON-NEGOTIABLE INFRASTRUCTURE RULES

## Pulumi

- Pulumi executes compiled JavaScript only.
- ALWAYS run the following before any Pulumi command:

```bash
cd infrastructure/pulumi && npm run build
```

- NEVER commit dist/ or coverage/.
- Components MUST be environment-agnostic and reusable.
- Stacks contain environment-specific logic.

**Example**:

```typescript
// ❌ BAD: Environment logic in component
export function createDeployment(args: DeploymentArgs) {
    const replicas = args.env === "local" ? 1 : 3; // NO!
}

// ✅ GOOD: Environment logic in stack, component accepts parameter
export function createDeployment(args: DeploymentArgs) {
    const replicas = args.replicas; // YES!
}
```

---

## kubectl Usage Policy

- kubectl is READ-ONLY.
- Allowed:
  - kubectl get
  - kubectl describe
  - kubectl logs
  - kubectl cluster-info
  - kubectl port-forward (local debugging only)
- kubectl must NEVER be used to modify cluster state.

Any state change must go through Pulumi.

---

## Kubernetes Resources

ALL containers MUST have resource requests and limits:

- Jobs/Init: 100m CPU / 128Mi memory (requests), 200m / 256Mi (limits)
- API: 250m CPU / 512Mi memory
- Web: 100m CPU / 256Mi memory

**Why**: ResourceQuotas reject pods without limits, costs run away, cluster stability issues.

---

## Container Architecture

**CRITICAL**: Verify ports match application protocol.

- PHP-FPM speaks FastCGI on port 9000 (NOT HTTP)
- nginx speaks HTTP on port 80
- Probe protocol MUST match container protocol (HTTP probe on FastCGI fails)
- Preview MUST match production architecture (no simplifying)

---

## Container Images

- ALWAYS use full SHA256 digests in production-like environments
- Get from docker/build-push-action outputs
- NEVER use mutable tags (:latest, :pr-123)
- NEVER truncate digests (Docker rejects)

---

## Port Forwarding

- NEVER use kubectl port-forward in CI/CD.
- Run cluster tasks inside the cluster (Jobs, init containers).

---

# TESTING PHILOSOPHY (NON-NEGOTIABLE)

**ANY infrastructure change requires corresponding unit tests. No exceptions.**

If testing is hard, the code design is wrong.

## Required Design Patterns

- Dependency Injection
- Pure functions
- Configuration flags for tests (mark `@internal`)
- Separation of I/O from business logic

## Forbidden Patterns

- Mocking external systems instead of redesigning code
- Network or file dependencies in unit tests
- Framework workarounds without identifying the root cause

## When Stuck on Testing

1. Step back: "Is the code designed to be testable?"
2. Consider design: "Can I add a parameter to make this testable?"
3. Research limitations: "Are there known framework limitations?"
4. Root cause: "What's the fundamental problem here?"

**Key Insight**: If you find yourself fighting the testing framework, you're solving the wrong problem. The real problem is code that wasn't designed for testability.

**Example**:

```typescript
// ❌ BAD: Hard to test - requires real network call
const kubeconfig = cluster.name.apply((name) =>
    digitalocean.getKubernetesCluster({ name }).then((c) => c.kubeConfigs[0].rawConfig)
);

// ✅ GOOD: Testable - accepts flag to use static config
const kubeconfig = args.useStaticKubeconfig
    ? cluster.kubeConfigs[0].rawConfig // Tests use this
    : cluster.name.apply((name) => // Production uses this
          digitalocean.getKubernetesCluster({ name }).then((c) => c.kubeConfigs[0].rawConfig)
      );
```

---

# QUALITY GATES (MUST PASS 100%)

## PHP

```bash
composer phpcs-fix
composer phpunit
composer psalm
```

## TypeScript (from repository root)

```bash
npm run lint          # 0 errors, 0 warnings
npm run format:check  # 0 errors, 0 warnings
```

## Pulumi Infrastructure

```bash
cd infrastructure/pulumi
npm run build
npm test  # 100% coverage thresholds
```

**Jest Coverage Thresholds** (from `jest.config.js`):

```javascript
coverageThreshold: {
    global: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100
    }
}
```

## E2E Tests

```bash
cd tests/e2e
npm test  # Playwright smoke tests
```

**NON-NEGOTIABLE**:

- Zero lint errors
- Zero lint warnings
- 100% test pass rate
- 100% coverage for infrastructure
- No skipped tests
- Successful TypeScript compilation

---

# DELETION SAFETY RULE

Before ANY deletion (files, secrets, infrastructure, GitHub resources):

1. List exactly what will be deleted.
2. Explain why it is safe.
3. Ask explicitly: "Is this OK to delete?" and wait for an explicit "yes".
4. Wait for explicit approval.

No exceptions.

---

# GIT WORKFLOW

- ALWAYS stage new files: `git add <file>`
- NEVER leave new files unstaged
- NEVER commit: .env, *.key, *.pem, credentials.json, secrets.yaml, kubeconfig*
- NEVER commit: dist/, coverage/, node_modules/, vendor/, test-results/, playwright-report/

**Sensitive files to .gitignore**:

```gitignore
.env, *.key, *.pem, credentials.json, secrets.yaml, kubeconfig*
.idea/, .vscode/, *.swp
/vendor/, /node_modules/, /tmp/*, .phpunit.result.cache
.DS_Store, Thumbs.db
```

---

# ARCHITECTURE CONTEXT (REFERENCE ONLY)

## Project

- **Aphiria.com**: Documentation website for the Aphiria PHP framework
- **Language**: PHP 8.4+
- **Framework**: Aphiria
- **Repository**: https://github.com/aphiria/aphiria.com

## Monorepo Structure

1. **Web Frontend** (`./public-web`): Static HTML/CSS/JS documentation
2. **API Backend** (`./public-api`): PHP REST API with full-text search (PostgreSQL TSVectors)

## Build Pipeline

1. **Build Image**: Clones docs repo → Compiles Markdown→HTML → Runs `gulp build` → Produces static assets
2. **Runtime Images**:
   - API: nginx + PHP-FPM + compiled docs
   - Web: nginx + static files
3. **Database Init**: Kubernetes Job runs Phinx migrations + LexemeSeeder (indexes docs for search)

**Critical**: API search requires LexemeSeeder completion. Build failures break both web AND API.

## Deployment Architecture

- **Web**: nginx + static HTML
- **API**: nginx + PHP-FPM + Aphiria + compiled docs
- **Database**: PostgreSQL with TSVector indexes
- **Init**: Kubernetes Job (migrations + seeder)

---

# CODE STANDARDS

## PHP

- PSR-4: `App\` → `apps/api/src/`
- PSR-12 coding style
- `declare(strict_types=1);` in EVERY file
- Use `readonly` properties, value objects, enums
- Dependency Injection via Binders
- Parameterized queries ONLY

## TypeScript

- Use properties instead of getters/setters
- Use `readonly` properties when possible
- Use `enum`s for constants
- Use `interface`s for contracts
- Use `type`s for type aliases
- Use `const enum`s for compile-time constants
- Use `any` only for external APIs
- Use `unknown` only for untrusted input
- Use `never` only for impossible cases
- Use `assertNever()` to enforce exhaustiveness
- Use `assert()` for preconditions

## Comments

- ❌ Don't comment self-explanatory code
- ✅ Do comment complex business logic, non-obvious decisions, workarounds

## YAML

- MUST end with `.yml`

---

# DEBUGGING ORDER (MANDATORY)

When investigating deployment failures, follow this order (NEVER skip to theory):

## 1. Verify Cluster Context FIRST

```bash
kubectl cluster-info | head -1
pulumi stack output kubeconfig --stack <stack> --show-secrets | grep "server:"
```

These MUST match. Set `KUBECONFIG` explicitly if needed:

```bash
pulumi stack output kubeconfig --stack <stack> --show-secrets > /tmp/kubeconfig.yaml
export KUBECONFIG=/tmp/kubeconfig.yaml
```

## 2. Get Actual Error Logs

```bash
kubectl get pods -n <namespace>  # Find the pod
kubectl logs -n <namespace> <pod-name> -c <container-name>
kubectl describe pod -n <namespace> <pod-name>  # For init container issues
```

**The ACTUAL error message trumps all theory.**

## 3. Check Deployed State

```bash
kubectl get deployment -n <namespace> <name> -o yaml
```

Don't assume Pulumi state matches Kubernetes reality.

## 4. Check Pulumi History

```bash
pulumi stack history --stack <stack> -j | jq -r '.[] | "\(.version) \(.status) \(.startTime) \(.message)"'
```

Failed updates don't persist state changes. Last SUCCESSFUL update matters.

**Debugging Philosophy**:

- ✅ kubectl logs → Shows actual error
- ✅ kubectl get/describe → Shows actual state
- ✅ pulumi stack history → Shows what succeeded
- ❌ Assuming code deployed = code running
- ❌ Theorizing about paths without checking
- ❌ Looking at source code before checking what's deployed

## Pulumi Update Failure Behavior

**CRITICAL**: When `pulumi up` fails:

- Resources may be partially created/updated in Kubernetes
- **BUT** Pulumi's state file is NOT updated with new desired inputs
- The state still reflects the last SUCCESSFUL update
- A failed update means you need to fix the issue and re-run - the changes weren't applied

**Implications**:

- If update #7 fails, but update #4 succeeded, the stack state reflects update #4's code
- Even if you deployed from the correct commit, a failed update means old state persists
- Always check: `pulumi stack history` to find last successful update

---

# LOCAL DEBUGGING

## Minikube

- **FIRST**: Check minikube tunnel is running: `ps aux | grep "minikube tunnel"`
  - If not running: `minikube tunnel` (requires sudo password)
  - Without tunnel, LoadBalancer services won't be accessible at 127.0.0.1
- Logs: `kubectl logs -f deployment/api`
- DB: `kubectl port-forward service/db 5432:5432`
- Shell: `kubectl exec -it deployment/api -- /bin/bash`
- Check Gateway: `kubectl get gateway -A`
- Check HTTPRoutes: `kubectl get httproute -A`

## Remote (Preview/Production)

- Logs: `kubectl logs -f deployment/api`
- DB: `kubectl port-forward service/db 5432:5432`
- Shell: `kubectl exec -it deployment/api -- /bin/bash`

---

# PRE-COMMIT CHECKLIST

## PHP

- [ ] `composer phpcs-fix`, `composer phpunit`, `composer psalm`
- [ ] New files staged
- [ ] Sensitive files in `.gitignore`
- [ ] Tests written
- [ ] No TODOs without issue tracking

## TypeScript (linting/formatting from root)

- [ ] `npm install` (in root)
- [ ] `npm run lint` (0 errors, 0 warnings)
- [ ] `npm run format:check` (0 errors, 0 warnings)
- [ ] New files staged
- [ ] `dist/`, `coverage/`, `playwright-report/`, `test-results/` NOT committed (gitignored)

## TypeScript/Pulumi (infrastructure-specific)

- [ ] `cd infrastructure/pulumi && npm run build` (compiles TypeScript)
- [ ] `npm test` (100% pass rate, meets coverage thresholds)

## TypeScript/E2E (e2e-specific)

- [ ] `cd tests/e2e && npm test` (smoke tests pass)

## GitHub Actions

- [ ] Secrets documented in `SECRETS.md`
- [ ] PAT scopes minimal
- [ ] `workflow_dispatch` ref uses branch name (not `context.ref`)

---

# COMMON TASKS

## Adding Feature

1. Branch: `git checkout -b feature-name`
2. Write tests first (TDD)
3. Implement
4. Quality gates
5. Update docs
6. Commit + PR

## Database Migration

1. `vendor/bin/phinx create MigrationName`
2. Implement `up()` and `down()` (reversible)
3. Test: `phinx migrate` + `phinx rollback`

---

# SIMPLICITY RULE

Prefer boring, obvious solutions.
Avoid clever abstractions.
If complexity feels high, question it.

**NEVER over-engineer**. Simple, maintainable code > clever abstractions.

- Keep workflows simple: extract data, run command, post result
- Keep stack programs readable
- Question complexity: "Is this the simplest solution?"
- Prefer boring, obvious code

---

# GITHUB ACTIONS STANDARDS

**Naming**:

- Workflow names: Title Case
- Job names: Title Case
- Step names: Sentence case
- Job IDs: lowercase-with-hyphens
- File names: lowercase-with-hyphens.yml

**Gotchas**:

- Cannot use `GITHUB_` prefix for custom secrets
- Use auto-provided `GITHUB_TOKEN` for GHCR auth
- `workflow_dispatch` ref MUST be branch name (`master`), not PR ref (`refs/pull/123/merge`)

---

# CURRENT STACK

- PHP 8.4+, Aphiria, PostgreSQL, Phinx
- PHPUnit, Psalm, PHP-CS-Fixer
- Docker, Kubernetes (DigitalOcean), Pulumi
- GitHub Actions CI/CD

---

# GITHUB SECRETS DOCUMENTATION

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

# CONSTITUTION

**Location**: `specs/.specify/memory/constitution.md` (v1.0.0)

**Core Principles**:

1. PHP Framework Standards (PSR-4, PSR-12, strict types)
2. Documentation-First Development
3. Test Coverage (NON-NEGOTIABLE)
4. Static Analysis & Code Quality
5. Production Reliability

---

Last Updated: 2026-01-06
This file is authoritative.
