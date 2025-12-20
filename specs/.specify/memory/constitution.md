<!--
Sync Impact Report:
Version change: [new file] → 1.0.0
Modified principles: N/A (initial version)
Added sections:
  - Core Principles (5 principles)
  - Development Standards
  - Quality Gates
  - Governance
Templates requiring updates:
  ✅ plan-template.md - reviewed, constitution check section compatible
  ✅ spec-template.md - reviewed, requirements alignment compatible
  ✅ tasks-template.md - reviewed, task categorization compatible
Follow-up TODOs: None
-->

# Aphiria.com Constitution

## Core Principles

### I. PHP Framework Standards

All code MUST adhere to modern PHP best practices and framework conventions:
- Use PHP 8.4+ features appropriately (typed properties, enums, attributes, readonly)
- Follow PSR-4 autoloading and PSR-12 coding standards
- Leverage Aphiria framework patterns (dependency injection, routing, content negotiation)
- Maintain strict type safety (declare strict_types=1 in all PHP files)

**Rationale**: Consistency with the Aphiria framework's philosophy ensures maintainability and serves as a reference implementation for the framework itself.

### II. Documentation-First Development

Documentation changes MUST be treated as first-class features:
- Documentation accuracy is critical - it directly impacts framework adoption
- All framework API changes require corresponding documentation updates
- Documentation builds (Gulp) must complete successfully before deployment
- Search functionality must remain operational and accurate

**Rationale**: This project exists to document the Aphiria framework. Incorrect or outdated documentation undermines the entire purpose of the site.

### III. Test Coverage (NON-NEGOTIABLE)

All new features and bug fixes MUST include appropriate tests:
- Unit tests for business logic (PHPUnit)
- Integration tests for database interactions and external dependencies
- Contract tests for API endpoints
- Test suite must pass before any deployment
- Code coverage must not decrease from current levels

**Rationale**: The website is a critical resource for the Aphiria community. Regressions in search, documentation rendering, or API functionality directly harm user experience.

### IV. Static Analysis & Code Quality

All code MUST pass static analysis and linting before commit:
- Psalm must report no errors at configured level
- PHP-CS-Fixer must pass with no violations
- No suppressed warnings without explicit justification in code comments
- All SQL queries must use parameterized statements (no raw string concatenation)

**Rationale**: Static analysis catches bugs before runtime and ensures consistent code quality across contributors.

### V. Production Reliability

All changes MUST consider production deployment requirements:
- Database migrations must be reversible (up/down methods in Phinx)
- Configuration changes must be documented in .env.dist
- Kubernetes manifests must be validated before deployment
- All external dependencies must handle failures gracefully
- Logging must be structured and meaningful for debugging

**Rationale**: The site runs in a Kubernetes cluster on DigitalOcean. Deployments must be safe, reversible, and debuggable.

## Development Standards

### Code Organization

- **PSR-4 Namespace**: `App\` maps to `src/`
- **Domain-Driven Structure**: Organize by domain (Documentation, Databases, etc.)
- **Separation of Concerns**: Binders for DI, Controllers for HTTP, Services for business logic
- **Database Abstraction**: Use PDO for database access and Phinx for migrations and seeding
- **Git**: All new non-sensitive files MUS be added to Git.  Any sensitive files or build directories MUST be added to .gitignore.

### Dependency Management

- **Composer**: All PHP dependencies managed via composer.json
- **Version Pinning**: Use specific versions for production stability
- **Security Updates**: Dependencies must be kept reasonably current
- **Minimal Dependencies**: Each new dependency must be justified

### Configuration & Secrets

- **Environment Variables**: All environment-specific config via .env
- **No Hardcoded Credentials**: Use environment variables for all secrets
- **Distribution Template**: Keep .env.dist updated with all required variables
- **K8s Secrets**: Sensitive data in Kubernetes secrets, not ConfigMaps

## Quality Gates

### Pre-Commit Gates

Before any commit, code MUST pass:
1. `composer phpcs-fix` (auto-fix formatting)
2. `composer phpunit` (all tests pass)
3. `composer psalm` (no static analysis errors)

### Pre-Deployment Gates

Before any deployment, validate:
1. Docker images build successfully
2. Kubernetes manifests apply without errors
3. Database migrations execute cleanly (test in dev cluster)
4. Documentation builds without errors (`gulp build`)
5. Search index updates complete successfully

### Review Requirements

All pull requests MUST:
- Include tests for new functionality
- Update documentation if user-facing changes
- Pass all automated checks (CI workflow)
- Receive approval from code owner
- Have descriptive commit messages explaining why (not just what)

## Governance

### Amendment Process

1. **Propose**: Open discussion via GitHub issue with `constitution` label
2. **Review**: Discuss technical merit and alignment with project goals
3. **Approve**: Requires maintainer approval
4. **Document**: Update this file with new version and migration guidance
5. **Propagate**: Update all dependent templates and documentation

### Versioning Policy

- **MAJOR** (X.0.0): Breaking changes to development workflow or non-negotiable principles
- **MINOR** (x.Y.0): New principles added or existing ones materially expanded
- **PATCH** (x.y.Z): Clarifications, wording improvements, non-semantic changes

### Compliance

- All PRs must verify compliance with this constitution
- Violations must be justified and documented in PR description
- Constitution supersedes all other development practices
- When in doubt, refer to Aphiria framework's own conventions

### Evolution

This constitution is a living document. As the project grows, principles may be added, refined, or (rarely) removed. All changes must be versioned and documented.

**Version**: 1.0.0 | **Ratified**: 2025-12-19 | **Last Amended**: 2025-12-19
