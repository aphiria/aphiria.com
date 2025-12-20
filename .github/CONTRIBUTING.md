# Contributing to Aphiria.com

Thank you for your interest in contributing to the Aphiria documentation website!

## Preview Environments for Pull Requests

When you open a pull request, our CI/CD system automatically builds preview images of your changes. **Maintainers can then deploy ephemeral preview environments** to test your changes before merging.

### How It Works

1. **You open a PR** → GitHub Actions builds Docker images with your changes
2. **Images are built** → PR receives a comment with image digests
3. **Maintainer reviews** → If changes look good, maintainer approves deployment
4. **Preview environment created** → Your changes are deployed to `{PR}.pr.aphiria.com`
5. **Testing** → Maintainer and reviewers can test your changes in a live environment
6. **PR merged/closed** → Preview environment automatically destroyed

### What Gets Deployed

Preview environments include:

- **Full documentation site** at `https://{PR}.pr.aphiria.com`
- **Search API** at `https://{PR}.pr-api.aphiria.com`
- **Isolated database** with search index populated from your changes
- **No impact on production** - completely isolated infrastructure

### For Contributors

**You don't need to do anything special!** Just open a PR as normal:

1. Fork the repository
2. Make your changes
3. Open a pull request
4. Wait for maintainer review

If a maintainer wants to see your changes in action, they'll approve the preview deployment. You'll see status updates in PR comments.

### For Maintainers

See [`infrastructure/pulumi/ephemeral/QUICKSTART.md`](../infrastructure/pulumi/ephemeral/QUICKSTART.md) for detailed instructions on:

- Approving preview deployments
- Testing preview environments
- Troubleshooting deployment issues
- Manual cleanup procedures

**Security note**: Only approve preview deployments for PRs from trusted contributors. Deployment workflows have access to cluster credentials.

### Approval Workflow

Preview deployments require manual approval to protect sensitive infrastructure:

1. Navigate to **Actions** → **Preview Environment Deploy**
2. Click **"Review deployments"**
3. Review the PR code and contributor
4. If trusted, select **`preview`** environment and click **"Approve and deploy"**
5. Preview environment will be created within ~5 minutes

### Environment Protection

The `preview` environment is configured with:

- ✅ **Required reviewers** - At least one maintainer must approve
- ✅ **Protected secrets** - Cluster credentials only accessible after approval
- ✅ **Audit trail** - All deployments logged in Actions history

This ensures that untrusted PRs cannot access production infrastructure.

## Code Style and Standards

This project follows strict PHP coding standards. See [`CLAUDE.md`](../CLAUDE.md) for details on:

- PHP Framework Standards (PSR-4, PSR-12)
- Test Coverage Requirements
- Static Analysis (Psalm, PHP-CS-Fixer)
- Git Workflow

## Testing Your Changes Locally

Before opening a PR, test your changes locally:

```bash
# Build documentation
gulp build

# Run local dev server
# (See README.md for setup instructions)
```

## Questions?

- **Technical questions**: Open a GitHub Discussion
- **Bug reports**: Open a GitHub Issue
- **Security issues**: See [SECURITY.md](./SECURITY.md)

Thank you for contributing to Aphiria! 🎉
