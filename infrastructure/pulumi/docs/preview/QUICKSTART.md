# Ephemeral Preview Environments - Maintainer Quickstart

This guide shows maintainers how to use preview environments for reviewing pull requests.

## Quick Reference

### URLs

- **Web Preview**: `https://{PR_NUMBER}.pr.aphiria.com`
- **API Preview**: `https://{PR_NUMBER}.pr-api.aphiria.com`

Example for PR #123:
- Web: https://123.pr.aphiria.com
- API: https://123.pr-api.aphiria.com

---

## Workflow Overview

```
PR Opened
    ↓
Build Images (automatic)
    ↓
Deployment Pending → 🔔 You get notified
    ↓
[You Review & Approve]
    ↓
Environment Provisioned (5 min)
    ↓
Preview URLs Posted to PR
    ↓
[You Test Changes]
    ↓
PR Closed/Merged
    ↓
Environment Cleaned Up (automatic)
```

---

## Step-by-Step: Reviewing a PR

### 1. PR Opened → Images Build Automatically

When a PR is opened or updated:

1. **Build Preview Images** workflow runs automatically
2. Builds 3 Docker images (build, web, API) with PR-specific tags
3. Posts comment to PR with image digests:

```
### 📦 Preview Images Built

**Commit**: `abc1234`

**Image Digests**:
- **Web**: `sha256:...`
- **API**: `sha256:...`

These images are ready for preview environment deployment.
Approve the preview deployment to create an ephemeral environment.
```

4. Adds labels to PR: `preview:images-built`, `web-digest:...`, `api-digest:...`

### 2. Approve Deployment

**You'll receive a notification** that the **Preview Environment Deploy** workflow is waiting for approval.

**To approve**:

1. Go to the PR or click the notification
2. Navigate to **Actions** → **Preview Environment Deploy** workflow
3. Click **"Review deployments"**
4. Select **`preview`** environment
5. Click **"Approve and deploy"**

**Security note**: Only approve deployments for PRs from trusted contributors. This grants the workflow access to your Kubernetes cluster.

### 3. Wait for Provisioning (~5 minutes)

The workflow will:

1. ✅ Install Pulumi dependencies
2. ✅ Create Pulumi stack `ephemeral-pr-{N}`
3. ✅ Deploy Kubernetes namespace
4. ✅ Create per-PR database
5. ✅ Run database migrations + LexemeSeeder
6. ✅ Deploy web and API pods
7. ✅ Wait for pods to be ready
8. ✅ Post preview URLs to PR

### 4. Preview URLs Posted

Once deployed, the workflow posts a comment to the PR:

```
### 🚀 Preview Environment Deployed

**PR**: #123
**Commit**: `abc1234`
**Database**: `aphiria_pr_123`

**Preview URLs**:
- ✅ **Web**: https://123.pr.aphiria.com
- ✅ **API**: https://123.pr-api.aphiria.com

**Status**:
- Web: HTTP 200
- API: HTTP 200

---
*Preview environment will be automatically destroyed when this PR is closed or merged.*
```

### 5. Test the Preview

Click the preview URLs to test the PR changes:

- **Documentation**: Visit the web URL to see rendered docs
- **Search functionality**: Use the search feature (powered by the API)
- **Share with reviewers**: URLs are public, no login required

**What's different from production?**
- Environment uses the PR's code changes
- Isolated database with PR-specific data
- Search index populated from PR's documentation build
- No impact on production traffic or data

### 6. New Commits → Auto-Update

When new commits are pushed to the PR:

1. **Build Preview Images** workflow rebuilds images
2. **Preview Environment Deploy** workflow **automatically updates** (no re-approval needed)
3. Preview URLs remain the same, but now serve updated code
4. PR comment updates with new commit SHA

### 7. PR Closed/Merged → Auto-Cleanup

When you close or merge the PR:

1. **Preview Environment Cleanup** workflow runs automatically
2. Destroys all resources:
   - ✅ Deletes Kubernetes namespace
   - ✅ Drops database
   - ✅ Removes Pulumi stack
   - ✅ Removes PR labels
3. Posts cleanup confirmation to PR

---

## Common Scenarios

### Scenario: PR needs changes after testing

1. Request changes in PR review
2. Author pushes new commits
3. Workflow automatically rebuilds and redeploys
4. Test again using the same preview URLs

**No manual action needed** - updates are automatic.

### Scenario: Sharing preview with stakeholders

Preview URLs are **publicly accessible** (no GitHub login required):

1. Copy preview URL from PR comment
2. Share directly via Slack, email, etc.
3. Recipients can access immediately

**Use case**: QA team, product managers, documentation reviewers

### Scenario: Deployment fails

Check the **Actions** tab for error details:

**Common issues**:

1. **Missing secrets**: See `SECRETS-SETUP.md` to configure required secrets
2. **Pulumi stack conflict**: Another deployment may be in progress (concurrency protection)
3. **Pod not ready**: Database migration or seeder may have failed

**To debug**:

```bash
# View pod logs
kubectl logs -n ephemeral-pr-{N} -l app.kubernetes.io/component=api

# Check migration job
kubectl get jobs -n ephemeral-pr-{N}
kubectl logs -n ephemeral-pr-{N} job/db-migration

# Check database
kubectl exec -n default deployment/postgresql -- psql -U postgres -c "\l" | grep aphiria_pr_
```

### Scenario: Manual cleanup needed

If automatic cleanup fails, manually destroy the environment:

```bash
cd infrastructure/pulumi/ephemeral
pulumi stack select ephemeral-pr-{N}
pulumi destroy --yes
pulumi stack rm ephemeral-pr-{N} --yes
```

---

## Best Practices

### ✅ DO

- **Review PR code before approving deployment** - Only approve trusted contributors
- **Test both web and API URLs** - Verify documentation and search functionality
- **Check database migrations** - Ensure they run cleanly
- **Share preview URLs freely** - They're public and isolated from production
- **Close PRs when done** - Triggers automatic cleanup

### ❌ DON'T

- **Don't approve untrusted PRs** - Deployment workflows have cluster access
- **Don't use preview environments for production testing** - They're ephemeral and isolated
- **Don't manually edit preview resources** - They're managed by Pulumi
- **Don't leave stale PRs open** - They consume cluster resources

---

## Troubleshooting

### Preview URL returns 404

**Causes**:
- HTTPRoute not created or routing misconfigured
- DNS not resolving (check wildcard records)
- Gateway not accepting traffic

**Check**:
```bash
# Verify HTTPRoute
kubectl get httproute -n ephemeral-pr-{N}

# Check Gateway
kubectl get gateway -n default

# Test DNS
dig {N}.pr.aphiria.com
```

### Search doesn't work

**Cause**: LexemeSeeder failed to populate search index

**Check**:
```bash
# View API pod logs
kubectl logs -n ephemeral-pr-{N} -l app.kubernetes.io/component=api

# Check if lexemes table has data
kubectl exec -n ephemeral-pr-{N} deployment/api -- \
  psql -U postgres -d aphiria_pr_{N} -c "SELECT COUNT(*) FROM doc_lexemes;"
```

### Environment stuck "Provisioning"

**Cause**: Pods not becoming ready within timeout

**Check**:
```bash
# View pod status
kubectl get pods -n ephemeral-pr-{N}

# Describe pods
kubectl describe pods -n ephemeral-pr-{N}

# Check events
kubectl get events -n ephemeral-pr-{N} --sort-by='.lastTimestamp'
```

---

## Reference

### Workflow Files

- `.github/workflows/build-preview-images.yml` - Build Docker images
- `.github/workflows/preview-deploy.yml` - Deploy/update preview environments
- `.github/workflows/preview-cleanup.yml` - Cleanup on PR close

### Pulumi Programs

- `infrastructure/pulumi/ephemeral/src/base-stack.ts` - Base infrastructure
- `infrastructure/pulumi/ephemeral/src/ephemeral-stack.ts` - Per-PR resources

### Documentation

- `infrastructure/pulumi/ephemeral/README.md` - Technical reference
- `infrastructure/pulumi/ephemeral/SECRETS-SETUP.md` - Secret configuration
- `infrastructure/pulumi/ephemeral/QUICKSTART.md` - This file

---

## Getting Help

**Workflow failures**:
- Check **Actions** tab for detailed logs
- Look for red X next to workflow steps
- Click "View logs" for stack traces

**Infrastructure issues**:
- See `README.md` for Pulumi commands
- Use `kubectl` to inspect cluster resources
- Check Pulumi Cloud for stack history

**Security concerns**:
- Review PR code before approving deployment
- Check `.github/workflows/` for workflow configuration
- Verify environment protection is enabled

---

**Happy reviewing! 🚀**
