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

**Critical Infrastructure Claims Checklist**:

Before making ANY statement about how infrastructure systems work (Kubernetes, Docker, Pulumi, GitHub Actions), you MUST:

1. **STOP** - Do not present any theory yet
2. **SEARCH** - Look up official documentation for the exact behavior
3. **VERIFY** - Cross-reference with at least 2 sources
4. **STATE UNCERTAINTY** - If you haven't verified, say "I need to research this first"
5. **NEVER GUESS** - Especially about core platform behaviors like:
   - Kubernetes rolling updates and pod lifecycle
   - Docker layer caching and BuildKit behavior
   - Pulumi state management and resource updates
   - GitHub Actions workflow triggers and job dependencies

**Real Example of This Mistake**:
- ❌ **WRONG**: "Kubernetes doesn't automatically restart pods when image digest changes" (stated as fact without checking docs)
- ✅ **CORRECT**: "I'm not certain how Kubernetes handles Deployment spec changes - let me check the official docs first" (then research and verify)

**Why This Matters**:
Making incorrect statements about platform behavior leads to:
- Wasted time implementing unnecessary workarounds
- Loss of user trust when corrected by external sources
- Potential production issues from misunderstanding core behaviors

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

### Pulumi TypeScript Build Requirement (CRITICAL)

❌ **NEVER** run Pulumi commands without compiling TypeScript first
- Pulumi executes the COMPILED JavaScript in `bin/`, not the TypeScript source
- Changes to `.ts` files have NO EFFECT until you run `npm run build`
- Forgetting to compile leads to deploying OLD CODE with OLD CONFIGURATIONS

✅ **ALWAYS** compile TypeScript before EVERY Pulumi command:
```bash
# REQUIRED before pulumi up/preview/destroy/refresh
cd /home/dyoung/PHPStormProjects/aphiria_com/infrastructure/pulumi && npm run build
```

**Decision Framework**:
1. **Did I edit any `.ts` file?**
   - YES → Run `npm run build` BEFORE any Pulumi command
   - NO → Still run `npm run build` if unsure

2. **Am I about to run `pulumi up` or `pulumi preview`?**
   - ALWAYS run `npm run build` first, even if you think you didn't change anything

**Example - Wrong Approach:**
```bash
# ❌ Edit preview-pr.ts: change cpu: "1" to cpu: "1200m"
# ❌ Run: pulumi up
# ❌ Result: Deploys with cpu: "1" because JavaScript wasn't recompiled
```

**Example - Correct Approach:**
```bash
# ✅ Edit preview-pr.ts: change cpu: "1" to cpu: "1200m"
# ✅ Run: npm run build (compile TypeScript to JavaScript)
# ✅ Run: pulumi up (deploys with cpu: "1200m")
# ✅ Verify: kubectl get resourcequota (confirms "1200m")
```

**Git Commit Checklist**:
- [ ] Run `npm run build` after TypeScript changes
- [ ] Commit BOTH `.ts` source files AND compiled `.js` files in `bin/`
- [ ] Never commit only `.ts` without corresponding `.js` changes

### kubectl Usage Policy (CRITICAL)

❌ **NEVER** use `kubectl` to modify cluster state
- `kubectl` is a **debugging and inspection tool ONLY**
- ALL infrastructure changes MUST go through Pulumi
- If you find yourself using `kubectl patch`, `kubectl apply`, `kubectl edit`, `kubectl delete` (except for debugging), you are doing it WRONG

✅ **ALWAYS** use `kubectl` for read-only operations:
- `kubectl get` - Inspect resources
- `kubectl describe` - Get detailed resource information
- `kubectl logs` - View pod logs
- `kubectl cluster-info` - Verify cluster connection
- `kubectl port-forward` - Local debugging ONLY (never in CI/CD)

**Decision Framework**:
1. **Do I need to change cluster state?**
   - YES → Compile TypeScript (`npm run build`), then use Pulumi (`pulumi up`)
   - NO → Use kubectl for inspection

2. **Is Pulumi not applying my changes?**
   - WRONG: Use kubectl to manually fix it, then `pulumi refresh`
   - CORRECT: Investigate WHY Pulumi isn't applying the change (Did you compile TypeScript? Check `git diff bin/`)

3. **Is there a resource that needs cleanup?**
   - WRONG: `kubectl delete resource-name`
   - CORRECT: Remove from Pulumi code, compile (`npm run build`), run `pulumi up` (or `pulumi destroy` for entire stack)

**Example - Wrong Approach:**
```bash
# ❌ Changed preview-pr.ts ResourceQuota from 1 CPU to 1200m
# ❌ Pulumi didn't apply it (forgot to compile!)
# ❌ Manual fix: kubectl patch resourcequota preview-pr-107-quota ...
# ❌ Sync state: pulumi refresh
# Result: State is now correct but you didn't fix the root problem
```

**Example - Correct Approach:**
```bash
# ✅ Changed preview-pr.ts ResourceQuota from 1 CPU to 1200m
# ✅ Run: npm run build (compile TypeScript)
# ✅ Run: pulumi preview --diff (check what Pulumi will change)
# ✅ If ResourceQuota isn't in the diff, investigate:
#    - Did the compilation succeed? Check bin/stacks/preview-pr.js
#    - Is the resource properly imported in Pulumi state?
#    - Is there a different stack managing this resource?
# ✅ Run: pulumi up (let Pulumi apply the change)
# ✅ Verify: kubectl get resourcequota (confirm change applied)
```

### Pulumi Component Reusability Principle

**CRITICAL: All reusable infrastructure logic MUST be in components, not stack files.**

✅ **ALWAYS** create components for:
- Any Kubernetes resources used by 2+ stacks
- ConfigMap/Secret creation patterns
- Database initialization logic
- Any infrastructure pattern with hardcoded constants

❌ **NEVER** duplicate infrastructure code across stacks:
- Stack files should only contain configuration parameters
- Stack files should only call component functions
- Hardcoded values (ports, image names, resource limits) belong in components

**Example - WRONG:**
```typescript
// ❌ preview-pr.ts - Manual ConfigMap creation
const configMap = new k8s.core.v1.ConfigMap("config", {
    data: {
        DB_PORT: "5432",  // Hardcoded in stack
        APP_BUILDER_API: "\\Aphiria\\Framework\\...",  // Hardcoded in stack
    },
});
```

**Example - CORRECT:**
```typescript
// ✅ components/api-deployment.ts - Component handles ConfigMaps
export function createAPIDeployment(args: APIDeploymentArgs) {
    const DB_PORT = "5432";  // Hardcoded in component (shared across all stacks)
    const configMap = new k8s.core.v1.ConfigMap(...);
    // Component creates all resources internally
}

// ✅ preview-pr.ts - Stack only provides parameters
createAPIDeployment({
    dbHost: postgresqlHost,  // Environment-specific
    dbName: "aphiria_pr_123",  // Environment-specific
    apiUrl: "https://123.pr-api.aphiria.com",  // Environment-specific
});
```

### Decision Framework: Where Should This Run?

When implementing any infrastructure task, ask:

1. **Does this need access to cluster-internal resources?**
   - YES → Run inside cluster (Job, init container, sidecar)
   - NO → Run from CI/CD runner is acceptable

2. **Is this a one-time setup task or ongoing operation?**
   - One-time → Kubernetes Job

3. **Is this logic shared across multiple stacks?**
   - YES → Create a component function
   - NO → Inline in stack is acceptable (but consider future reuse)
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

### Cluster Connection Verification (CRITICAL)

**NEVER assume which cluster kubectl is connected to. ALWAYS verify before running commands.**

**The Problem**: Multiple clusters exist (production, preview, local). Running commands against the wrong cluster causes:
- Deleting resources from production when debugging preview issues
- State desync between Pulumi and actual cluster
- Wasted hours debugging phantom problems

**REQUIRED VERIFICATION STEPS**:

Before ANY kubectl command during debugging:

1. **Check cluster endpoint**:
   ```bash
   kubectl cluster-info | head -1
   # Expected: Kubernetes control plane is running at https://<EXPECTED-CLUSTER-ID>.k8s.ondigitalocean.com
   ```

2. **Compare with expected cluster from Pulumi**:
   ```bash
   cd infrastructure/pulumi
   pulumi stack output kubeconfig --stack preview-base --show-secrets | grep "server:"
   # Verify server matches kubectl cluster-info output
   ```

3. **Use explicit kubeconfig when debugging CI/CD issues**:
   ```bash
   # DON'T rely on default context
   kubectl get pods -n preview-pr-107  # ❌ MAY BE WRONG CLUSTER

   # DO use explicit kubeconfig from Pulumi
   pulumi stack output kubeconfig --stack preview-base --show-secrets > /tmp/preview-kubeconfig.yaml
   kubectl --kubeconfig=/tmp/preview-kubeconfig.yaml get pods -n preview-pr-107  # ✅ CORRECT
   ```

**Real Example of This Mistake**:
- GitHub Actions deploys to preview cluster (`e1284e62-00b6...`)
- Local kubectl connected to production cluster (`c0bc903e-71c8...`)
- Deleted namespace from production thinking it was preview
- Spent hours debugging "missing namespace" that actually existed in preview cluster
- 10-hour deployment hang because looking at wrong cluster

**Prevention**:
- Add cluster endpoint to shell prompt
- Use kubectl contexts with descriptive names (`kubectl config rename-context`)
- Always run `kubectl cluster-info` before destructive operations
- Export KUBECONFIG explicitly when debugging CI/CD deployments

### Container Architecture Validation (CRITICAL)

**NEVER deploy containers without verifying port configuration matches application architecture.**

**The Problem**: Container ports must match application protocol and Kubernetes probes:
- PHP-FPM speaks FastCGI on port 9000, NOT HTTP
- nginx speaks HTTP on port 80
- Kubernetes probes must match the protocol the container actually speaks
- Mismatches cause CrashLoopBackOff and silent failures

**REQUIRED VALIDATION CHECKLIST**:

Before deploying any container:

1. **Verify Dockerfile EXPOSE matches Deployment containerPort**:
   ```dockerfile
   # Dockerfile: EXPOSE 9000 → Deployment: containerPort: 9000 ✅
   # Dockerfile: EXPOSE 9000 → Deployment: containerPort: 80 ❌ WRONG
   ```

2. **Verify probe protocol matches container**:
   ```typescript
   // ❌ WRONG: HTTP probe on FastCGI port
   livenessProbe: {
       httpGet: { path: "/", port: 9000 }  // PHP-FPM doesn't speak HTTP!
   }

   // ✅ CORRECT: TCP probe on FastCGI port OR HTTP probe on nginx
   livenessProbe: {
       tcpSocket: { port: 9000 }  // PHP-FPM: TCP check
   }
   // OR use nginx sidecar with HTTP probe on port 80
   ```

3. **Verify multi-container architecture matches production**:
   - If production uses nginx + PHP-FPM sidecar pattern, preview MUST use same pattern
   - If production uses init containers, preview MUST use same pattern
   - NEVER simplify container architecture for preview environments

**Container Architecture Patterns**:

**PHP API (nginx + PHP-FPM sidecar)**:
```typescript
// ✅ CORRECT: Production pattern with init + nginx + PHP-FPM
{
    initContainers: [{
        name: "copy-code",
        image: "app-api:digest",
        command: ["cp", "-Rp", "/app/.", "/shared"],
        volumeMounts: [{ name: "shared", mountPath: "/shared" }]
    }],
    containers: [
        {
            name: "nginx",
            image: "nginx:alpine",
            ports: [{ containerPort: 80 }],  // HTTP
            livenessProbe: { httpGet: { path: "/health", port: 80 } },  // ✅ HTTP probe
            volumeMounts: [
                { name: "shared", mountPath: "/usr/share/nginx/html" },
                { name: "nginx-config", mountPath: "/etc/nginx/conf.d/default.conf", subPath: "default.conf" }
            ]
        },
        {
            name: "php-fpm",
            image: "app-api:digest",
            ports: [{ containerPort: 9000 }],  // FastCGI
            volumeMounts: [{ name: "shared", mountPath: "/usr/share/nginx/html" }]
        }
    ],
    volumes: [
        { name: "shared", emptyDir: {} },
        { name: "nginx-config", configMap: { name: "nginx-config" } }
    ]
}
```

**Static Web (nginx only)**:
```typescript
// ✅ CORRECT: Static content - HTTP on port 80
{
    containers: [{
        name: "web",
        image: "app-web:digest",
        ports: [{ containerPort: 80 }],  // HTTP
        livenessProbe: { httpGet: { path: "/", port: 80 } }  // ✅ HTTP probe
    }]
}
```

**Real Example of This Mistake**:
- API Dockerfile changed to `php:8.4-fpm` (port 9000, FastCGI only)
- Deployment still configured for port 80 with HTTP probes
- Result: 189 pod restarts over 10 hours (CrashLoopBackOff)
- PHP-FPM started fine, but HTTP probe failed → Kubernetes killed pod → repeat
- Never became ready because probe protocol didn't match application

**Prevention**:
- Test container locally: `docker run -p 80:80 app:latest && curl localhost:80`
- Add container tests to CI: Verify exposed ports respond to expected protocol
- Document container architecture in Dockerfile comments
- Use production architecture patterns for ALL environments (dev, preview, production)

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

**Comment Guidelines** (IMPORTANT):
- ❌ **DON'T** add comments for self-explanatory code:
  - `export const namespace = "default"` - NO COMMENT NEEDED
  - `const maxRetries = 3` - NO COMMENT NEEDED
  - Simple assignments, obvious variable names, standard patterns
- ✅ **DO** add comments for:
  - Complex business logic that isn't immediately obvious
  - Non-obvious technical decisions ("why" not "what")
  - Workarounds with TODO/FIXME linked to issues
  - Public API contracts (PHPDoc/JSDoc)
- **Rule of thumb**: If the code is self-documenting (clear variable names, obvious purpose), don't add a comment

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

## Kubernetes & Container Registry Patterns

### Private Container Registry Authentication

**CRITICAL**: When deploying to Kubernetes from **private** container registries (GHCR, Docker Hub, etc.), you MUST configure imagePullSecrets.

**Common Mistake**:
```typescript
// ❌ WRONG: No imagePullSecrets for private registry
const deployment = new k8s.apps.v1.Deployment("web", {
    spec: {
        template: {
            spec: {
                containers: [{
                    image: "ghcr.io/myorg/myapp@sha256:...",  // Private image
                }],
                // Missing imagePullSecrets!
            },
        },
    },
});
```

**Correct Approach**:
```typescript
// ✅ CORRECT: Create imagePullSecret and reference it
const imagePullSecret = new k8s.core.v1.Secret("registry-pull-secret", {
    metadata: { namespace: "default" },
    type: "kubernetes.io/dockerconfigjson",
    stringData: {
        ".dockerconfigjson": pulumi.interpolate`{
            "auths":{
                "ghcr.io":{
                    "username":"your-username",
                    "password":"${registryToken}"
                }
            }
        }`,
    },
}, { provider: k8sProvider });

const deployment = new k8s.apps.v1.Deployment("web", {
    spec: {
        template: {
            spec: {
                containers: [{
                    image: "ghcr.io/myorg/myapp@sha256:...",
                }],
                imagePullSecrets: [{ name: "registry-pull-secret" }],  // ✅ Required!
            },
        },
    },
}, { dependsOn: [imagePullSecret] });
```

**Why This Matters**:
- Public images (Docker Hub official images, etc.) work without authentication
- Private images (GHCR, private Docker Hub repos) fail with `401 Unauthorized` or `ErrImagePull`
- Error appears during pod creation, NOT during deployment validation
- Pulumi won't catch this - it's a runtime Kubernetes error

**Best Practice**:
- Store registry tokens in Pulumi ESC (secrets management)
- Create imagePullSecret in base stack (shared across namespaces)
- Reference secret in all Deployments, StatefulSets, Jobs, etc.
- Use the **same token** for pushing (CI/CD) and pulling (Kubernetes)

**SpecKit Checklist**:
- [ ] All Deployments using private images have `imagePullSecrets` configured
- [ ] imagePullSecret created in base infrastructure stack
- [ ] Registry token stored in Pulumi ESC, not hardcoded
- [ ] Token has `read:packages` scope (for pulling images)

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

- **Secret naming**: Cannot use `GITHUB_` prefix for custom secrets (reserved by GitHub system). Use `GITHUB_TOKEN` (auto-provided) for GHCR authentication instead of custom PATs.

---

**Last Updated**: 2025-12-20
**Constitution Version**: 1.0.0
