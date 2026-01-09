/**
 * Grafana Component
 */

import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { buildLabels } from "./labels";
import { checksum } from "./utils";

/**
 * Arguments for Grafana component
 * All configuration must be passed explicitly
 */
export interface GrafanaArgs {
    /** Number of replicas */
    replicas: number;
    /** Container resource requirements */
    resources: k8s.types.input.core.v1.ResourceRequirements;
    /** Kubernetes namespace */
    namespace: pulumi.Input<string>;
    /** Prometheus service URL for datasource */
    prometheusUrl: pulumi.Input<string>;
    /** Storage size for dashboards (e.g., "5Gi") */
    storageSize: string;
    /** Grafana domain (e.g., "grafana.aphiria.com") */
    domain: string;
    /** Grafana image version */
    imageVersion: string;
    /** GitHub OAuth configuration (optional) */
    githubAuth?: {
        clientId: pulumi.Input<string>;
        clientSecret: pulumi.Input<string>;
        organization: string;
        adminUser: string;
    };
    /** Basic auth configuration (optional) */
    basicAuth?: {
        username: pulumi.Input<string>;
        password: pulumi.Input<string>;
    };
    /** SMTP configuration (optional) */
    smtp?: {
        host: pulumi.Input<string>;
        port: number;
        user: pulumi.Input<string>;
        password: pulumi.Input<string>;
        fromAddress: string;
    };
    /** Dashboards ConfigMap for auto-provisioning */
    dashboardsConfigMap?: k8s.core.v1.ConfigMap;
    /** Alert rules ConfigMap for Grafana Unified Alerting */
    alertRulesConfigMap?: k8s.core.v1.ConfigMap;
    /** Contact points ConfigMap for Grafana Unified Alerting */
    contactPointsConfigMap?: k8s.core.v1.ConfigMap;
    /** Notification policies ConfigMap for Grafana Unified Alerting */
    notificationPoliciesConfigMap?: k8s.core.v1.ConfigMap;
    /** Resource labels */
    labels?: Record<string, string>;
    /** Kubernetes provider */
    provider: k8s.Provider;
}

export interface GrafanaResult {
    deployment: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    service: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    pvc: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    configMap: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
    secret: pulumi.Output<k8s.types.output.meta.v1.ObjectMeta>;
}

/**
 * Creates Grafana deployment as a pure function
 *
 * All configuration decisions are made by the caller.
 *
 * @param args - Configuration for the Grafana deployment
 * @returns Deployment, Service, PVC, ConfigMap, and Secret metadata
 */
export function createGrafana(args: GrafanaArgs): GrafanaResult {
    const labels = buildLabels("grafana", "monitoring", args.labels);

    // Determine auth mode from provided config
    const useBasicAuth = !!args.basicAuth;
    const useGithubAuth = !!args.githubAuth && !useBasicAuth;
    const smtpEnabled = !!args.smtp;

    // Build secret data from provided configuration
    const secretData: Record<string, pulumi.Input<string>> = {};

    if (args.basicAuth) {
        secretData.GF_SECURITY_ADMIN_USER = args.basicAuth.username;
        secretData.GF_SECURITY_ADMIN_PASSWORD = args.basicAuth.password;
    } else if (args.githubAuth) {
        secretData.GF_AUTH_GITHUB_CLIENT_ID = args.githubAuth.clientId;
        secretData.GF_AUTH_GITHUB_CLIENT_SECRET = args.githubAuth.clientSecret;
    }

    if (args.smtp) {
        secretData.GF_SMTP_HOST = pulumi.interpolate`${args.smtp.host}:${args.smtp.port}`;
        secretData.GF_SMTP_USER = args.smtp.user;
        secretData.GF_SMTP_PASSWORD = args.smtp.password;
        secretData.GF_SMTP_FROM_ADDRESS = args.smtp.fromAddress;
    }

    const secret = new k8s.core.v1.Secret(
        "grafana-secrets",
        {
            metadata: {
                name: "grafana-secrets",
                namespace: args.namespace,
                labels,
            },
            type: "Opaque",
            stringData: secretData,
        },
        { provider: args.provider }
    );

    // Calculate checksums for ConfigMap data to trigger pod restarts on changes
    const dashboardChecksum = args.dashboardsConfigMap
        ? pulumi
              .output(args.dashboardsConfigMap.data)
              .apply((data) => checksum(data as Record<string, pulumi.Input<string>>))
        : undefined;

    const alertRulesChecksum = args.alertRulesConfigMap
        ? pulumi
              .output(args.alertRulesConfigMap.data)
              .apply((data) => checksum(data as Record<string, pulumi.Input<string>>))
        : undefined;

    const contactPointsChecksum = args.contactPointsConfigMap
        ? pulumi
              .output(args.contactPointsConfigMap.data)
              .apply((data) => checksum(data as Record<string, pulumi.Input<string>>))
        : undefined;

    const notificationPoliciesChecksum = args.notificationPoliciesConfigMap
        ? pulumi
              .output(args.notificationPoliciesConfigMap.data)
              .apply((data) => checksum(data as Record<string, pulumi.Input<string>>))
        : undefined;

    // Create ConfigMap for Grafana configuration
    const configMap = new k8s.core.v1.ConfigMap(
        "grafana-config",
        {
            metadata: {
                name: "grafana-config",
                namespace: args.namespace,
                labels,
            },
            data: {
                "grafana.ini": `
[server]
domain = ${args.domain}
root_url = https://${args.domain}
serve_from_sub_path = false

[security]
admin_user = \${GF_SECURITY_ADMIN_USER}
admin_password = \${GF_SECURITY_ADMIN_PASSWORD}

[auth]
disable_login_form = ${useBasicAuth ? "false" : "true"}
disable_signout_menu = false

[auth.basic]
enabled = ${useBasicAuth ? "true" : "false"}

[auth.github]
enabled = ${useGithubAuth ? "true" : "false"}
${
    useGithubAuth && args.githubAuth
        ? `allow_sign_up = true
scopes = user:email,read:org
auth_url = https://github.com/login/oauth/authorize
token_url = https://github.com/login/oauth/access_token
api_url = https://api.github.com/user
allowed_organizations = ${args.githubAuth.organization}
role_attribute_path = contains(groups[*], '@${args.githubAuth.organization}/${args.githubAuth.adminUser}') && 'Admin' || 'Viewer'`
        : ""
}

[users]
allow_sign_up = false
auto_assign_org = true
auto_assign_org_role = Viewer

[dashboards]
default_home_dashboard_path = /var/lib/grafana/dashboards/cluster-overview.json

[smtp]
enabled = ${smtpEnabled ? "true" : "false"}
skip_verify = false
`,
                "datasources.yaml": pulumi.interpolate`
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    uid: prometheus
    access: proxy
    url: ${args.prometheusUrl}
    isDefault: true
    editable: false
    jsonData:
      timeInterval: 15s
      manageAlerts: false
`,
                "dashboards.yaml": `
apiVersion: 1
providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
`,
            },
        },
        { provider: args.provider }
    );

    // Create PersistentVolumeClaim for Grafana data
    const pvc = new k8s.core.v1.PersistentVolumeClaim(
        "grafana-pvc",
        {
            metadata: {
                name: "grafana-pvc",
                namespace: args.namespace,
                labels,
            },
            spec: {
                accessModes: ["ReadWriteOnce"],
                resources: {
                    requests: {
                        storage: args.storageSize,
                    },
                },
            },
        },
        { provider: args.provider }
    );

    // Build environment variables based on auth configuration
    const envVars: k8s.types.input.core.v1.EnvVar[] = [];

    if (useBasicAuth) {
        envVars.push(
            {
                name: "GF_SECURITY_ADMIN_USER",
                valueFrom: {
                    secretKeyRef: {
                        name: secret.metadata.name,
                        key: "GF_SECURITY_ADMIN_USER",
                    },
                },
            },
            {
                name: "GF_SECURITY_ADMIN_PASSWORD",
                valueFrom: {
                    secretKeyRef: {
                        name: secret.metadata.name,
                        key: "GF_SECURITY_ADMIN_PASSWORD",
                    },
                },
            }
        );
    } else if (useGithubAuth) {
        envVars.push(
            {
                name: "GF_SECURITY_ADMIN_USER",
                value: "admin",
            },
            {
                name: "GF_SECURITY_ADMIN_PASSWORD",
                value: "admin", // Will be changed on first login via OAuth
            },
            {
                name: "GF_AUTH_GITHUB_CLIENT_ID",
                valueFrom: {
                    secretKeyRef: {
                        name: secret.metadata.name,
                        key: "GF_AUTH_GITHUB_CLIENT_ID",
                    },
                },
            },
            {
                name: "GF_AUTH_GITHUB_CLIENT_SECRET",
                valueFrom: {
                    secretKeyRef: {
                        name: secret.metadata.name,
                        key: "GF_AUTH_GITHUB_CLIENT_SECRET",
                    },
                },
            }
        );
    }

    if (smtpEnabled) {
        envVars.push(
            {
                name: "GF_SMTP_HOST",
                valueFrom: {
                    secretKeyRef: {
                        name: secret.metadata.name,
                        key: "GF_SMTP_HOST",
                    },
                },
            },
            {
                name: "GF_SMTP_USER",
                valueFrom: {
                    secretKeyRef: {
                        name: secret.metadata.name,
                        key: "GF_SMTP_USER",
                    },
                },
            },
            {
                name: "GF_SMTP_PASSWORD",
                valueFrom: {
                    secretKeyRef: {
                        name: secret.metadata.name,
                        key: "GF_SMTP_PASSWORD",
                    },
                },
            },
            {
                name: "GF_SMTP_FROM_ADDRESS",
                valueFrom: {
                    secretKeyRef: {
                        name: secret.metadata.name,
                        key: "GF_SMTP_FROM_ADDRESS",
                    },
                },
            }
        );
    }

    // Create Deployment for Grafana
    const deployment = new k8s.apps.v1.Deployment(
        "grafana",
        {
            metadata: {
                name: "grafana",
                namespace: args.namespace,
                labels,
            },
            spec: {
                replicas: args.replicas,
                selector: {
                    matchLabels: {
                        app: "grafana",
                    },
                },
                template: {
                    metadata: {
                        labels: {
                            app: "grafana",
                            "app.kubernetes.io/name": "grafana",
                            "app.kubernetes.io/component": "monitoring",
                        },
                        annotations: {
                            ...(dashboardChecksum
                                ? { "checksum/dashboards": dashboardChecksum }
                                : {}),
                            ...(alertRulesChecksum
                                ? { "checksum/alert-rules": alertRulesChecksum }
                                : {}),
                            ...(contactPointsChecksum
                                ? { "checksum/contact-points": contactPointsChecksum }
                                : {}),
                            ...(notificationPoliciesChecksum
                                ? { "checksum/notification-policies": notificationPoliciesChecksum }
                                : {}),
                        },
                    },
                    spec: {
                        securityContext: {
                            fsGroup: 472,
                            runAsUser: 472,
                            runAsNonRoot: true,
                        },
                        containers: [
                            {
                                name: "grafana",
                                image: `grafana/grafana:${args.imageVersion}`,
                                ports: [
                                    {
                                        name: "http",
                                        containerPort: 3000,
                                        protocol: "TCP",
                                    },
                                ],
                                env: envVars,
                                volumeMounts: [
                                    {
                                        name: "config",
                                        mountPath: "/etc/grafana",
                                    },
                                    {
                                        name: "datasources",
                                        mountPath: "/etc/grafana/provisioning/datasources",
                                    },
                                    ...(args.alertRulesConfigMap ||
                                    args.contactPointsConfigMap ||
                                    args.notificationPoliciesConfigMap
                                        ? [
                                              {
                                                  name: "alerting",
                                                  mountPath: "/etc/grafana/provisioning/alerting",
                                              },
                                          ]
                                        : []),
                                    {
                                        name: "dashboard-provisioning",
                                        mountPath: "/etc/grafana/provisioning/dashboards",
                                    },
                                    {
                                        name: "storage",
                                        mountPath: "/var/lib/grafana",
                                    },
                                    ...(args.dashboardsConfigMap
                                        ? [
                                              {
                                                  name: "dashboards",
                                                  mountPath: "/var/lib/grafana/dashboards",
                                              },
                                          ]
                                        : []),
                                ],
                                resources: args.resources,
                                livenessProbe: {
                                    httpGet: {
                                        path: "/api/health",
                                        port: "http",
                                    },
                                    initialDelaySeconds: 60,
                                    periodSeconds: 10,
                                    timeoutSeconds: 5,
                                },
                                readinessProbe: {
                                    httpGet: {
                                        path: "/api/health",
                                        port: "http",
                                    },
                                    initialDelaySeconds: 10,
                                    periodSeconds: 5,
                                    timeoutSeconds: 3,
                                },
                            },
                        ],
                        volumes: [
                            {
                                name: "config",
                                configMap: {
                                    name: configMap.metadata.name,
                                    items: [
                                        {
                                            key: "grafana.ini",
                                            path: "grafana.ini",
                                        },
                                    ],
                                },
                            },
                            {
                                name: "datasources",
                                configMap: {
                                    name: configMap.metadata.name,
                                    items: [
                                        {
                                            key: "datasources.yaml",
                                            path: "datasources.yaml",
                                        },
                                    ],
                                },
                            },
                            ...(args.alertRulesConfigMap ||
                            args.contactPointsConfigMap ||
                            args.notificationPoliciesConfigMap
                                ? [
                                      {
                                          name: "alerting",
                                          projected: {
                                              sources: [
                                                  ...(args.alertRulesConfigMap
                                                      ? [
                                                            {
                                                                configMap: {
                                                                    name: args.alertRulesConfigMap
                                                                        .metadata.name,
                                                                },
                                                            },
                                                        ]
                                                      : []),
                                                  ...(args.contactPointsConfigMap
                                                      ? [
                                                            {
                                                                configMap: {
                                                                    name: args
                                                                        .contactPointsConfigMap
                                                                        .metadata.name,
                                                                },
                                                            },
                                                        ]
                                                      : []),
                                                  ...(args.notificationPoliciesConfigMap
                                                      ? [
                                                            {
                                                                configMap: {
                                                                    name: args
                                                                        .notificationPoliciesConfigMap
                                                                        .metadata.name,
                                                                },
                                                            },
                                                        ]
                                                      : []),
                                              ],
                                          },
                                      },
                                  ]
                                : []),
                            {
                                name: "dashboard-provisioning",
                                configMap: {
                                    name: configMap.metadata.name,
                                    items: [
                                        {
                                            key: "dashboards.yaml",
                                            path: "dashboards.yaml",
                                        },
                                    ],
                                },
                            },
                            {
                                name: "storage",
                                persistentVolumeClaim: {
                                    claimName: pvc.metadata.name,
                                },
                            },
                            ...(args.dashboardsConfigMap
                                ? [
                                      {
                                          name: "dashboards",
                                          configMap: {
                                              name: args.dashboardsConfigMap.metadata.name,
                                          },
                                      },
                                  ]
                                : []),
                        ],
                    },
                },
            },
        },
        { provider: args.provider, dependsOn: [configMap, secret, pvc] }
    );

    // Create Service for Grafana
    const service = new k8s.core.v1.Service(
        "grafana",
        {
            metadata: {
                name: "grafana",
                namespace: args.namespace,
                labels,
            },
            spec: {
                type: "ClusterIP",
                selector: {
                    app: "grafana",
                },
                ports: [
                    {
                        name: "http",
                        port: 80,
                        targetPort: "http",
                        protocol: "TCP",
                    },
                ],
            },
        },
        { provider: args.provider }
    );

    return {
        deployment: deployment.metadata,
        service: service.metadata,
        pvc: pvc.metadata,
        configMap: configMap.metadata,
        secret: secret.metadata,
    };
}
