<p align="center"><a href="https://www.aphiria.com" target="_blank" title="Aphiria"><img src="https://www.aphiria.com/images/aphiria-logo.svg" width="200" height="56"></a></p>

<p align="center">
<a href="https://github.com/aphiria/aphiria.com/actions"><img src="https://github.com/aphiria/aphiria.com/workflows/ci/badge.svg"></a>
<a href="https://coveralls.io/github/aphiria/aphiria.com?branch=master"><img src="https://coveralls.io/repos/github/aphiria/aphiria.com/badge.svg?branch=master" alt="Coverage Status"></a>
<a href="https://psalm.dev"><img src="https://shepherd.dev/github/aphiria/aphiria.com/level.svg"></a>
</p>

# About

This repository contains the code for both https://www.aphiria.com and https://api.aphiria.com.

## Preview Environments

Pull requests automatically generate ephemeral preview environments for testing changes before merging.

- **Web Preview**: `https://{PR}.pr.aphiria.com`
- **API Preview**: `https://{PR}.pr-api.aphiria.com`

**For contributors**: Preview deployments happen automatically after maintainer approval. No setup required!

**For maintainers**:
- Preview deployment workflow: [`infrastructure/pulumi/ephemeral/QUICKSTART.md`](infrastructure/pulumi/ephemeral/QUICKSTART.md)
- Secrets management: [`SECRETS.md`](SECRETS.md)

## Local Development Setup

For detailed local development setup instructions, see:

**[📖 DEV-LOCAL-SETUP.md](infrastructure/pulumi/DEV-LOCAL-SETUP.md)**

This guide covers:
- Installing dependencies (kubectl, Minikube, Pulumi, Node.js, Docker)
- Setting up and deploying the local environment with Pulumi
- Building Docker images
- Running the application locally
- Troubleshooting common issues

### Quick Start

1. Install dependencies: `./install.sh`
2. Start Minikube: `minikube start && minikube tunnel` (in separate terminal)
3. Configure Pulumi backend and secrets
4. Deploy: `cd infrastructure/pulumi && pulumi up --stack local`

See the full guide for detailed instructions and configuration options.

## Linting

Run the PHP and TypeScript linters:

```bash
composer phpcs-fix
cd ./infrastructure/pulumi && npm install && npm run lint:fix && npm run format && cd ../../
```
