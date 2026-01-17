# Implementation Plan: Infrastructure Configuration Extraction

**Feature**: Infrastructure Configuration Extraction
**Branch**: `001-infrastructure-config-extraction`
**Status**: Planning
**Generated**: 2026-01-07

## Technical Context

### Current State Analysis

The Pulumi infrastructure components currently violate separation of concerns principles:
- Components contain hardcoded configuration values
- Components read files directly from the filesystem
- Components contain environment-specific logic and conditionals
- Components are not pure functions and have side effects
- Components are difficult to test without deployment

### Target Architecture

Transform all Pulumi components into pure functions that:
- Accept ALL configuration as explicit parameters
- Return infrastructure resources without side effects
- Contain ZERO environment-specific logic
- Are fully testable with mock configurations
- Can be reused across any project or environment

### Technology Stack

- **Language**: TypeScript 5.x
- **IaC Framework**: Pulumi 3.x
- **Testing**: Jest with Pulumi testing utilities
- **Configuration Format**: TypeScript interfaces with YAML/JSON for data
- **Validation**: Zod or similar schema validation library

### Integration Points

- **Stack Factory**: Will load configuration and pass to components
- **Configuration Files**: New `infrastructure/pulumi/src/config/` directory structure
- **Existing Components**: Incremental migration with parallel support
- **CI/CD Pipeline**: No changes required (refactoring only)

## Constitution Check

### Alignment with Core Principles

 **VII. Code Quality & Design Principles**
- Enforces Single Responsibility (components do infrastructure, config does configuration)
- Implements Dependency Injection (config passed as parameters)
- Improves testability (pure functions are easily testable)
- Eliminates anti-patterns (hardcoded values, file reads in components)

 **VI. CI/CD & Infrastructure Reuse**
- Makes infrastructure truly reusable across environments
- Follows DRY principles by extracting common configuration
- Parameterization ensures consistency across environments

 **III. Test Coverage**
- Enables unit testing of components without deployment
- Increases testability of infrastructure code

### Quality Gates

- All refactored components MUST have unit tests
- 100% test coverage for new configuration modules
- Zero lint errors/warnings (TypeScript strict mode)
- All existing deployments must work unchanged after refactoring

## Phase 0: Research & Architecture

### Research Tasks

1. **Configuration Schema Design Patterns**
   - Best practices for TypeScript configuration interfaces
   - Schema validation approaches (Zod vs io-ts vs others)
   - Configuration inheritance and composition patterns

2. **Pulumi Testing Strategies**
   - Mock resource creation patterns
   - Unit testing pure component functions
   - Integration testing with configuration

3. **Migration Patterns**
   - Parallel pattern support strategies
   - Feature flag approaches for gradual rollout
   - Rollback strategies if issues arise

### Architecture Decisions

Based on research and requirements:

**Decision**: Use TypeScript interfaces with Zod validation
- **Rationale**: Type safety at compile time, runtime validation for external config
- **Alternatives considered**: JSON Schema (less type-safe), io-ts (more complex)

**Decision**: Centralized config with environment overlays
- **Rationale**: Clear hierarchy, easy to understand precedence
- **Alternatives considered**: Distributed config (harder to manage), inline config (not reusable)

**Decision**: Direct refactoring approach
- **Rationale**: Cleaner codebase, no technical debt from maintaining dual patterns
- **Alternatives considered**: Adapter pattern (adds complexity), feature flags (unnecessary overhead)

## Phase 1: Design & Contracts

### Data Model

```typescript
// Configuration Structure
interface ComponentConfig {
  // Base configuration all components share
  metadata: {
    name: string;
    environment: string;
    tags: Record<string, string>;
  };

  // Component-specific configuration
  settings: Record<string, unknown>;

  // Sensitive value markers
  sensitive?: SensitiveConfig;
}

interface SensitiveConfig {
  fields: string[]; // Paths to sensitive fields
  handling: 'mask' | 'encrypt' | 'external';
}

interface ConfigurationSet {
  version: string;
  base: ComponentConfig;
  environments: Record<string, Partial<ComponentConfig>>;
  components: Record<string, ComponentConfig>;
}

// Component Interface Pattern
interface PureComponentArgs<T = unknown> {
  config: T;
  defaults?: Partial<T>;
}

type PureComponent<TArgs, TOutput> = (args: PureComponentArgs<TArgs>) => TOutput;
```

### Component Contracts

```typescript
// Example: Grafana Alerts Component
interface GrafanaAlertsConfig {
  alerts: AlertDefinition[];
  notificationChannels: NotificationChannel[];
  evaluationInterval: string;
}

export function createGrafanaAlerts(
  args: PureComponentArgs<GrafanaAlertsConfig>
): GrafanaAlertResources {
  // Pure transformation - no file reads, no environment checks
  const config = { ...args.defaults, ...args.config };

  return {
    alerts: config.alerts.map(alert => new AlertRule(alert)),
    channels: config.notificationChannels.map(ch => new Channel(ch))
  };
}

// Stack Factory Pattern
class StackFactory {
  private config: ConfigurationSet;

  constructor(configPath: string, environment: string) {
    this.config = this.loadAndMergeConfig(configPath, environment);
  }

  createComponent<T>(
    componentName: string,
    componentFn: PureComponent<T, any>
  ) {
    const componentConfig = this.config.components[componentName];
    const mergedConfig = this.mergeWithEnvironment(componentConfig);

    return componentFn({
      config: mergedConfig as T,
      defaults: this.getComponentDefaults(componentName)
    });
  }
}
```

### Configuration Schema

```yaml
# infrastructure/pulumi/src/config/base.yaml
version: "1.0.0"
metadata:
  project: aphiria-com
  owner: platform-team

components:
  grafana:
    adminEmail: admin@aphiria.com
    tls:
      enabled: true
      issuer: letsencrypt

  database:
    type: postgresql
    version: "15.3"
    storage: 10Gi

  prometheus:
    retention: 30d
    scrapeInterval: 15s

# infrastructure/pulumi/src/config/environments/production.yaml
extends: base.yaml
components:
  database:
    storage: 100Gi
    replicas: 3

  grafana:
    replicas: 2
```

## Phase 2: Implementation Tasks

### Task Breakdown

1. **Setup Configuration Structure** (2h)
   - Create `infrastructure/pulumi/src/config/` directory
   - Define base configuration interfaces
   - Implement configuration loader with merge logic
   - Add Zod schemas for validation

2. **Create Configuration Injection System** (2h)
   - Build configuration loader with validation
   - Implement configuration merge logic
   - Create type-safe configuration accessors
   - Add logging for configuration usage

3. **Refactor Grafana Component** (4h)
   - Extract hardcoded values to config
   - Remove file system reads
   - Convert to pure function
   - Add comprehensive unit tests
   - Update stack factory usage

4. **Refactor Prometheus Component** (4h)
   - Extract scrape configs to configuration
   - Remove RBAC hardcoding
   - Extract resource limits
   - Add unit tests
   - Update integration

5. **Refactor Database Component** (3h)
   - Extract version and storage settings
   - Remove health check hardcoding
   - Convert to pure function
   - Add tests
   - Update usage

6. **Refactor Helm Charts Component** (3h)
   - Extract chart versions and URLs
   - Remove resource limit hardcoding
   - Add configuration support
   - Test thoroughly
   - Update stacks

7. **Refactor Dashboard Component** (3h)
   - Move dashboard file reads to stack
   - Pass dashboards as configuration
   - Ensure backward compatibility
   - Add tests

8. **Update Stack Factory** (4h)
   - Implement configuration loading
   - Add environment override logic
   - Implement validation
   - Add error handling
   - Create helper utilities

9. **Migration Testing** (4h)
   - Test each component in isolation
   - Test full stack deployment
   - Verify no infrastructure changes
   - Test rollback scenarios
   - Performance testing

10. **Documentation & Training** (2h)
    - Document configuration schema
    - Create migration guide
    - Write troubleshooting guide
    - Prepare team training materials

### Testing Strategy

1. **Unit Tests** (per component)
   - Test with various configurations
   - Test default value handling
   - Test validation failures
   - Test edge cases

2. **Integration Tests**
   - Test configuration loading and merging
   - Test environment overrides
   - Test sensitive value handling
   - Test full stack creation

3. **Deployment Tests**
   - Deploy to local environment
   - Verify identical infrastructure via `pulumi diff`
   - Test configuration changes
   - Ensure no unexpected changes

## Risk Mitigation

### Identified Risks

1. **Breaking existing deployments**
   - Mitigation: Thorough testing with `pulumi diff` before deployment
   - Rollback: Git revert to previous working state

2. **Configuration errors**
   - Mitigation: Strong typing and runtime validation
   - Prevention: Comprehensive unit tests for each component

3. **Incomplete refactoring**
   - Mitigation: Complete one component fully before moving to next
   - Validation: Checklist for each component refactoring

4. **Team adoption**
   - Mitigation: Comprehensive documentation and training
   - Support: Clear examples and patterns to follow

## Success Metrics

-  All components pass purity checklist
-  100% unit test coverage for refactored components
-  Zero changes to deployed infrastructure (verified via Pulumi diff)
-  Deployment time to new environment reduced by 70%
-  Configuration changes deployable without code changes
-  All team members trained on new pattern

## Next Steps

1. Begin Phase 0 research tasks
2. Create `infrastructure/pulumi/src/config/` structure
3. Implement first component refactoring (Grafana) as proof of concept
4. Gather feedback and adjust approach
5. Continue with remaining components

---

**Status**: Ready for implementation
**Estimated Timeline**: 30 hours of development (reduced by 2h with removal of adapter layer)
**Priority**: High (addresses critical technical debt)