# Workflow Contract: Preview Environment Automation

**Phase**: 1 - Design & Contracts
**Date**: 2025-12-19
**Purpose**: Define inputs, outputs, and behaviors for GitHub Actions workflows

---

## Overview

This document specifies the contract for the preview environment automation workflows. These workflows orchestrate preview environment lifecycle: deployment, updates, and cleanup.

---

## Workflow 1: Preview Deployment

**File**: `.github/workflows/preview-deploy.yml`

### Trigger

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
    branches:
      - master
```

**Conditions**:
- Only runs for PRs targeting `master` branch
- Requires manual approval via GitHub environment protection
- Skips if PR is from a fork (security: untrusted code)

### Inputs

| Input | Source | Type | Description | Example |
|-------|--------|------|-------------|---------|
| `pr.number` | GitHub event | integer | Pull request number | `123` |
| `pr.head.sha` | GitHub event | string | Commit SHA to deploy | `abc123def456...` |
| `pr.head.ref` | GitHub event | string | Branch name | `feature/new-docs` |
| `pr.base.ref` | GitHub event | string | Base branch (should be master) | `master` |

### Secrets (Environment-Scoped)

| Secret | Purpose | Format |
|--------|---------|--------|
| `KUBECONFIG` | Kubernetes cluster access | base64-encoded kubeconfig |
| `DO_TOKEN` | DigitalOcean API token (optional) | Token string |

### Outputs

#### 1. PR Comment (Posted/Updated)

**Format**:

```markdown
## 🚀 Preview Environment

**Status**: [STATUS_EMOJI] [STATUS_TEXT]
**URL**: https://[PR_NUMBER].pr.aphiria.com
**Last Updated**: [ISO_TIMESTAMP]
**Commit**: [SHORT_SHA]

---

<details>
<summary>Deployment Details</summary>

- Namespace: `preview-pr-[PR_NUMBER]`
- Database: [STATUS_EMOJI] [STATUS_TEXT]
- Web: [STATUS_EMOJI] [STATUS_TEXT] ([READY]/[DESIRED] replicas)
- API: [STATUS_EMOJI] [STATUS_TEXT] ([READY]/[DESIRED] replicas)
- Ingress: [STATUS_EMOJI] [STATUS_TEXT]

</details>

<!-- preview-environment-status: pr-[PR_NUMBER] -->
```

**Status Values**:

| Status Text | Emoji | Description |
|-------------|-------|-------------|
| `Deploying` | 🔄 | Provisioning in progress |
| `Ready` | ✅ | All resources healthy |
| `Failed` | ❌ | Deployment error |
| `Updating` | 🔄 | Updating to new commit |

**Comment Upsert Logic**:
- Search for existing comment with marker `<!-- preview-environment-status: pr-[PR_NUMBER] -->`
- If found: Update existing comment
- If not found: Create new comment

#### 2. GitHub Actions Status Check

**Name**: `Preview Environment`

**Statuses**:
- `pending`: Awaiting approval
- `in_progress`: Deploying
- `success`: Preview ready at URL
- `failure`: Deployment failed

**Target URL**: Links to preview URL (`https://[PR_NUMBER].pr.aphiria.com`)

### Exit Conditions

| Condition | Exit Code | Output |
|-----------|-----------|--------|
| Deployment successful | 0 | PR comment updated with "Ready" status |
| Deployment failed | 1 | PR comment updated with error details |
| Approval timeout | 1 | Workflow cancelled (GitHub environment timeout) |
| Concurrent limit reached | 1 | Comment posted: "Max concurrent previews reached" |

---

## Workflow 2: Preview Cleanup

**File**: `.github/workflows/preview-cleanup.yml`

### Trigger

```yaml
on:
  pull_request:
    types: [closed]
```

**Conditions**:
- Runs automatically (no approval required)
- Runs whether PR was merged or closed without merging

### Inputs

| Input | Source | Type | Description | Example |
|-------|--------|------|-------------|---------|
| `pr.number` | GitHub event | integer | Pull request number | `123` |
| `pr.merged` | GitHub event | boolean | Whether PR was merged | `true` |

### Secrets

| Secret | Purpose | Format |
|--------|---------|--------|
| `KUBECONFIG` | Kubernetes cluster access | base64-encoded kubeconfig |

### Outputs

#### 1. PR Comment (Updated)

Appends to existing preview comment:

```markdown
---

**Status**: 🗑️ Destroyed
**Destroyed At**: [ISO_TIMESTAMP]
**Reason**: [PR merged | PR closed]

Preview environment and all associated resources have been removed.
```

#### 2. Cleanup Verification

**Validation Steps**:
1. Verify namespace deleted: `kubectl get namespace preview-pr-[PR_NUMBER]` returns not found
2. Verify PVCs removed: `kubectl get pvc -A | grep preview-pr-[PR_NUMBER]` returns empty
3. Verify Ingress removed: `kubectl get ingress -A | grep pr-[PR_NUMBER]` returns empty

### Exit Conditions

| Condition | Exit Code | Output |
|-----------|-----------|--------|
| Cleanup successful | 0 | PR comment updated with "Destroyed" status |
| Namespace not found | 0 | Idempotent: treated as success |
| Cleanup timeout (>5 min) | 1 | Warning posted to PR, manual intervention required |
| Partial cleanup (orphaned resources) | 1 | Error posted with list of orphaned resources |

---

## Workflow 3: Image Build (NEW)

**File**: `.github/workflows/build.yml`

### Trigger

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
    branches:
      - master
```

### Purpose

Build container images once per commit, push to registry with immutable digest.

### Inputs

| Input | Source | Type | Description |
|-------|--------|------|-------------|
| `pr.head.sha` | GitHub event | string | Commit SHA to build |
| `pr.number` | GitHub event | integer | PR number |

### Outputs

| Output | Format | Description |
|--------|--------|-------------|
| `web_digest` | sha256:... | Immutable web image digest |
| `api_digest` | sha256:... | Immutable API image digest |

### Actions

1. Build web image with Dockerfile
2. Build API image with Dockerfile
3. Push both images to ghcr.io with tags: `sha` and `pr-{number}`
4. Output digests for downstream workflows
5. Add PR labels with digests for production promotion

**PR Labels Added**:
```
image-digest/web:sha256:abc123...
image-digest/api:sha256:def456...
```

---

## Workflow 4: Production Promotion (NEW)

**File**: `.github/workflows/production-deploy.yml`

### Trigger

```yaml
on:
  pull_request:
    types: [closed]
    branches:
      - master
```

**Condition**: Only runs if `pr.merged == true`

### Inputs

| Input | Source | Type | Description |
|-------|--------|------|-------------|
| `pr.number` | GitHub event | integer | Merged PR number |
| `pr.merge_commit_sha` | GitHub event | string | Merge commit SHA |

### Secrets

| Secret | Purpose |
|--------|---------|
| `KUBECONFIG` | Production cluster access |

### Process

1. **Retrieve Image Digests** from merged PR labels:
   ```bash
   WEB_DIGEST=$(gh pr view $PR_NUMBER --json labels \
     --jq '.labels[] | select(.name | startswith("image-digest/web:")) | .name | split(":")[1:]')
   ```

2. **Validate Digests Exist**:
   - Exit 1 if labels not found (preview didn't deploy successfully)
   - Exit 1 if digest format invalid

3. **Deploy to Production** using exact digest:
   ```bash
   kubectl set image deployment/web \
     web=ghcr.io/aphiria/aphiria.com/web@sha256:$WEB_DIGEST \
     -n production
   ```

4. **Verify Deployment**:
   - Wait for rollout to complete
   - Check pod readiness
   - Verify new image digest matches expected

5. **Update Deployment Record**:
   - Tag image with `latest` and `production` (mutable tags for reference)
   - Post deployment summary to merged PR

### Exit Conditions

| Condition | Exit Code | Output |
|-----------|-----------|--------|
| Promotion successful | 0 | Comment on PR with deployment details |
| Digest not found | 1 | Error: Preview must be deployed before merge |
| Deployment failed | 1 | Error with rollback instructions |
| Digest mismatch | 1 | Error: Running image != expected digest |

---

## Workflow 5: Preview Health Check (Optional)

**File**: `.github/workflows/preview-healthcheck.yml`

### Trigger

```yaml
on:
  schedule:
    - cron: '*/30 * * * *'  # Every 30 minutes
```

### Purpose

Detect and clean up orphaned preview environments:
- Namespaces for closed PRs
- Environments older than 7 days
- Resources exceeding limits

### Actions

1. List all preview namespaces: `kubectl get namespaces -l app.kubernetes.io/name=preview-environment`
2. For each namespace, check if PR is still open via GitHub API
3. If PR closed: Trigger cleanup workflow
4. If PR open but environment unhealthy: Post warning to PR

---

## Script Contracts

### Script: `scripts/preview-env/deploy.sh`

**Purpose**: Deploy or update a preview environment

**Signature**:

```bash
./scripts/preview-env/deploy.sh \
  --pr-number <NUMBER> \
  --commit-sha <SHA> \
  --namespace <NAMESPACE>
```

**Inputs**:

| Argument | Required | Description | Example |
|----------|----------|-------------|---------|
| `--pr-number` | Yes | Pull request number | `123` |
| `--commit-sha` | Yes | Git commit SHA to deploy | `abc123def456...` |
| `--namespace` | Yes | Kubernetes namespace name | `preview-pr-123` |

**Outputs**:

| Output | Format | Description |
|--------|--------|-------------|
| stdout | Text | Progress messages |
| stderr | Text | Errors and warnings |
| Exit code | 0/1 | Success (0) or failure (1) |

**Behavior**:

1. Generate Kustomize overlay with PR-specific values
2. Apply namespace with labels/annotations
3. Apply ResourceQuota
4. Apply PostgreSQL StatefulSet
5. Wait for PostgreSQL ready (timeout: 2 min)
6. Apply Web and API Deployments
7. Wait for Deployments ready (timeout: 3 min)
8. Apply Ingress
9. Verify Ingress has IP address (timeout: 1 min)
10. Return success

**Error Handling**:
- Timeout: Exit 1, output resource status to stderr
- Apply failure: Exit 1, output kubectl error
- Resource not ready: Exit 1, output pod logs if applicable

---

### Script: `scripts/preview-env/cleanup.sh`

**Purpose**: Destroy a preview environment

**Signature**:

```bash
./scripts/preview-env/cleanup.sh \
  --pr-number <NUMBER> \
  --namespace <NAMESPACE>
```

**Inputs**:

| Argument | Required | Description | Example |
|----------|----------|-------------|---------|
| `--pr-number` | Yes | Pull request number | `123` |
| `--namespace` | Yes | Kubernetes namespace name | `preview-pr-123` |

**Outputs**:

| Output | Format | Description |
|--------|--------|-------------|
| stdout | Text | Progress messages |
| stderr | Text | Warnings if resources orphaned |
| Exit code | 0/1 | Success (0) or failure (1) |

**Behavior**:

1. Delete namespace: `kubectl delete namespace <NAMESPACE> --wait=true --timeout=5m`
2. Verify deletion complete
3. Check for orphaned resources (PVCs, Ingresses)
4. Return success if no orphans found

**Error Handling**:
- Namespace not found: Exit 0 (idempotent)
- Deletion timeout: Exit 1, output stuck resources
- Orphaned resources: Exit 1, output list to stderr

---

### Script: `scripts/preview-env/generate-values.sh`

**Purpose**: Generate Kustomize overlay for a specific PR

**Signature**:

```bash
./scripts/preview-env/generate-values.sh \
  --pr-number <NUMBER> \
  --commit-sha <SHA> \
  --output-dir <DIR>
```

**Inputs**:

| Argument | Required | Description | Example |
|----------|----------|-------------|---------|
| `--pr-number` | Yes | Pull request number | `123` |
| `--commit-sha` | Yes | Git commit SHA | `abc123def456...` |
| `--output-dir` | Yes | Directory to write overlay | `/tmp/preview-overlay` |

**Outputs**:

Generates `kustomization.yaml` in output directory:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: preview-pr-123

commonLabels:
  preview.aphiria.com/pr-number: "123"

images:
  - name: aphiria.com-web
    newTag: abc123def456
  - name: aphiria.com-api
    newTag: abc123def456

patches:
  - patch: |-
      - op: replace
        path: /spec/rules/0/host
        value: 123.pr.aphiria.com
    target:
      kind: Ingress
      name: preview-ingress
```

**Exit Code**: 0 on success, 1 on error

---

## PR Comment Update Contract

### Find or Create Comment

**Logic**:

```bash
COMMENT_ID=$(gh api repos/:owner/:repo/issues/:pr_number/comments \
  --jq '.[] | select(.body | contains("<!-- preview-environment-status: pr-'$PR_NUMBER' -->")) | .id')

if [ -z "$COMMENT_ID" ]; then
  # Create new comment
  gh api repos/:owner/:repo/issues/:pr_number/comments -f body="$COMMENT_BODY"
else
  # Update existing comment
  gh api repos/:owner/:repo/issues/comments/$COMMENT_ID -X PATCH -f body="$COMMENT_BODY"
fi
```

**Marker Format**: `<!-- preview-environment-status: pr-[PR_NUMBER] -->`

This hidden HTML comment allows idempotent comment updates.

---

## Error Reporting Contract

### Deployment Failure Format

When deployment fails, PR comment should include:

```markdown
## 🚀 Preview Environment

**Status**: ❌ Failed
**Last Attempted**: [ISO_TIMESTAMP]
**Commit**: [SHORT_SHA]

---

### ❌ Deployment Error

```
[Error message from workflow/script]
```

<details>
<summary>Troubleshooting Steps</summary>

1. Check workflow logs: [Link to GitHub Actions run]
2. Verify cluster capacity: `kubectl top nodes`
3. Retry deployment by re-running the workflow

</details>

<!-- preview-environment-status: pr-[PR_NUMBER] -->
```

### Cleanup Failure Format

```markdown
---

**Status**: ⚠️ Cleanup Failed
**Attempted At**: [ISO_TIMESTAMP]

Some resources could not be automatically removed:

- Namespace: `preview-pr-[PR_NUMBER]` (stuck in Terminating state)
- PVCs: [list of orphaned PVCs]

**Manual cleanup required**: [Link to runbook or instructions]
```

---

## Summary

All workflows follow these principles:

1. **Idempotent**: Running multiple times produces same result
2. **Observable**: Status visible in PR comments and GitHub Actions UI
3. **Fail-safe**: Errors reported clearly, with actionable next steps
4. **Secure**: Secrets scoped to protected environments, approval required
5. **Atomic**: Cleanup via namespace deletion ensures no partial states

These contracts ensure consistent behavior across all preview environment operations.
