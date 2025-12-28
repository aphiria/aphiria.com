/**
 * Builds standard Kubernetes labels following k8s recommended practices
 * @param app Application identifier (e.g., "api", "web", "db")
 * @param component Component type (e.g., "backend", "frontend", "database")
 * @param custom Optional custom labels to merge
 */
export function buildLabels(
    app: string,
    component: string,
    custom?: Record<string, string>
): Record<string, string> {
    return {
        app,
        "app.kubernetes.io/name": app,
        "app.kubernetes.io/component": component,
        ...custom,
    };
}
