import { createMonitoringResources } from "../../../../src/stacks/lib/factories/monitoring";
import {
    MonitoringConfig,
    PrometheusConfig,
    GrafanaConfig,
} from "../../../../src/stacks/lib/config/types";
import * as k8s from "@pulumi/kubernetes";

// Mock the component functions
jest.mock("../../../../src/components", () => ({
    createNamespace: jest.fn(),
    installKubePrometheusStack: jest.fn(),
}));

jest.mock("../../../../src/components/grafana", () => ({
    createGrafana: jest.fn(),
}));

jest.mock("../../../../src/components/grafana-ingress", () => ({
    createGrafanaIngress: jest.fn(),
}));

jest.mock("../../../../src/components/grafana-alerts", () => ({
    createGrafanaAlerts: jest.fn(),
}));

jest.mock("../../../../src/components/dashboards", () => ({
    createDashboards: jest.fn(),
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
        jest.clearAllMocks();

        // Set up default mock return values
        (createNamespace as jest.Mock).mockReturnValue({
            namespace: {},
            resourceQuota: {},
        });

        (installKubePrometheusStack as jest.Mock).mockReturnValue({});
        (createDashboards as jest.Mock).mockReturnValue({ configMap: {} });
        (createGrafanaAlerts as jest.Mock).mockReturnValue({
            alertRulesConfigMap: {},
            contactPointsConfigMap: {},
            notificationPoliciesConfigMap: {},
        });
        (createGrafana as jest.Mock).mockReturnValue({
            deployment: {},
            service: {},
            configMap: {},
            secret: {},
            pvc: {},
        });
        (createGrafanaIngress as jest.Mock).mockReturnValue({
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

        it("should create local-notifications contact point for non-production environments", () => {
            createMonitoringResources({
                env: "local",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(createGrafanaAlerts).toHaveBeenCalledWith(
                expect.objectContaining({
                    contactPoints: expect.arrayContaining([
                        expect.objectContaining({
                            name: "local-notifications",
                        }),
                    ]),
                })
            );
        });

        it("should create local-notifications contact point for production when alertEmail is not configured", () => {
            createMonitoringResources({
                env: "production",
                provider: k8sProvider,
                monitoringConfig,
                prometheusConfig,
                grafanaConfig,
            });

            expect(createGrafanaAlerts).toHaveBeenCalledWith(
                expect.objectContaining({
                    contactPoints: expect.arrayContaining([
                        expect.objectContaining({
                            name: "local-notifications",
                        }),
                    ]),
                })
            );
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
