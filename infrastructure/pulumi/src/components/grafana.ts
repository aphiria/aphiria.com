import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { Environment, GrafanaResult } from "./types";
import { buildLabels } from "./labels";
import { checksum } from "./utils";

/**
 * Arguments for Grafana component
 */
export interface GrafanaArgs {
    /** Environment this Grafana instance targets */
    env: Environment;
    /** Kubernetes namespace */
    namespace: pulumi.Input<string>;
    /** Prometheus service URL for datasource */
    prometheusUrl: pulumi.Input<string>;
    /** Storage size for dashboards (e.g., "5Gi") */
    storageSize: string;
    /** GitHub OAuth client ID */
    githubClientId: pulumi.Input<string>;
    /** GitHub OAuth client secret */
    githubClientSecret: pulumi.Input<string>;
    /** GitHub organization for access control */
    githubOrg: string;
    /** GitHub user with admin privileges */
    adminUser: string;
    /** SMTP host for email alerts (optional, only for production) */
    smtpHost?: pulumi.Input<string>;
    /** SMTP port */
    smtpPort?: number;
    /** SMTP username */
    smtpUser?: pulumi.Input<string>;
    /** SMTP password */
    smtpPassword?: pulumi.Input<string>;
    /** Email sender address */
    smtpFromAddress?: string;
    /** Email recipient for alerts */
    alertEmail?: string;
    /** Dashboards ConfigMap for auto-provisioning */
    dashboardsConfigMap?: k8s.core.v1.ConfigMap;
    /** Basic auth username (optional, for preview environments) */
    basicAuthUser?: pulumi.Input<string>;
    /** Basic auth password (optional, for preview environments) */
    basicAuthPassword?: pulumi.Input<string>;
    /** Optional resource limits for containers */
    resources?: {
        requests?: { cpu?: string; memory?: string };
        limits?: { cpu?: string; memory?: string };
    };
    /** Resource labels */
    labels?: Record<string, string>;
    /** Kubernetes provider */
    provider: k8s.Provider;
}

/** Creates Grafana Deployment with GitHub OAuth and environment-specific alerting */
export function createGrafana(args: GrafanaArgs): GrafanaResult {
    const labels = buildLabels("grafana", "monitoring", args.labels);

    // Determine if this is production (email alerts) or non-production (no emails)
    const isProduction = args.env === "production";

    // Build Alertmanager configuration based on environment
    const alertmanagerConfig =
        isProduction && args.smtpHost
            ? `
alerting:
  contactpoints.yaml:
    apiVersion: 1
    contactPoints:
      - orgId: 1
        name: email
        receivers:
          - uid: email-receiver
            type: email
            settings:
              addresses: ${args.alertEmail}
              singleEmail: true
      - orgId: 1
        name: blackhole
        receivers:
          - uid: blackhole-receiver
            type: webhook
            settings:
              url: http://localhost:9999/blackhole

  policies.yaml:
    apiVersion: 1
    policies:
      - orgId: 1
        receiver: email
        group_by: ['alertname', 'cluster', 'service']
        group_wait: 10s
        group_interval: 10s
        repeat_interval: 12h
        matchers:
          - environment = production
      - orgId: 1
        receiver: blackhole
        group_by: ['alertname']
        matchers:
          - environment =~ "preview|local"
`
            : `
alerting:
  contactpoints.yaml:
    apiVersion: 1
    contactPoints:
      - orgId: 1
        name: blackhole
        receivers:
          - uid: blackhole-receiver
            type: webhook
            settings:
              url: http://localhost:9999/blackhole

  policies.yaml:
    apiVersion: 1
    policies:
      - orgId: 1
        receiver: blackhole
        group_by: ['alertname']
`;

    // Determine auth mode: basic auth for preview (if configured), otherwise GitHub OAuth
    const useBasicAuth = args.basicAuthUser !== undefined && args.basicAuthPassword !== undefined;

    // Create Secret for OAuth, SMTP, and basic auth credentials
    const secretData: Record<string, pulumi.Input<string>> = {};

    if (useBasicAuth) {
        secretData.GF_SECURITY_ADMIN_USER = args.basicAuthUser!;
        secretData.GF_SECURITY_ADMIN_PASSWORD = args.basicAuthPassword!;
    } else {
        secretData.GF_AUTH_GITHUB_CLIENT_ID = args.githubClientId;
        secretData.GF_AUTH_GITHUB_CLIENT_SECRET = args.githubClientSecret;
    }

    if (isProduction && args.smtpHost) {
        secretData.GF_SMTP_HOST = pulumi.interpolate`${args.smtpHost}:${args.smtpPort || 587}`;
        secretData.GF_SMTP_USER = args.smtpUser || "";
        secretData.GF_SMTP_PASSWORD = args.smtpPassword || "";
        secretData.GF_SMTP_FROM_ADDRESS = args.smtpFromAddress || "";
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
domain = grafana.aphiria.com
root_url = https://grafana.aphiria.com
serve_from_sub_path = false

[auth]
disable_login_form = ${useBasicAuth ? "false" : "true"}
disable_signout_menu = false

[auth.basic]
enabled = ${useBasicAuth ? "true" : "false"}

[auth.github]
enabled = ${useBasicAuth ? "false" : "true"}
${
    !useBasicAuth
        ? `allow_sign_up = true
scopes = user:email,read:org
auth_url = https://github.com/login/oauth/authorize
token_url = https://github.com/login/oauth/access_token
api_url = https://api.github.com/user
allowed_organizations = ${args.githubOrg}
role_attribute_path = contains(groups[*], '@${args.githubOrg}/${args.adminUser}') && 'Admin' || 'Viewer'`
        : ""
}

[users]
allow_sign_up = false
auto_assign_org = true
auto_assign_org_role = Viewer

[dashboards]
default_home_dashboard_path = /var/lib/grafana/dashboards/cluster-overview.json

[smtp]
enabled = ${isProduction && args.smtpHost ? "true" : "false"}
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
                "alertmanager.yaml": alertmanagerConfig,
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
                replicas: 1,
                strategy: {
                    type: "Recreate",
                },
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
                        annotations: dashboardChecksum
                            ? {
                                  "checksum/dashboards": dashboardChecksum,
                              }
                            : undefined,
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
                                image: "grafana/grafana:11.0.0",
                                ports: [
                                    {
                                        name: "http",
                                        containerPort: 3000,
                                        protocol: "TCP",
                                    },
                                ],
                                env: [
                                    ...(useBasicAuth
                                        ? [
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
                                              },
                                          ]
                                        : [
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
                                              },
                                          ]),
                                    ...(isProduction && args.smtpHost
                                        ? [
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
                                              },
                                          ]
                                        : []),
                                ],
                                volumeMounts: [
                                    {
                                        name: "config",
                                        mountPath: "/etc/grafana",
                                    },
                                    {
                                        name: "datasources",
                                        mountPath: "/etc/grafana/provisioning/datasources",
                                    },
                                    {
                                        name: "alerting",
                                        mountPath: "/etc/grafana/provisioning/alerting",
                                    },
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
                                resources: {
                                    requests: {
                                        cpu: "100m",
                                        memory: "256Mi",
                                    },
                                    limits: {
                                        cpu: "200m",
                                        memory: "512Mi",
                                    },
                                },
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
                            {
                                name: "alerting",
                                configMap: {
                                    name: configMap.metadata.name,
                                    items: [
                                        {
                                            key: "alertmanager.yaml",
                                            path: "alertmanager.yaml",
                                        },
                                    ],
                                },
                            },
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
