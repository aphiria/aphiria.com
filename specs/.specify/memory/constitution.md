<!--
Sync Impact Report:
Version change: 1.1.0 → 1.2.0
Modified principles:
  - Review Requirements: Added mandatory code review phase
Added sections:
  - Core Principle VII: Code Quality & Design Principles
  - Core Principle VIII: Frontend & E2E Testing Standards
Removed sections: None
Templates requiring updates:
  - plan-template.md - add code review phase to acceptance criteria
  - spec-template.md - add code review phase to testing section
  - tasks-template.md - add code review step to task completion
Follow-up TODOs:
  - Update all active specs to include code review phase
  - Add code review checklist to PR template
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
- Documentation builds (build-docs tool) must complete successfully before deployment
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

### VI. CI/CD & Infrastructure Reuse

GitHub Actions workflows and infrastructure code MUST be parameterized and reusable across environments:

- GitHub Actions workflows must accept inputs/variables to support dev/preview/prod environments
- Pulumi infrastructure must use stacks and configuration, not duplicated code
- Environment differences (dev/preview/prod) must be expressed via inputs, config files, or stack values
- Infrastructure-as-code must follow DRY principles - no copy-pasted stack definitions
- Workflows must not be duplicated for each environment - use matrix strategies or reusable workflows

**Rationale**: Duplicated workflows and infrastructure code create maintenance burden and increase the risk of environment drift. Parameterization ensures consistency across environments and reduces the surface area for bugs.

### VII. Code Quality & Design Principles

All code MUST adhere to SOLID principles and modern design patterns:

- **Single Responsibility**: Classes and functions do one thing well
- **Open/Closed Principle**: Extend behavior via composition, not modification
- **Dependency Injection**: No hardcoded dependencies, use constructor injection
- **Testability-First Design**: If code is hard to test, the design is wrong - refactor for testability
- **No Hacky Solutions**: Workarounds require explicit justification in code comments and a refactoring plan
- **Strong Naming Conventions**:
  - Files: kebab-case for configs/scripts, PascalCase.php for classes
  - Classes: Nouns describing purpose (SearchBar, UserRepository, not Helper or Manager)
  - Methods: Verbs describing action (selectContext, findById, not doThing or process)
  - Properties: Semantic names describing purpose (mobileMenuLink, searchInput, not locator or element)
- **Research Over Guessing**: When uncertain about best practices or framework conventions, research official documentation BEFORE proposing solutions
- **Anti-Pattern Detection**: Actively identify and eliminate common anti-patterns (god objects, tight coupling, magic numbers, copy-paste code)

**Rationale**: Maintainable code requires intentional design. Anti-patterns and poor naming accumulate technical debt and make future changes exponentially harder. SOLID principles ensure code remains flexible and testable as the system evolves.

### VIII. Frontend & E2E Testing Standards

TypeScript and E2E tests MUST follow modern best practices and established patterns:

**TypeScript Quality:**
- ESLint and Prettier must pass with zero errors and zero warnings
- Use `readonly` properties for immutable values
- Use interfaces for contracts (Navigable, Searchable, etc.)
- Use strict typing - avoid `any` except for truly dynamic external APIs
- Use CONSTANT_CASE (UPPER_SNAKE_CASE) for module-level constants
- Properties for synchronous values, methods for asynchronous operations

**E2E Testing (Playwright):**
- **Page Object Model (POM) is mandatory** - NO DOM selectors in test files
- All `.locator()`, `.getBy*()`, and CSS selectors MUST be encapsulated in page objects or components
- Use semantic property names based on UI purpose (getStartedLink, submitButton, NOT locator or element)
- Test names use sentence case (NOT Title Case)
- Use `waitUntil: "load"` by default (NOT "domcontentloaded" unless justified)
- NEVER use `waitForTimeout` - use smart retry with `.toBeVisible()`, `.toHaveText()`, etc.
- Organize code:
  - `fixtures/` for test setup and dependency injection
  - `lib/` for reusable utility functions
  - `pages/components/` for reusable UI components
  - `pages/` for full page objects
- Centralize test data in `fixtures/test-data.ts`

**Rationale**: Frontend code is as critical as backend for user experience. E2E tests prevent regressions in user-facing features. Poor test organization and flaky waits create maintenance burden and false negatives in CI.

## Development Standards

### Code Organization

- **PSR-4 Namespace**: `App\` maps to `src/`
- **Domain-Driven Structure**: Organize by domain (Documentation, Databases, etc.)
- **Separation of Concerns**: Binders for DI, Controllers for HTTP, Services for business logic
- **Database Abstraction**: Use PDO for database access and Phinx for migrations and seeding
- **Git**: All new non-sensitive files MUST be added to Git. Any sensitive files or build directories MUST be added to .gitignore.

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
4. Documentation builds without errors (`npm run build:docs --workspace=tools/build-docs`)
5. Search index updates complete successfully

### Review Requirements

All pull requests MUST:

- Include tests for new functionality
- Update documentation if user-facing changes
- Pass all automated checks (CI workflow)
- Receive approval from code owner
- Have descriptive commit messages explaining why (not just what)
- **Complete mandatory code review phase** (see below)

### Mandatory Code Review Phase

Every implementation MUST include a final expert code review before being marked complete:

**Review Checklist:**

1. **Anti-Pattern Detection**: Review all changes for common anti-patterns:
   - God objects (classes doing too much)
   - Tight coupling between components
   - Magic numbers or strings (use named constants)
   - Copy-paste code (extract to reusable functions)
   - Mutable global state

2. **SOLID Compliance**:
   - Single Responsibility: Each class/function does one thing
   - Open/Closed: Extensions via composition, not modification
   - Liskov Substitution: Subtypes are substitutable for base types
   - Interface Segregation: No fat interfaces
   - Dependency Inversion: Depend on abstractions, not concretions

3. **Naming Audit**:
   - File names follow conventions (kebab-case or PascalCase)
   - Class names are descriptive nouns (SearchBar, not Helper)
   - Method names are descriptive verbs (selectContext, not doIt)
   - Property names are semantic (mobileMenuLink, not locator)
   - No abbreviations unless universally understood (HTTP, URL)

4. **Decoupling Check**:
   - Loose coupling between modules
   - High cohesion within modules
   - Dependencies injected via constructors
   - No circular dependencies

5. **Testability Review**:
   - Code designed for testability (dependency injection, pure functions)
   - No network/file dependencies in unit tests
   - Test fixtures used appropriately
   - Mock/stub usage is minimal (prefer redesign over excessive mocking)

6. **Hack Detection**:
   - No TODO comments without issue tracking
   - Workarounds explicitly justified in comments
   - Magic numbers replaced with named constants
   - No commented-out code

7. **Best Practices**:
   - Adherence to framework conventions (Aphiria, Playwright, etc.)
   - Official documentation patterns followed
   - Language idioms used correctly (PHP 8.4, TypeScript 5.x)

**Process:**
- Conduct review BEFORE marking implementation complete
- Document findings and refactor as needed
- If no issues found, explicitly state in PR: "Code review complete - no anti-patterns detected"
- Failed review blocks PR approval

**Rationale**: Proactive code review catches design issues, naming problems, and anti-patterns before they become technical debt. This prevents the need for reactive refactoring when issues are discovered later.

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

**Version**: 1.2.0 | **Ratified**: 2025-12-19 | **Last Amended**: 2026-01-06
