# Quickstart: Pull Request Ephemeral Environments

**Audience**: Maintainers, contributors, reviewers
**Purpose**: Guide for using preview environments to test pull request changes

---

## Overview

Preview environments allow you to test pull request changes in a live, isolated environment before merging. Each PR can have its own temporary deployment at `{PR_NUMBER}.pr.aphiria.com`.

**Key Benefits**:
- Test changes in production-like environment
- Share working previews with reviewers/stakeholders
- Validate behavior without local setup
- Automatic updates on new commits
- Automatic cleanup when PR closes

---

## For Maintainers: Deploying a Preview

### Step 1: Open or Review a Pull Request

When a pull request is opened targeting the `master` branch, the preview deployment workflow will trigger automatically but will **wait for your approval**.

### Step 2: Approve the Preview Deployment

1. Navigate to the PR's **"Checks"** tab
2. Find the **"Preview Environment"** workflow run
3. Click **"Review deployments"**
4. Select the preview environment
5. Click **"Approve and deploy"**

**Security Note**: Only approve deployments for PRs you trust. This grants access to cluster credentials.

### Step 3: Wait for Deployment

The workflow will:
- Create an isolated Kubernetes namespace
- Deploy the web and API applications
- Set up a dedicated PostgreSQL database
- Configure TLS and ingress routing

**Expected time**: 3-5 minutes

### Step 4: Access the Preview

Once deployed, a comment will appear in the PR with the preview URL:

```markdown
## 🚀 Preview Environment

**Status**: ✅ Ready
**URL**: https://123.pr.aphiria.com
**Last Updated**: 2025-12-19 15:10 UTC
**Commit**: abc1234
```

Click the URL to access the preview environment.

---

## For Contributors: Using Preview Environments

### Requesting a Preview

As a contributor, you **cannot** trigger preview deployments directly (security restriction). However, you can:

1. **Ask a maintainer** to approve a preview deployment for your PR
2. **Provide testing instructions** in the PR description to help maintainers validate your changes
3. **Update your PR** - new commits will automatically update the preview (if already deployed)

### Automatic Updates

Once a preview is deployed:
- Every new commit pushed to the PR branch automatically updates the preview
- No need to request re-deployment
- Status updates appear in PR comments

### Viewing Status

Check the PR comments for the latest deployment status:

- **🔄 Deploying** - Preview is being created or updated
- **✅ Ready** - Preview is accessible at the URL
- **❌ Failed** - Deployment encountered an error (check workflow logs)
- **🗑️ Destroyed** - Preview was cleaned up (PR closed/merged)

---

## For Reviewers: Testing Changes

### Accessing a Preview

1. Find the preview environment comment in the PR
2. Click the URL (e.g., `https://123.pr.aphiria.com`)
3. Test the feature changes in your browser

**No authentication required** - Preview environments are publicly accessible.

### What to Test

- **Functionality**: Does the feature work as described in the PR?
- **UI/UX**: Are there visual issues or usability problems?
- **Documentation**: Do the documentation changes render correctly?
- **Search**: If documentation changed, does search still work?
- **Performance**: Is the site responsive?

### Reporting Issues

If you find problems:
1. Document the issue in a PR comment
2. Include steps to reproduce
3. Mention which page/URL exhibited the problem
4. Screenshot if applicable

---

## Common Scenarios

### Scenario 1: Preview Fails to Deploy

**Symptom**: PR comment shows "❌ Failed" status

**Troubleshooting**:
1. Click the workflow run link in the PR comment
2. Review the error logs
3. Common issues:
   - **Image build failure**: Check if CI workflow succeeded
   - **Resource limits**: Cluster may be at capacity
   - **Configuration error**: Kubernetes manifest syntax error

**Resolution**:
- Fix the underlying issue
- Re-run the workflow from the GitHub Actions UI
- Or close/reopen the PR to trigger a new deployment

### Scenario 2: Preview Shows Old Code

**Symptom**: Preview doesn't reflect latest commit

**Troubleshooting**:
1. Check the commit SHA in the PR comment
2. Does it match the latest commit in the PR?
3. Check the workflow runs - did the update workflow run?

**Resolution**:
- Wait a few minutes (deployment may be in progress)
- Manually trigger workflow re-run if needed
- Hard refresh browser cache (Ctrl+Shift+R / Cmd+Shift+R)

### Scenario 3: Preview URL Returns 404

**Symptom**: URL is accessible but returns 404 or error page

**Possible Causes**:
- **DNS propagation delay**: Wait 1-2 minutes after deployment
- **Ingress not ready**: Check Ingress status in deployment details
- **TLS certificate issue**: Try HTTP instead of HTTPS temporarily

**Resolution**:
- Wait a few minutes for DNS/Ingress to stabilize
- Check workflow logs for Ingress configuration errors
- Contact maintainer if issue persists

### Scenario 4: Multiple PRs Need Previews

**Symptom**: Workflow shows "Max concurrent previews reached"

**Context**: Infrastructure supports up to 10 concurrent previews

**Resolution**:
- Close/merge completed PRs to free up capacity
- Prioritize critical PRs
- Wait for automatic cleanup (happens when PRs close)

---

## Cleanup and Resource Management

### Automatic Cleanup

Preview environments are **automatically destroyed** when:
- The PR is merged
- The PR is closed without merging

**Timeline**: Cleanup begins immediately after PR closure and completes within 5 minutes.

### What Gets Cleaned Up

All resources associated with the preview:
- Kubernetes namespace
- Deployments and pods
- Database and persistent volumes
- Ingress and TLS configuration
- DNS entries (wildcard, so just routing removed)

**Nothing persists** - preview data is ephemeral.

### Manual Cleanup (Maintainers Only)

If automatic cleanup fails:

```bash
# Manually delete the preview namespace
kubectl delete namespace preview-pr-<PR_NUMBER> --wait=true

# Verify cleanup
kubectl get all -n preview-pr-<PR_NUMBER>  # Should return "No resources found"
```

---

## Best Practices

### For Maintainers

✅ **Do**:
- Review code before approving preview deployment
- Only approve deployments for trusted contributors
- Test functionality in preview before merging PR
- Close stale PRs to free up preview capacity

❌ **Don't**:
- Approve deployments for suspicious PRs from unknown forks
- Rely on preview for production-critical testing (use staging)
- Leave PRs open indefinitely (wastes resources)

### For Contributors

✅ **Do**:
- Provide clear testing instructions in PR description
- Keep commits small and focused (faster updates)
- Test locally before requesting preview deployment
- Update PR description if preview reveals issues

❌ **Don't**:
- Force-push to PR branch (may cause deployment conflicts)
- Expect instant preview availability (requires approval)
- Use preview for load/performance testing (not designed for it)

### For Reviewers

✅ **Do**:
- Test user-facing changes in preview
- Report bugs with clear reproduction steps
- Verify documentation renders correctly
- Check accessibility and mobile responsiveness

❌ **Don't**:
- Assume preview is identical to production (it's close, not exact)
- Test with real user data (preview uses seed data)
- Expect long-term availability (preview destroyed when PR closes)

---

## FAQ

### Q: How long does a preview deployment take?

**A**: Typically 3-5 minutes from approval to ready status.

### Q: Can I preview my own fork's PR?

**A**: Yes, but a maintainer must approve the deployment. Forked PRs cannot auto-deploy for security reasons.

### Q: What if I push new commits while preview is deploying?

**A**: The deployment will complete for the original commit, then a new update deployment will trigger for the new commit.

### Q: Do previews have the same data as production?

**A**: No. Previews use seed data or sanitized snapshots, not real production data.

### Q: Can I customize the preview environment?

**A**: Not currently. All previews use the same configuration. Custom configurations may be added in the future.

### Q: What happens if I delete the PR branch?

**A**: Deleting the branch doesn't automatically close the PR. The preview will remain until the PR is explicitly closed.

### Q: Are preview environments secure?

**A**: Previews are publicly accessible (no authentication). Don't use real secrets or sensitive data. Deployment permissions are restricted to maintainers.

### Q: Can I access the preview database?

**A**: Maintainers can port-forward to the preview PostgreSQL instance:

```bash
kubectl port-forward -n preview-pr-<PR_NUMBER> svc/postgres 5432:5432
psql -h localhost -U aphiria -d aphiria
```

### Q: How do I test API endpoints?

**A**: API is available at the same preview URL. For example:
- Web: `https://123.pr.aphiria.com`
- API: `https://123.pr.aphiria.com/api/...`

### Q: What if cleanup fails?

**A**: A warning will be posted to the PR. Maintainers should manually delete the namespace (see "Manual Cleanup" above).

---

## Support

If you encounter issues not covered in this guide:

1. **Check workflow logs**: PR → Checks tab → Preview Environment workflow
2. **Search existing issues**: GitHub Issues with label `preview-environments`
3. **Ask maintainers**: Mention in PR comments
4. **Report bugs**: Open issue with `bug` and `preview-environments` labels

---

## Next Steps

- **Maintainers**: Configure GitHub environment protection rules (setup guide TBD)
- **All users**: Start using previews for your next PR!
- **Advanced**: See [workflow-api.md](./contracts/workflow-api.md) for technical details

Preview environments make collaboration faster and safer. Happy testing! 🚀
