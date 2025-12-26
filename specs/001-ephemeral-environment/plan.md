# Implementation Plan: Pull Request Ephemeral Environments

**Branch**: `001-ephemeral-environment` | **Date**: 2025-12-19 (Updated: 2025-12-22) | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-ephemeral-environment/spec.md`

## Summary

Implement ephemeral, pull-request scoped preview environments that allow maintainers to validate changes in production-like settings before merging. Each PR gets an isolated environment with predictable URLs (`{PR_NUMBER}.pr.aphiria.com` for web, `{PR_NUMBER}.pr-api.aphiria.com` for API), gated behind maintainer approval for security in this open-source repository. Environments automatically update on new commits and self-destruct on PR closure/merge.

**Key architectural decisions**:
- **Full Pulumi migration**: Replaced Helm/Kustomize with Pulumi for all environments (local, preview, production)
- **Separate preview cluster**: Dedicated DigitalOcean cluster (`aphiria-com-preview-cluster`) isolated from production
- **Pulumi ESC**: Centralized secret management for CD-specific credentials
- **GitHub Container Registry**: Migration from DockerHub to ghcr.io for image storage
- **Build-once-deploy-many**: Immutable image digests tracked via PR labels, promoted from preview to production

## Technical Context

**Language/Version**: PHP 8.4+ (application), TypeScript 5.x (Pulumi infrastructure), Bash (automation scripts)

**Primary Dependencies**:
- **Infrastructure as Code**: Pulumi 3.x with TypeScript
- **Container Orchestration**: Kubernetes 1.28+
- **Cloud Provider**: DigitalOcean (Kubernetes clusters, managed PostgreSQL not used)
- **CI/CD**: GitHub Actions (workflow orchestration)
- **Container Registry**: GitHub Container Registry (ghcr.io)
- **TLS Certificates**: cert-manager with Let's Encrypt
- **Gateway API**: nginx-gateway-fabric (Gateway API implementation)
- **Secrets Management**: Pulumi ESC (Environment, Secrets, Configuration)

**Storage**:
- **Strategy**: Shared PostgreSQL instance in preview cluster (persistent)
- **Per-PR Isolation**: Logical databases (`aphiria_pr_{PR_NUMBER}`) within shared instance
- **Rationale**: Cost-effective (single instance vs. multiple), fast provisioning (database creation < instance deployment), industry-standard pattern

**Testing**:
- **PHP Application**: PHPUnit (existing), Psalm (static analysis), PHP-CS-Fixer (code style)
- **Infrastructure**: Pulumi TypeScript compilation (`npm run build`), Kubernetes manifest validation
- **Integration**: End-to-end PR lifecycle testing (open → deploy → update → cleanup)
- **Pulumi TypeScript**: ESLint, Prettier (formatting)

**Target Platform**: Kubernetes on DigitalOcean
- **Preview cluster**: `aphiria-com-preview-cluster` (dedicated, managed via `preview-base` stack)
- **Production cluster**: `aphiria-com-cluster` (existing, managed via `production` stack)
- **Local development**: Minikube (managed via `local` stack)

**Project Type**: Infrastructure/DevOps (Pulumi TypeScript + GitHub Actions workflows) with minimal PHP application changes

**Performance Goals**:
- Preview environment provisioning: <5 minutes from approval to accessible URLs
- Deployment updates: <3 minutes from commit to updated environment
- Docker builds: <10 minutes on cache miss, <2 minutes on cache hit
- Base stack deployment: <8 minutes for full cluster + PostgreSQL + Gateway provisioning

**Constraints**:
- **Security**: No production secrets exposed to untrusted PRs (workflow_run trigger + environment protection)
- **Concurrency**: Support up to 10 concurrent preview environments (ResourceQuotas enforced)
- **TLS**: Wildcard certificate rate limits (single cert for `*.pr.aphiria.com` and `*.pr-api.aphiria.com`)
- **Build-once-deploy-many**: Same image digest for preview and production (tracked via PR labels)
- **Open source safety**: Maintainer approval required for external contributor PRs

**Scale/Scope**:
- Single repository: `aphiria/aphiria.com`
- Active PRs at peak: 5-10
- Environment lifetime: Typically <48 hours
- Pulumi stacks: 1 base stack (`preview-base`), N per-PR stacks (`preview-pr-{N}`), 1 production stack, 1 local stack

**Image Digest Propagation** (Updated 2025-12-23):
- **Build workflow**: Captures full SHA256 digests (64 hex chars) from docker/build-push-action outputs
- **Preview deployment**: Build workflow triggers deploy workflow via `workflow_dispatch` with digests as **typed inputs**
- **Production deployment**: Build-from-master workflow passes digests directly to Pulumi stack config
- **Registry**: GitHub Container Registry (ghcr.io/aphiria/aphiria.com-{web|api})
- **Rationale for workflow_dispatch**:
  - ✅ **Type-safe**: Inputs are explicitly declared, typed, and validated by GitHub Actions
  - ✅ **No parsing**: Direct string parameters, no JSON/regex/comment parsing required
  - ✅ **Auditable**: GitHub audit log shows exact digests used for each deployment
  - ✅ **Manual override**: Allows manual trigger with specific digests for rollback scenarios
  - ✅ **No storage overhead**: No artifacts to upload/download/expire, no label length limits (100 chars)
  - ❌ **Rejected alternatives**:
    - PR labels: 100-character limit (fatal for full SHA256 digests which are 71 chars: `sha256:` + 64 hex)
    - GitHub Artifacts: Extra upload/download steps, retention limits, unnecessary complexity
    - Comment parsing: Fragile, not machine-readable, can be edited/deleted by users
  - **Enterprise pattern**: Workflow inputs are the idiomatic GitHub Actions mechanism for workflow-to-workflow communication

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. PHP Framework Standards
- **Status**: ✅ COMPLIANT (NOT APPLICABLE to infrastructure code)
- **Rationale**: This feature is primarily infrastructure (Pulumi TypeScript, GitHub Actions YAML, Bash scripts). Minimal PHP application code changes required (only environment variable handling, already compliant).
- **Evidence**: No new PHP classes or business logic. Existing code in `src/Databases/Binders/SqlBinder.php` already reads `DB_NAME` from environment, compliant with PSR-4/PSR-12.

### II. Documentation-First Development
- **Status**: ✅ COMPLIANT
- **Evidence**:
  - This feature does not modify documentation rendering or search functionality
  - Preview environments serve full compiled documentation (all versions, all pages)
  - LexemeSeeder runs in preview environments to populate search index
  - README.md updated with preview environment usage instructions (FR-069, FR-070)
  - `SECRETS.md` created to document secrets management (FR-071)

### III. Test Coverage (NON-NEGOTIABLE)
- **Status**: ✅ COMPLIANT
- **Plan**:
  - **Unit tests**: N/A (no PHP business logic added)
  - **Integration tests**: End-to-end PR lifecycle testing (open → build → deploy → update → cleanup)
  - **Contract tests**: GitHub Actions workflow validation, Pulumi stack deployment verification
  - **Infrastructure validation**: Pulumi TypeScript compilation (`npm run build`), ESLint/Prettier checks
- **Coverage**: All workflows tested in preview cluster before production migration

### IV. Static Analysis & Code Quality
- **Status**: ✅ COMPLIANT
- **Plan**:
  - **Pulumi TypeScript**: ESLint (`npm run lint`), Prettier (`npm run format`), TypeScript compiler (`npx tsc`)
  - **GitHub Actions YAML**: Workflow syntax validation (automatic on push)
  - **Bash scripts**: No new scripts requiring shellcheck (deployment logic in Pulumi)
  - **PHP**: No new PHP code requiring Psalm/PHP-CS-Fixer

### V. Production Reliability
- **Status**: ✅ COMPLIANT
- **Plan**:
  - **Database migrations**: Phinx migrations run in preview environments via Kubernetes Job (idempotent)
  - **Configuration**: All secrets migrated to Pulumi ESC (FR-083-097), documented in `SECRETS.md`
  - **Kubernetes manifests**: Generated by Pulumi (type-safe), validated before deployment
  - **Failure handling**: Retry logic for base stack (3 attempts, progressive backoff), health checks for deployments
  - **Logging**: Structured deployment status posted to PR comments, GitHub Actions logs
  - **Reversibility**: Preview environments isolated (separate cluster), `pulumi destroy` for cleanup

### VI. CI/CD & Infrastructure Reuse
- **Status**: ⚠️ PARTIALLY COMPLIANT (reusable workflows planned, not yet implemented)
- **Current state**:
  - ✅ **Pulumi stacks**: Shared components (`components/`) reused across `local`, `preview-base`, `preview-pr-*`, `production` stacks
  - ✅ **Stack configuration**: Environment differences expressed via `Pulumi.{stack}.yml` config files and ESC environments
  - ❌ **GitHub Actions workflows**: Separate workflows for preview (`build-preview-images.yml`, `deploy-preview.yml`) vs. production (not yet migrated)
- **Plan**:
  - **FR-048-050**: Create reusable workflows (`build-images.yml`, `deploy-pulumi.yml`) with environment parameterization
  - **NFR-011**: Refactor preview workflows to use reusable patterns, then create production workflows using same base
- **Justification**: Preview implementation completed first to validate architecture; production migration uses lessons learned

### Additional Consideration: Security (Open Source)
- **Requirement**: Preview deployments MUST be gated behind maintainer approval (FR-011, FR-012)
- **Implementation**:
  - **workflow_run trigger**: Deploy workflow runs on master branch code (prevents workflow tampering)
  - **Environment protection**: `preview` environment requires manual approval for non-maintainers
  - **Auto-approval**: Maintainer PRs auto-approved via GitHub API (PAT with `repo`, `read:org` scopes)
  - **Secrets**: DigitalOcean tokens, PostgreSQL passwords stored in Pulumi ESC (scoped per environment)
- **Threat Model**: Forked PRs cannot trigger privileged deployments automatically, cannot access ESC secrets

**GATE RESULT**: ✅ PASS with minor deficiency
- **Action item**: Create reusable workflows after preview implementation stabilizes (tracked in spec.md Polish Tasks T070-T072)
- **Rationale**: Constitution Principle VI is new (v1.1.0, added 2025-12-22). Preview implementation predates this principle. Refactoring to reusable workflows is planned but not blocking.

## Project Structure

### Documentation (this feature)

```text
specs/001-ephemeral-environment/
├── plan.md              # This file
├── spec.md              # Feature specification (comprehensive, 4 clarification sessions)
├── research.md          # Phase 0: Pulumi vs Helm/Kustomize decision, ESC architecture, cluster strategy
├── data-model.md        # Phase 1: Ephemeral environment state model, database schema
├── quickstart.md        # Phase 1: Usage guide for maintainers and contributors
├── contracts/           # Phase 1: GitHub Actions workflow contracts, PR comment format
│   └── workflow-api.md  # Workflow inputs/outputs, event schemas
├── checklists/          # Feature-specific validation checklists
└── tasks.md             # Phase 2: Implementation tasks (generated by /speckit.tasks)
```

### Source Code (repository root)

**Actual implementation** (Pulumi-based, not Helm/Kustomize):

```text
infrastructure/
└── pulumi/
    ├── index.ts                    # Pulumi program entry point (stack routing)
    ├── Pulumi.yaml                 # Pulumi project definition
    ├── Pulumi.*.yml                # Stack configuration files (local, preview-base, production)
    ├── package.json                # Node.js dependencies (Pulumi providers)
    ├── tsconfig.json               # TypeScript configuration
    ├── .eslintrc.js                # ESLint configuration
    ├── .prettierrc                 # Prettier configuration
    ├── stacks/
    │   ├── local.ts                # Local Minikube stack
    │   ├── preview-base.ts         # Preview cluster + PostgreSQL + Gateway (persistent)
    │   ├── preview-pr.ts           # Per-PR ephemeral resources (namespace, deployments)
    │   └── production.ts           # Production cluster deployment
    ├── components/
    │   ├── index.ts                # Component exports (barrel file)
    │   ├── types.ts                # Shared TypeScript types and interfaces
    │   ├── kubernetes.ts           # Kubernetes utilities (namespace, ResourceQuota, NetworkPolicy)
    │   ├── database.ts             # PostgreSQL deployment component
    │   ├── db-migration.ts         # Database migration Job component (Phinx)
    │   ├── api-deployment.ts       # Reusable API deployment component
    │   ├── web-deployment.ts       # Reusable web deployment component
    │   ├── gateway.ts              # Gateway API Gateway component
    │   ├── http-route.ts           # Gateway API HTTPRoute component
    │   └── helm-charts.ts          # Helm chart deployment helpers (cert-manager, nginx-gateway)
    ├── docs/
    │   └── preview/                # Preview environment documentation
    └── bin/                        # Compiled JavaScript output (gitignored)

.github/
└── workflows/
    ├── test.yml                    # PHP testing + Pulumi TypeScript build verification
    ├── build-preview-images.yml    # Multi-stage Docker builds for preview
    ├── build-master-cache.yml      # Populate GHA cache for faster PR builds
    ├── deploy-preview.yml          # Preview environment deployment (workflow_run trigger)
    └── cleanup-preview.yml         # Preview environment cleanup on PR close/merge

infrastructure/docker/
├── build/
│   └── Dockerfile                  # Build image: documentation compilation
└── runtime/
    ├── api/
    │   └── Dockerfile              # API image: nginx + PHP-FPM + compiled docs
    └── web/
        └── Dockerfile              # Web image: nginx + static HTML/CSS/JS

infrastructure/kubernetes/          # DEPRECATED (Kustomize manifests, preserved for reference)
└── ...                             # To be moved to kubernetes-deprecated/ after production migration
```

**Structure Decision**: Pulumi-centric infrastructure management. All environments (local, preview, production) managed via Pulumi stacks with shared TypeScript components. GitHub Actions workflows orchestrate Docker builds and Pulumi deployments. Kustomize manifests preserved but deprecated (will move to `infrastructure/kubernetes-deprecated/` after production migration completes).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Constitution VI (reusable workflows) | Preview implementation completed before principle was added (v1.1.0, 2025-12-22) | N/A - Refactoring to reusable workflows is planned (T070-T072 in spec.md) but not blocking current functionality |

**Justification**: Preview workflows (`build-preview-images.yml`, `deploy-preview.yml`) are functional but not yet parameterized for reuse. Production migration will benefit from lessons learned in preview implementation. Refactoring to reusable workflows is explicitly planned in spec.md Polish Tasks.

## Migration Overview

This feature includes a **comprehensive infrastructure migration** from Helm/Kustomize to Pulumi:

**Pre-Migration State**:
- Helm: cert-manager + nginx-gateway-fabric (via helmfile.yml)
- Kustomize: Application deployments (base + dev/prod overlays)
- Pulumi: DigitalOcean cluster provisioning only

**Post-Migration State**:
- Pulumi: Everything (Helm charts + application deployments + cluster management + per-PR resources)
- Helm/Kustomize: Deprecated

**Migration Order** (phased approach):
1. ✅ **Phase 1: Local environment** (Minikube) - Completed
2. ✅ **Phase 2: Preview base infrastructure** (DigitalOcean cluster, PostgreSQL, Gateway) - Completed
3. ✅ **Phase 3: Preview per-PR resources** (namespaces, deployments, databases) - Completed
4. ✅ **Phase 4: ESC integration** (secrets migration from GitHub Secrets to Pulumi ESC) - Completed
5. ⚠️ **Phase 5: Production migration** - Planned (not yet started)

**Rationale**:
- **Tool consolidation**: 3 tools (Helm + Kustomize + Pulumi) → 1 tool (Pulumi)
- **Dynamic infrastructure**: Pulumi excels at ephemeral/per-PR resources
- **Type safety**: TypeScript catches errors before deployment
- **DRY principle**: Shared components reused across all environments
- **Better local dev**: Simplified Minikube workflow (`pulumi up` vs `helmfile sync && kubectl apply`)

**Backward Compatibility**:
- Kustomize files remain at `infrastructure/kubernetes/` until production migration completes
- After successful production migration, moved to `infrastructure/kubernetes-deprecated/` (preserved 6 months for reference)

## Phase 0: Research Outcomes

See [research.md](./research.md) for comprehensive findings. Key decisions:

**Pulumi vs Helm/Kustomize**:
- **Decision**: Full Pulumi migration for all environments
- **Rationale**: TypeScript type safety, programmatic resource generation, superior state management for ephemeral resources
- **Trade-off**: Learning curve (TypeScript + Pulumi SDK) vs. operational simplicity

**Cluster Architecture**:
- **Decision**: Dedicated preview cluster (separate from production)
- **Rationale**: Complete isolation, simpler Pulumi state management, independent scaling, easier operations
- **Trade-off**: Higher cost (2 clusters vs. 1) vs. reduced operational complexity

**Database Strategy**:
- **Decision**: Shared PostgreSQL instance with per-PR logical databases
- **Rationale**: Cost-effective, fast provisioning, industry-standard pattern
- **Alternative rejected**: Per-PR PostgreSQL instances (too slow, too expensive)

**Container Registry**:
- **Decision**: GitHub Container Registry (ghcr.io)
- **Rationale**: No pull rate limits, native GitHub Actions integration, free for public repos, image digest support
- **Alternative rejected**: DockerHub (pull rate limits, authentication complexity)

**Secrets Management**:
- **Decision**: Pulumi ESC for CD-specific secrets (PostgreSQL passwords, DigitalOcean tokens)
- **Rationale**: Eliminates GitHub Secrets → Pulumi stack config duplication, centralized management, stack-specific scoping
- **Trade-off**: Additional service dependency vs. secret sprawl reduction

## Phase 1: Design Artifacts

- **Data Model**: [data-model.md](./data-model.md) - Ephemeral environment entity, database schema, Pulumi stack structure
- **Contracts**: [contracts/workflow-api.md](./contracts/workflow-api.md) - GitHub Actions workflow inputs/outputs, PR comment format, event schemas
- **Quickstart**: [quickstart.md](./quickstart.md) - Usage guide for maintainers and contributors

## Phase 2: Implementation Tasks

See [tasks.md](./tasks.md) for complete task breakdown with dependencies and parallel execution opportunities.

**Task summary** (organized by phase):
- **Setup**: Project structure, Pulumi initialization, ESLint/Prettier configuration
- **Foundational**: Shared Pulumi components, ESC environment setup, base stack implementation
- **User Story 1 (P1)**: Preview deployment workflow, image builds, deployment gating
- **User Story 2 (P2)**: PR comment updates, URL sharing
- **User Story 3 (P3)**: Cleanup workflow, resource verification
- **Polish**: Documentation updates, reusable workflows (planned), secrets audit
- **Refactoring**: Pulumi stack refactoring (preview-pr.ts component migration)

## Phase 3: Pulumi Stack Refactoring

**Status**: PLANNED (2025-12-24)
**Priority**: HIGH (Maintainability & Consistency)
**Detailed Plan**: [pulumi-refactoring-plan.md](./pulumi-refactoring-plan.md)

### Problem

`preview-pr.ts` has grown to 748 lines implementing all resources inline, while other stacks (local.ts, preview-base.ts, production.ts) use the component architecture successfully. This creates maintainability issues and code duplication.

### Solution

Refactor `preview-pr.ts` to use existing components (web-deployment, api-deployment, http-route, etc.) following the same patterns as other stacks. Expected reduction: 748 lines → ~150 lines (80% reduction).

### Implementation Strategy

1. **Use Existing Components** (Phase 1): Migrate to `createWebDeployment`, `createAPIDeployment`, `createHTTPRoute`
2. **Create Missing Components** (Phase 2): Build `createNamespace` component for ResourceQuota/NetworkPolicy/ImagePullSecret
3. **Extract Utilities** (Phase 2): Move `configMapChecksum` helper to reusable `components/utils.ts`

### Success Metrics

- Line count reduction: 748 → ~150 lines (80%)
- Code reuse: 90%+ of resources use components
- No regressions: All functionality preserved
- Consistency: All stacks follow component-based pattern

### Tasks

See [tasks.md](./tasks.md) for detailed task breakdown (T-REFACTOR series).

## Next Steps

1. **Review this plan** for alignment with implementation reality
2. **Execute tasks.md** following dependency order
3. **Update agent context** after plan approval:
   ```bash
   .specify/scripts/bash/update-agent-context.sh claude
   ```
4. **Monitor progress** via pull request status checks and preview environment deployments
5. **Production migration** after preview stabilizes (use lessons learned)
