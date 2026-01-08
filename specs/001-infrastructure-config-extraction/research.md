# Research: Infrastructure Configuration Extraction

**Feature**: Infrastructure Configuration Extraction
**Date**: 2026-01-07
**Status**: Complete

## Configuration Schema Validation

**Decision**: Use Zod for runtime validation
**Rationale**:
- Provides both TypeScript types and runtime validation from single source
- Excellent error messages for debugging configuration issues
- Smaller bundle size than alternatives
- Active maintenance and Pulumi community adoption

**Alternatives Considered**:
- **io-ts**: More functional approach but steeper learning curve
- **JSON Schema + Ajv**: Good for cross-language support but requires maintaining separate TypeScript types
- **Joi**: Good validation but less TypeScript integration
- **Class-validator**: Too OOP-focused for functional components

## Configuration File Format

**Decision**: TypeScript configuration files with YAML data files
**Rationale**:
- TypeScript config files provide type safety and IDE support
- YAML for data allows non-developers to edit
- Can import and validate YAML in TypeScript
- Best of both worlds: type safety + human readability

**Alternatives Considered**:
- **Pure YAML**: No compile-time type checking
- **Pure TypeScript**: Harder for non-developers to edit
- **JSON**: Less readable than YAML for complex structures
- **TOML**: Less familiar to team

## Component Migration Pattern

**Decision**: Direct Refactoring
**Rationale**:
- Cleaner codebase without dual patterns
- No technical debt from maintaining two systems
- Forces complete conversion ensuring consistency
- Simpler testing - only one pattern to test

**Implementation**:
```typescript
// Old component (before refactoring)
export function createGrafanaLegacy() {
  const alerts = fs.readFileSync('./alerts.yaml'); // Will be removed
  // ... hardcoded logic
}

// New component (after refactoring)
export function createGrafana(args: PureComponentArgs<GrafanaConfig>) {
  return args.alerts.map(alert => new AlertRule(alert)); // Pure function
}
```

**Alternatives Considered**:
- **Adapter Pattern**: Adds complexity, maintains technical debt
- **Feature Flags**: Unnecessary overhead for refactoring
- **Parallel Support**: Prolongs migration, increases maintenance burden

## Configuration Precedence

**Decision**: Base → Component → Environment → Runtime
**Rationale**:
- Clear, predictable precedence order
- Follows principle of least surprise
- Matches common configuration patterns (Helm, Kubernetes)
- Environment always wins (as specified in requirements)

**Merge Strategy**: Deep merge for objects, replace for arrays
```typescript
// Objects merge deeply
base: { db: { host: 'localhost', port: 5432 } }
env:  { db: { host: 'prod-db' } }
result: { db: { host: 'prod-db', port: 5432 } }

// Arrays replace entirely
base: { alerts: [alert1, alert2] }
env:  { alerts: [alert3] }
result: { alerts: [alert3] }
```

**Alternatives Considered**:
- **Array Concatenation**: Unpredictable, can cause duplicates
- **Shallow Merge**: Loses nested configuration
- **No Merge**: Requires duplicating entire config per environment

## Sensitive Value Handling

**Decision**: Explicit field marking with external secret references
**Rationale**:
- Clear which fields are sensitive
- Prevents accidental exposure in logs
- Integrates with Pulumi's secret management
- Allows different handling strategies per deployment

**Implementation**:
```typescript
interface SensitiveField {
  path: string;          // "database.password"
  source: 'env' | 'file' | 'secret-manager';
  key: string;          // ENV_VAR_NAME or secret key
}
```

**Alternatives Considered**:
- **Convention-based**: Too implicit, easy to miss
- **Separate Files**: Harder to see full configuration
- **Encrypted Values**: Complex key management

## Testing Strategy for Components

**Decision**: Jest with Pulumi Mocks
**Rationale**:
- Jest is already used in the project
- Pulumi provides official mocking utilities
- Can test components without deployment
- Fast feedback loop during development

**Test Structure**:
```typescript
describe('GrafanaComponent', () => {
  beforeEach(() => {
    pulumi.runtime.setMocks({
      newResource: (args) => ({ id: args.name + '_id', ...args.inputs })
    });
  });

  it('creates alerts from configuration', () => {
    const result = createGrafana({
      config: { alerts: [testAlert] }
    });
    expect(result.alerts).toHaveLength(1);
  });
});
```

**Alternatives Considered**:
- **Integration Tests Only**: Too slow for development
- **Snapshot Testing**: Too brittle for infrastructure
- **Property-based Testing**: Overkill for this use case

## Directory Structure

**Decision**: Domain-based organization
**Rationale**:
- Groups related configuration together
- Scales well as configuration grows
- Clear ownership boundaries
- Easy to find relevant config

**Structure**:
```
infrastructure/pulumi/src/config/
├── base/
│   ├── metadata.ts
│   └── defaults.ts
├── components/
│   ├── database/
│   │   ├── config.ts
│   │   └── schema.ts
│   ├── monitoring/
│   │   ├── grafana.ts
│   │   └── prometheus.ts
│   └── networking/
├── environments/
│   ├── local.ts
│   ├── preview.ts
│   └── production.ts
└── index.ts  // Main configuration API
```

**Alternatives Considered**:
- **Flat Structure**: Doesn't scale well
- **By Environment First**: Harder to share component config
- **By Type**: Too abstract, less intuitive

## Performance Considerations

**Decision**: Lazy loading with memoization
**Rationale**:
- Only load configuration when needed
- Cache parsed configuration in memory
- Minimal impact on deployment performance
- Reuse across multiple component creations

**Implementation**:
```typescript
class ConfigLoader {
  private cache = new Map<string, ConfigurationSet>();

  load(path: string): ConfigurationSet {
    if (!this.cache.has(path)) {
      this.cache.set(path, this.parseAndValidate(path));
    }
    return this.cache.get(path)!;
  }
}
```

**Alternatives Considered**:
- **Eager Loading**: Wastes memory for unused config
- **No Caching**: Repeated parsing overhead
- **File Watching**: Too complex for deployment context

## Validation Error Handling

**Decision**: Fail fast with detailed errors
**Rationale**:
- Catches configuration errors before deployment
- Clear error messages speed debugging
- Prevents partial deployments
- Aligns with specified requirement (abort on validation failure)

**Error Format**:
```typescript
ConfigValidationError: Invalid configuration at 'database.replicas'
  Expected: number between 1-10
  Received: -1
  File: environments/production.ts:45
  Schema: components/database/schema.ts
```

**Alternatives Considered**:
- **Warning Only**: Could deploy broken infrastructure
- **Default Substitution**: Hidden behavior, surprising
- **Interactive Fixing**: Not suitable for CI/CD

## Rollback Strategy

**Decision**: Git-based rollback
**Rationale**:
- Simple and well-understood by team
- Complete reversion to working state
- No complex rollback mechanisms needed
- Aligns with direct refactoring approach

**Implementation**:
- Test thoroughly before merging
- Use `pulumi diff` to verify no unexpected changes
- If issues found, use `git revert`
- Redeploy from previous commit if needed

**Alternatives Considered**:
- **Dual-path Deployment**: Unnecessary with direct refactoring
- **Pulumi State Rollback**: Risky for production
- **Feature Flags**: Adds complexity for no benefit in refactoring

---

## Summary

All technical decisions have been researched and resolved. The chosen approaches prioritize:

1. **Safety**: Incremental migration with rollback capability
2. **Clarity**: Explicit configuration with strong typing
3. **Testability**: Pure functions with comprehensive mocking
4. **Maintainability**: Clear structure and validation

No remaining technical clarifications needed. Ready to proceed with implementation.