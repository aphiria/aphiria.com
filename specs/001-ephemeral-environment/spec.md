# Feature Specification: Pull Request Ephemeral Environments

**Feature Branch**: `001-ephemeral-environment`  
**Created**: 2025-12-19  
**Status**: Draft

---

## Summary

This feature introduces ephemeral, pull-request–scoped preview environments that allow maintainers to validate changes in a production-like setting before merging.

Each pull request may be deployed into an isolated environment with predictable public URLs:

- Web: `{PR_NUMBER}.pr.aphiria.com` (e.g., `123.pr.aphiria.com`)
- API: `{PR_NUMBER}.pr-api.aphiria.com` (e.g., `123.pr-api.aphiria.com`)

Preview environments are:
- isolated from production
- automatically updated on new commits
- gated behind explicit maintainer approval
- destroyed automatically when the pull request is closed or merged

This repository is public and open source; therefore, all privileged deployment actions must be protected against untrusted contributors.

---

## User Scenarios & Testing (Mandatory)

### User Story 1 — Preview Pull Request Changes (P1)

As a maintainer, I want to preview pull request changes in a live, isolated environment so that I can validate functionality and behavior before merging.

**Acceptance Scenarios**

1. **Given** a pull request is opened  
   **When** the maintainer approves preview deployment  
   **Then** an ephemeral environment is provisioned with a unique URL

2. **Given** an ephemeral environment exists  
   **When** new commits are pushed to the PR  
   **Then** the environment is updated to reflect the latest commit

3. **Given** the preview environment is ready  
   **When** the preview URL is accessed  
   **Then** the application reflects the PR’s code changes without impacting production

4. **Given** a preview deployment succeeded for PR SHA X
   **When** that SHA is promoted to production
   **Then** production runs the identical image digest that was tested in preview, with production environment configuration applied.

---

### User Story 2 — Share Preview with Stakeholders (P2)

As a maintainer, I want to share a working preview URL so that reviewers or stakeholders can validate behavior without local setup.

**Acceptance Scenarios**

1. **Given** a preview environment exists  
   **When** the preview URL is shared  
   **Then** others can access the environment using a browser

2. **Given** multiple users access the preview  
   **When** they interact with the application  
   **Then** their usage does not affect production or other previews

---

### User Story 3 — Automatic Environment Cleanup (P3)

As a maintainer, I want preview environments to be destroyed automatically when a PR is no longer active so that resources are not wasted.

**Acceptance Scenarios**

1. **Given** a pull request is merged  
   **When** the merge completes  
   **Then** the associated ephemeral environment is destroyed

2. **Given** a pull request is closed without merging  
   **When** the PR is closed  
   **Then** the associated ephemeral environment is destroyed

3. **Given** an environment is destroyed  
   **When** the preview URL is accessed  
   **Then** the environment is no longer reachable

> Note: Environments are destroyed on PR close or merge only.  
> No time-based (e.g., 1-hour) teardown is performed.

---

## Requirements (Mandatory)

### Functional Requirements

- **FR-001**: The system MUST support deploying an isolated preview environment per pull request
- **FR-002**: Each preview MUST have stable, predictable URLs derived from the PR number (web + API)
- **FR-003**: Preview environments MUST deploy the latest commit from the PR
- **FR-004**: Preview environments MUST update automatically when new commits are pushed
- **FR-005**: Preview environments MUST be destroyed when the PR is closed or merged
- **FR-006**: Preview environments MUST be isolated from production and from other previews
- **FR-007**: Deployment progress and failure states MUST be observable
- **FR-008**: Provisioning failures MUST be reported clearly
- **FR-009**: All resources created for a preview MUST be removed on teardown
- **FR-010**: Preview environments MUST deploy both web and API containers with full application behavior
- **FR-029**: Each preview environment MUST provision separate Kubernetes Deployments for web and API components
- **FR-030**: Web and API deployments MUST use the same immutable container images (by digest) as production
- **FR-031**: Gateway/Ingress routing MUST direct `{PR}.pr.aphiria.com` to web service and `{PR}.pr-api.aphiria.com` to API service
- **FR-032**: Each preview environment MUST run database migrations via Phinx before deployments start
- **FR-033**: Each preview environment MUST run the LexemeSeeder (Phinx seed) to populate the search index
- **FR-034**: The database migration job MUST complete successfully before API deployment is marked ready
- **FR-035**: LexemeSeeder MUST read compiled documentation from the API container's filesystem
- **FR-036**: Preview URLs MUST be surfaced in pull request comments or status checks
- **FR-037**: Preview deployments MUST be gated behind explicit maintainer approval
- **FR-038**: Untrusted contributors MUST NOT be able to trigger privileged deployments
- **FR-039**: Privileged credentials MUST NOT be accessible before approval
- **FR-040** (Build once): The system MUST build a single container image per commit and reuse it across preview and production deployments.
- **FR-041** (Immutable promotion): Production deployments MUST reference the same immutable image (by digest) that was deployed and tested in the preview environment.
Kubernetes
- **FR-042** (Runtime config): Environment-specific configuration MUST be provided at deploy/runtime (env vars/secrets/config), not by rebuilding the image.
- **FR-043**: Each ephemeral environment MUST generate a unique Kubernetes ConfigMap with PR-specific configuration
- **FR-044**: ConfigMap MUST include PR-specific values: `APP_WEB_URL`, `APP_API_URL`, `APP_COOKIE_DOMAIN`
- **FR-045**: ConfigMap names MUST follow the pattern `env-vars-pr-{PR_NUMBER}` for isolation
- **FR-046**: Kubernetes Secrets MUST be generated per-PR for sensitive configuration (DB credentials, etc.)
- **FR-047**: Secret names MUST follow the pattern `env-var-secrets-pr-{PR_NUMBER}`

---

## Configuration Injection

### GitHub Context Variables

The PR number and related metadata are available in GitHub Actions via context variables:

- `${{ github.event.pull_request.number }}` - PR number (e.g., `123`)
- `${{ github.event.pull_request.head.sha }}` - Commit SHA
- `${{ github.repository }}` - Repository name
- `${{ github.event.pull_request.head.ref }}` - Source branch name

### ConfigMap Generation

For each ephemeral environment, a ConfigMap is dynamically generated with:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: env-vars-pr-{{ PR_NUMBER }}
  namespace: ephemeral-pr-{{ PR_NUMBER }}
data:
  APP_BUILDER_API: "\\Aphiria\\Framework\\Api\\SynchronousApiApplicationBuilder"
  APP_BUILDER_CONSOLE: "\\Aphiria\\Framework\\Console\\ConsoleApplicationBuilder"
  APP_ENV: "preview"
  APP_WEB_URL: "https://{{ PR_NUMBER }}.pr.aphiria.com"
  APP_API_URL: "https://{{ PR_NUMBER }}.pr-api.aphiria.com"
  APP_COOKIE_DOMAIN: ".{{ PR_NUMBER }}.pr.aphiria.com"
  APP_COOKIE_SECURE: "1"
  DB_HOST: "db-pr-{{ PR_NUMBER }}"
  DB_NAME: "postgres"
  DB_PORT: "5432"
  DOC_LEXEMES_TABLE_NAME: ""
  LOG_LEVEL: "debug"
```

### Secret Generation

Sensitive values are stored in Kubernetes Secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: env-var-secrets-pr-{{ PR_NUMBER }}
  namespace: ephemeral-pr-{{ PR_NUMBER }}
type: Opaque
stringData:
  DB_USER: "preview_user"
  DB_PASSWORD: "{{ GENERATED_PASSWORD }}"
```

### Workflow Integration

The GitHub Actions workflow will:

1. Extract PR number from `${{ github.event.pull_request.number }}`
2. Pass PR number to Pulumi as a stack parameter or environment variable
3. Pulumi uses PR number to:
   - Create stack: `ephemeral-pr-{PR_NUMBER}`
   - Generate ConfigMap/Secrets with interpolated values
   - Deploy Kubernetes resources with PR-scoped names
4. Infrastructure provisioning creates namespace, ConfigMap, Secrets, deployments with PR-specific configuration

---

## Deployment Gating (Open Source Safety)

### Policy

- Build and test steps may run automatically on all pull requests
- Infrastructure deployment and cluster access MUST require maintainer approval
- Preview deployments MUST NOT execute automatically for forked or untrusted PRs

### Mechanism

- Preview deployment jobs SHALL target a protected deployment environment
- The environment SHALL require manual approval by the maintainer
- Deployment secrets SHALL be scoped to the protected environment only

---

## Key Entities

### Ephemeral Environment
- Attributes:
    - PR number
    - unique URLs (web + API)
    - status (provisioning / ready / failed / destroying)
    - deployed commit SHA
    - Kubernetes namespace: `ephemeral-pr-{PR_NUMBER}`
    - Deployments: `web-pr-{PR_NUMBER}`, `api-pr-{PR_NUMBER}`, `db-pr-{PR_NUMBER}`
    - Services: `web-pr-{PR_NUMBER}`, `api-pr-{PR_NUMBER}`, `db-pr-{PR_NUMBER}`
    - Jobs: `db-migration-pr-{PR_NUMBER}` (runs Phinx migrations + LexemeSeeder)
- Lifecycle:
    - created on approved PR deployment
    - database provisioned → migrations run → LexemeSeeder populates search index → web/API deployed
    - updated on PR commits (re-runs migrations/seeder if needed)
    - destroyed on PR close or merge

---

## Success Criteria (Mandatory)

- **SC-001**: Preview environments are accessible within 5 minutes of approval
- **SC-002**: Both web and API preview URLs are posted to PRs after successful deployment
- **SC-003**: ≥95% of preview deployments succeed without manual intervention
- **SC-004**: Preview environments are destroyed on PR close or merge
- **SC-005**: No orphaned preview resources remain after PR closure
- **SC-006**: Maintainer approval is required before any privileged deployment

---

## Infrastructure & State Management

### Pulumi Stack Strategy

- **FR-018**: Each ephemeral environment MUST use a dedicated Pulumi stack
- **FR-019**: Stack names MUST follow the pattern: `ephemeral-pr-{PR_NUMBER}` (e.g., `ephemeral-pr-123`)
- **FR-020**: Pulumi state MUST be stored in a backend that supports concurrent operations (e.g., S3, Pulumi Cloud)
- **FR-021**: Stack creation and destruction MUST be automated via CI/CD
- **FR-022**: Stack teardown MUST remove all provisioned infrastructure resources
- **FR-023**: Production and dev stacks MUST remain isolated from ephemeral stacks

### Rationale

Each ephemeral environment requires its own Pulumi stack to:
- Maintain isolated infrastructure state per PR
- Enable parallel deployments without state conflicts
- Allow safe teardown without affecting other environments
- Track resource ownership for cleanup verification

---

## Assumptions

1. Application is containerized
2. CI/CD is handled via GitHub Actions
3. DNS supports wildcard subdomains
4. Preview environments do not use production secrets
5. Preview infrastructure cost is acceptable for short-lived environments
6. Maximum concurrent previews is limited by cluster capacity
7. Pulumi backend supports multiple concurrent stacks
8. Pulumi credentials allow stack creation/deletion operations
9. Documentation build (from https://github.com/aphiria/docs) completes successfully in Docker build stage
10. LexemeSeeder can access compiled documentation files in the API container filesystem

---

## Out of Scope

- Production deployment workflows
- Time-based preview expiration
- Performance or load testing
- Multi-region previews
- Long-lived staging environments
