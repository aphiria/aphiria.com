import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { createMonitoringResources } from "../../../../src/stacks/lib/factories/monitoring";
import {
    MonitoringConfig,
    PrometheusConfig,
    GrafanaConfig,
} from "../../../../src/stacks/lib/config/types";
import * as k8s from "@pulumi/kubernetes";
import * as fs from "fs";

// Mock fs
vi.mock("fs");

// Mock the component functions
vi.mock("../../../../src/components", () => ({
    createNamespace: vi.fn(),
    installKubePrometheusStack: vi.fn(),
}));

vi.mock("../../../../src/components/grafana", () => ({
    createGrafana: vi.fn(),
}));

vi.mock("../../../../src/components/grafana-ingress", () => ({
    createGrafanaIngress: vi.fn(),
}));

vi.mock("../../../../src/components/grafana-alerts", () => ({
    createGrafanaAlerts: vi.fn(),
}));

vi.mock("../../../../src/components/dashboards", () => ({
    createDashboards: vi.fn(),
}));

import { createNamespace, installKubePrometheusStack } from "../../../../src/components";
import { createGrafana } from "../../../../src/components/grafana";
import { createGrafanaIngress } from "../../../../src/components/grafana-ingress";
import { createGrafanaAlerts } from "../../../../src/components/grafana-alerts";
import { createDashboards } from "../../../../src/components/dashboards";

describe("createMonitoringResources", () => {
    const k8sProvider = new k8s.Provider("test-provider", {
        kubeconfig: "fake-kubeconfig",
    });

    // Minimal valid configs
    const monitoringConfig = {
        namespace: {
            resourceQuota: {
                cpu: "10",
                memory: "20Gi",
                pods: "50",
            },
        },
    } as MonitoringConfig;

    const prometheusConfig = {
        scrapeInterval: "30s",
        authToken: "test-token",
        storageSize: "10Gi",
        retentionTime: "7d",
        resources: {
            requests: { cpu: "500m", memory: "512Mi" },
            limits: { cpu: "1000m", memory: "1Gi" },
        },
        operator: {
            resources: {
                requests: { cpu: "100m", memory: "128Mi" },
                limits: { cpu: "200m", memory: "256Mi" },
            },
            configReloader: {
                requests: { cpu: "100m", memory: "128Mi" },
                limits: { cpu: "200m", memory: "256Mi" },
            },
        },
        nodeExporter: {
            resources: {
                requests: { cpu: "100m", memory: "128Mi" },
                limits: { cpu: "200m", memory: "256Mi" },
            },
        },
        kubeStateMetrics: {
            resources: {
                requests: { cpu: "100m", memory: "128Mi" },
                limits: { cpu: "200m", memory: "256Mi" },
            },
        },
    } as PrometheusConfig;

    const grafanaConfig = {
        version: "11.0.0",
        replicas: 1,
        hostname: "grafana.local.aphiria.com",
        storageSize: "5Gi",
        resources: {
            requests: { cpu: "100m", memory: "256Mi" },
            limits: { cpu: "200m", memory: "512Mi" },
        },
        github: {
            org: "aphiria",
            clientId: "",
            clientSecret: "",
        },
        adminUser: "admin",
        defaultReceiver: "local-notifications",
        ingressSectionName: "https-subdomains",
    } as GrafanaConfig;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock fs methods - default to dashboard directory existing with .json files
        (fs.existsSync as Mock).mockReturnValue(true);
        (fs.readdirSync as Mock).mockReturnValue([
            "dashboard1.json",
            "dashboard2.json",
            "readme.md",
        ]);
        (fs.readFileSync as Mock).mockImplementation((filePath: string) => {
            if (filePath.toString().endsWith(".json")) {
                return JSON.stringify({ dashboard: "config" });
            }
            return "";
        });

        // Set up default mock return values
        (createNamespace as Mock).mockReturnValue({
            namespace: {},
            resourceQuota: {},
        });

        (installKubePrometheusStack as Mock).mockReturnValue({});
        (createDashboards as Mock).mockReturnValue({ configMap: {} });
        (createGrafanaAlerts as Mock).mockReturnValue({
            alertRulesConfigMap: {},
            contactPointsConfigMap: {},
            notificationPoliciesConfigMap: {},
        });
        (createGrafana as Mock).mockReturnValue({
            deployment: {},
            service: {},
            configMap: {},
            secret: {},
            pvc: {},
        });
        (createGrafanaIngress as Mock).mockReturnValue({
            httproute: {},
        });
    });

    describe("namespace creation", () => {
        it("should create monitoring namespace with resourceQuota from config", () => {
            createMonitoringResources({
                env: "local",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(createNamespace).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "monitoring",
                    resourceQuota: {
                        cpu: "10",
                        memory: "20Gi",
                        pods: "50",
                    },
                })
            );
        });

        it("should create monitoring namespace with environment label", () => {
            createMonitoringResources({
                env: "production",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(createNamespace).toHaveBeenCalledWith(
                expect.objectContaining({
                    environmentLabel: "production",
                })
            );
        });
    });

    describe("kube-prometheus-stack installation", () => {
        it("should install kube-prometheus-stack with Prometheus retention from config", () => {
            createMonitoringResources({
                env: "local",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(installKubePrometheusStack).toHaveBeenCalledWith(
                expect.objectContaining({
                    values: expect.objectContaining({
                        prometheus: expect.objectContaining({
                            prometheusSpec: expect.objectContaining({
                                retention: "7d",
                            }),
                        }),
                    }),
                }),
                expect.anything()
            );
        });

        it("should install kube-prometheus-stack with scrape interval from config", () => {
            createMonitoringResources({
                env: "local",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(installKubePrometheusStack).toHaveBeenCalledWith(
                expect.objectContaining({
                    values: expect.objectContaining({
                        prometheus: expect.objectContaining({
                            prometheusSpec: expect.objectContaining({
                                scrapeInterval: "30s",
                            }),
                        }),
                    }),
                }),
                expect.anything()
            );
        });

        it("should install kube-prometheus-stack with storage size from config", () => {
            createMonitoringResources({
                env: "local",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(installKubePrometheusStack).toHaveBeenCalledWith(
                expect.objectContaining({
                    values: expect.objectContaining({
                        prometheus: expect.objectContaining({
                            prometheusSpec: expect.objectContaining({
                                storageSpec: expect.objectContaining({
                                    volumeClaimTemplate: expect.objectContaining({
                                        spec: expect.objectContaining({
                                            resources: expect.objectContaining({
                                                requests: expect.objectContaining({
                                                    storage: "10Gi",
                                                }),
                                            }),
                                        }),
                                    }),
                                }),
                            }),
                        }),
                    }),
                }),
                expect.anything()
            );
        });

        it("should install kube-prometheus-stack with environment as external label", () => {
            createMonitoringResources({
                env: "production",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(installKubePrometheusStack).toHaveBeenCalledWith(
                expect.objectContaining({
                    values: expect.objectContaining({
                        prometheus: expect.objectContaining({
                            prometheusSpec: expect.objectContaining({
                                externalLabels: expect.objectContaining({
                                    environment: "production",
                                }),
                            }),
                        }),
                    }),
                }),
                expect.anything()
            );
        });

        it("should install kube-prometheus-stack with Prometheus resource limits from config", () => {
            createMonitoringResources({
                env: "local",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(installKubePrometheusStack).toHaveBeenCalledWith(
                expect.objectContaining({
                    values: expect.objectContaining({
                        prometheus: expect.objectContaining({
                            prometheusSpec: expect.objectContaining({
                                resources: {
                                    requests: { cpu: "500m", memory: "512Mi" },
                                    limits: { cpu: "1000m", memory: "1Gi" },
                                },
                            }),
                        }),
                    }),
                }),
                expect.anything()
            );
        });

        it("should install kube-prometheus-stack with Prometheus Operator resource limits from config", () => {
            createMonitoringResources({
                env: "local",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(installKubePrometheusStack).toHaveBeenCalledWith(
                expect.objectContaining({
                    values: expect.objectContaining({
                        prometheusOperator: expect.objectContaining({
                            resources: {
                                requests: { cpu: "100m", memory: "128Mi" },
                                limits: { cpu: "200m", memory: "256Mi" },
                            },
                        }),
                    }),
                }),
                expect.anything()
            );
        });

        it("should install kube-prometheus-stack with TLS and admission webhooks disabled", () => {
            createMonitoringResources({
                env: "local",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(installKubePrometheusStack).toHaveBeenCalledWith(
                expect.objectContaining({
                    values: expect.objectContaining({
                        prometheusOperator: expect.objectContaining({
                            tls: expect.objectContaining({ enabled: false }),
                            admissionWebhooks: expect.objectContaining({ enabled: false }),
                        }),
                    }),
                }),
                expect.anything()
            );
        });

        it("should install kube-prometheus-stack with node-exporter resource limits from config", () => {
            createMonitoringResources({
                env: "local",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(installKubePrometheusStack).toHaveBeenCalledWith(
                expect.objectContaining({
                    values: expect.objectContaining({
                        "prometheus-node-exporter": expect.objectContaining({
                            resources: {
                                requests: { cpu: "100m", memory: "128Mi" },
                                limits: { cpu: "200m", memory: "256Mi" },
                            },
                        }),
                    }),
                }),
                expect.anything()
            );
        });

        it("should install kube-prometheus-stack with kube-state-metrics enabled and resource limits from config", () => {
            createMonitoringResources({
                env: "local",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(installKubePrometheusStack).toHaveBeenCalledWith(
                expect.objectContaining({
                    values: expect.objectContaining({
                        "kube-state-metrics": expect.objectContaining({
                            enabled: true,
                            resources: {
                                requests: { cpu: "100m", memory: "128Mi" },
                                limits: { cpu: "200m", memory: "256Mi" },
                            },
                        }),
                    }),
                }),
                expect.anything()
            );
        });

        it("should install kube-prometheus-stack with Grafana and Alertmanager disabled", () => {
            createMonitoringResources({
                env: "local",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(installKubePrometheusStack).toHaveBeenCalledWith(
                expect.objectContaining({
                    values: expect.objectContaining({
                        grafana: expect.objectContaining({ enabled: false }),
                        alertmanager: expect.objectContaining({ enabled: false }),
                    }),
                }),
                expect.anything()
            );
        });
    });

    describe("Grafana creation", () => {
        it("should create Grafana with replicas from config", () => {
            createMonitoringResources({
                env: "local",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(createGrafana).toHaveBeenCalledWith(
                expect.objectContaining({
                    replicas: 1,
                })
            );
        });

        it("should create Grafana with resource limits from config", () => {
            createMonitoringResources({
                env: "local",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(createGrafana).toHaveBeenCalledWith(
                expect.objectContaining({
                    resources: {
                        requests: { cpu: "100m", memory: "256Mi" },
                        limits: { cpu: "200m", memory: "512Mi" },
                    },
                })
            );
        });

        it("should create Grafana with storage size from config", () => {
            createMonitoringResources({
                env: "local",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(createGrafana).toHaveBeenCalledWith(
                expect.objectContaining({
                    storageSize: "5Gi",
                })
            );
        });

        it("should create Grafana with domain from config", () => {
            createMonitoringResources({
                env: "local",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(createGrafana).toHaveBeenCalledWith(
                expect.objectContaining({
                    domain: "grafana.local.aphiria.com",
                })
            );
        });

        it("should create Grafana without GitHub auth when github.clientId is not provided", () => {
            createMonitoringResources({
                env: "local",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(createGrafana).toHaveBeenCalledWith(
                expect.objectContaining({
                    githubAuth: undefined,
                })
            );
        });

        it("should create Grafana with GitHub auth when github.clientId is provided", () => {
            const grafanaConfigWithGithub = {
                ...grafanaConfig,
                github: {
                    clientId: "test-client-id",
                    clientSecret: "test-client-secret",
                    org: "aphiria",
                },
            };

            createMonitoringResources({
                env: "production",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig: grafanaConfigWithGithub,
            });

            expect(createGrafana).toHaveBeenCalledWith(
                expect.objectContaining({
                    githubAuth: expect.objectContaining({
                        organization: "aphiria",
                        adminUser: "admin",
                    }),
                })
            );
        });

        it("should create Grafana without SMTP when smtp is not provided", () => {
            createMonitoringResources({
                env: "local",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(createGrafana).toHaveBeenCalledWith(
                expect.objectContaining({
                    smtp: undefined,
                })
            );
        });

        it("should create Grafana with SMTP when smtp is provided", () => {
            const grafanaConfigWithSMTP = {
                ...grafanaConfig,
                smtp: {
                    host: "smtp.example.com",
                    port: 587,
                    user: "noreply@aphiria.com",
                    password: "smtp-password",
                    fromAddress: "noreply@aphiria.com",
                },
            };

            createMonitoringResources({
                env: "production",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig: grafanaConfigWithSMTP,
            });

            expect(createGrafana).toHaveBeenCalledWith(
                expect.objectContaining({
                    smtp: expect.objectContaining({
                        port: 587,
                    }),
                })
            );
        });

        it("should create Grafana without basic auth when basicAuth is not provided", () => {
            createMonitoringResources({
                env: "local",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(createGrafana).toHaveBeenCalledWith(
                expect.objectContaining({
                    basicAuth: undefined,
                })
            );
        });

        it("should create Grafana with basic auth when basicAuth is provided", () => {
            const grafanaConfigWithBasicAuth = {
                ...grafanaConfig,
                basicAuth: {
                    user: "admin",
                    password: "admin-password",
                },
            };

            createMonitoringResources({
                env: "preview",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig: grafanaConfigWithBasicAuth,
            });

            expect(createGrafana).toHaveBeenCalledWith(
                expect.objectContaining({
                    basicAuth: expect.anything(),
                })
            );
        });
    });

    describe("Grafana alert contact points", () => {
        it("should create email contact point for production when alertEmail is configured", () => {
            const grafanaConfigWithEmail = {
                ...grafanaConfig,
                alertEmail: "alerts@aphiria.com",
            };

            createMonitoringResources({
                env: "production",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig: grafanaConfigWithEmail,
            });

            expect(createGrafanaAlerts).toHaveBeenCalledWith(
                expect.objectContaining({
                    contactPoints: expect.arrayContaining([
                        expect.objectContaining({
                            name: "email-admin",
                            receivers: expect.arrayContaining([
                                expect.objectContaining({
                                    type: "email",
                                    settings: expect.objectContaining({
                                        addresses: "alerts@aphiria.com",
                                    }),
                                }),
                            ]),
                        }),
                    ]),
                })
            );
        });

        it("should create webhook contact point for non-production environments", () => {
            createMonitoringResources({
                env: "local",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(createGrafanaAlerts).toHaveBeenCalledWith(
                expect.objectContaining({
                    contactPoints: [
                        {
                            name: "local-notifications",
                            receivers: [
                                {
                                    uid: "local-webhook",
                                    type: "webhook",
                                    settings: {
                                        url: "https://httpbin.org/status/200",
                                        httpMethod: "POST",
                                    },
                                    disableResolveMessage: false,
                                },
                            ],
                        },
                    ],
                })
            );
        });

        it("should create webhook contact point for production when alertEmail is not configured", () => {
            createMonitoringResources({
                env: "production",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(createGrafanaAlerts).toHaveBeenCalledWith(
                expect.objectContaining({
                    contactPoints: [
                        {
                            name: "local-notifications",
                            receivers: [
                                {
                                    uid: "local-webhook",
                                    type: "webhook",
                                    settings: {
                                        url: "https://httpbin.org/status/200",
                                        httpMethod: "POST",
                                    },
                                    disableResolveMessage: false,
                                },
                            ],
                        },
                    ],
                })
            );
        });
    });

    describe("dashboards", () => {
        it("should load dashboard files when dashboard directory exists", () => {
            createMonitoringResources({
                env: "local",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(createDashboards).toHaveBeenCalledWith(
                expect.objectContaining({
                    dashboards: expect.objectContaining({
                        "dashboard1.json": expect.any(String),
                        "dashboard2.json": expect.any(String),
                    }),
                })
            );
        });

        it("should skip loading dashboards when dashboard directory does not exist", () => {
            (fs.existsSync as Mock).mockReturnValue(false);

            createMonitoringResources({
                env: "local",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(createDashboards).toHaveBeenCalledWith(
                expect.objectContaining({
                    dashboards: {},
                })
            );
        });

        it("should only load .json files from dashboard directory", () => {
            (fs.readdirSync as Mock).mockReturnValue([
                "dashboard1.json",
                "readme.md",
                "config.txt",
                "dashboard2.json",
            ]);

            createMonitoringResources({
                env: "local",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(createDashboards).toHaveBeenCalledWith(
                expect.objectContaining({
                    dashboards: expect.objectContaining({
                        "dashboard1.json": expect.any(String),
                        "dashboard2.json": expect.any(String),
                    }),
                })
            );
            // Verify non-.json files are not loaded
            const call = (createDashboards as Mock).mock.calls[0][0];
            expect(call.dashboards["readme.md"]).toBeUndefined();
            expect(call.dashboards["config.txt"]).toBeUndefined();
        });
    });

    describe("Grafana ingress", () => {
        it("should create Grafana ingress with hostname from config", () => {
            createMonitoringResources({
                env: "local",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(createGrafanaIngress).toHaveBeenCalledWith(
                expect.objectContaining({
                    hostname: "grafana.local.aphiria.com",
                })
            );
        });

        it("should create Grafana ingress attached to nginx-gateway", () => {
            createMonitoringResources({
                env: "local",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(createGrafanaIngress).toHaveBeenCalledWith(
                expect.objectContaining({
                    gatewayName: "nginx-gateway",
                    gatewayNamespace: "nginx-gateway",
                })
            );
        });

        it("should create Grafana ingress with sectionName from config", () => {
            createMonitoringResources({
                env: "local",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(createGrafanaIngress).toHaveBeenCalledWith(
                expect.objectContaining({
                    sectionName: "https-subdomains",
                })
            );
        });
    });
});
