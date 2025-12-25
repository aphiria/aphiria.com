# GitHub Actions Utilities

Lightweight utility functions for GitHub Actions workflows. **Does not wrap or abstract infrastructure tools** - only provides reusable patterns like retry logic, polling, and validation.

## Philosophy

This library follows the Simplicity Principle:
- ✅ Provides **utility functions** (retry, poll, validate)
- ❌ Does **NOT** wrap CLI tools (Pulumi, kubectl, etc.)
- ❌ Does **NOT** hide what commands are being run

DevOps engineers should see the actual commands in workflows, not abstracted function calls.

## Installation

```bash
cd infrastructure/github-actions
npm install
npm run build
```

## Usage

### Retry Logic

```typescript
const { retry } = require('./infrastructure/github-actions/bin');
const { exec } = require('@actions/exec');

await retry(
  async () => {
    // Actual command visible in workflow
    await exec.exec('pulumi', ['up', '--stack', 'preview-base', '--yes']);
  },
  {
    maxRetries: 3,
    backoff: 'progressive', // 60s, 120s, 180s
    initialDelay: 60000,
  }
);
```

### Polling

```typescript
const { poll } = require('./infrastructure/github-actions/bin');
const { getOctokit } = require('@actions/github');

const octokit = getOctokit(token);

const deployment = await poll(
  async () => {
    const { data } = await octokit.rest.repos.listDeployments({
      owner: 'aphiria',
      repo: 'aphiria.com',
      environment: 'preview-pr-107',
    });
    return data;
  },
  {
    until: (result) => result.length > 0,
    maxAttempts: 30,
    interval: 2000,
  }
);
```

### Secret Validation

```typescript
const { validateSecrets } = require('./infrastructure/github-actions/bin');

validateSecrets(
  [
    {
      name: 'PULUMI_ACCESS_TOKEN',
      description: 'Pulumi Cloud access token',
      createUrl: 'https://app.pulumi.com/settings/tokens',
    },
    {
      name: 'DEPLOYMENT_APPROVAL_TOKEN',
      description: 'GitHub PAT for auto-approving deployments',
      createUrl: 'https://github.com/settings/tokens/new',
      scopes: ['repo', 'read:org'],
    },
  ],
  process.env
);
```

## What This Library Does NOT Do

- ❌ Wrap Pulumi commands (use `@actions/exec` directly in workflows)
- ❌ Wrap kubectl commands (kubectl should NEVER mutate state - Pulumi is source of truth)
- ❌ Wrap GitHub API calls (use `@actions/github` directly)
- ❌ Hide infrastructure commands from workflow files

## Files

- `retry.ts` - Retry and polling utilities
- `validation.ts` - Secret validation with helpful error messages
- `types.ts` - TypeScript interfaces
- `index.ts` - Public exports
