# Feature Specification: Pull Request Ephemeral Environments

**Feature Branch**: `001-ephemeral-environment`  
**Created**: 2025-12-19  
**Status**: Draft

---

## Summary

This feature introduces ephemeral, pull-request–scoped preview environments that allow maintainers to validate changes in a production-like setting before merging.

Each pull request may be deployed into an isolated environment with a predictable public URL:

- `{PR_NUMBER}.pr.aphiria.com` (e.g., `123.pr.aphiria.com`)

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
- **FR-002**: Each preview MUST have a stable, predictable URL derived from the PR number
- **FR-003**: Preview environments MUST deploy the latest commit from the PR
- **FR-004**: Preview environments MUST update automatically when new commits are pushed
- **FR-005**: Preview environments MUST be destroyed when the PR is closed or merged
- **FR-006**: Preview environments MUST be isolated from production and from other previews
- **FR-007**: Deployment progress and failure states MUST be observable
- **FR-008**: Provisioning failures MUST be reported clearly
- **FR-009**: All resources created for a preview MUST be removed on teardown
- **FR-010**: Preview environments MUST support full application behavior (web/API)
- **FR-011**: Preview URLs MUST be surfaced in pull request comments or status checks
- **FR-012**: Preview deployments MUST be gated behind explicit maintainer approval
- **FR-013**: Untrusted contributors MUST NOT be able to trigger privileged deployments
- **FR-014**: Privileged credentials MUST NOT be accessible before approval
- **FR-015** (Build once): The system MUST build a single container image per commit and reuse it across preview and production deployments.
- **FR-016** (Immutable promotion): Production deployments MUST reference the same immutable image (by digest) that was deployed and tested in the preview environment.
Kubernetes
- **FR-017** (Runtime config): Environment-specific configuration MUST be provided at deploy/runtime (env vars/secrets/config), not by rebuilding the image.

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
    - unique URL
    - status (provisioning / ready / failed / destroying)
    - deployed commit SHA
- Lifecycle:
    - created on approved PR deployment
    - updated on PR commits
    - destroyed on PR close or merge

---

## Success Criteria (Mandatory)

- **SC-001**: Preview environments are accessible within 5 minutes of approval
- **SC-002**: Preview URLs are posted to PRs after successful deployment
- **SC-003**: ≥95% of preview deployments succeed without manual intervention
- **SC-004**: Preview environments are destroyed on PR close or merge
- **SC-005**: No orphaned preview resources remain after PR closure
- **SC-006**: Maintainer approval is required before any privileged deployment

---

## Assumptions

1. Application is containerized
2. CI/CD is handled via GitHub Actions
3. DNS supports wildcard subdomains
4. Preview environments do not use production secrets
5. Preview infrastructure cost is acceptable for short-lived environments
6. Maximum concurrent previews is limited by cluster capacity

---

## Out of Scope

- Production deployment workflows
- Time-based preview expiration
- Performance or load testing
- Multi-region previews
- Long-lived staging environments
