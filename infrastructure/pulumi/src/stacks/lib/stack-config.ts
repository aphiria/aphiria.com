import * as pulumi from "@pulumi/pulumi";

/**
 * Helper class to load Pulumi configuration values
 * Reduces repetitive config loading across stack files
 */
export class StackConfig {
    private config = new pulumi.Config();

    constructor(
        private webUrl: string,
        private apiUrl: string
    ) {}

    /**
     * Get web and API URLs
     */
    get urls() {
        return {
            web: this.webUrl,
            api: this.apiUrl,
        };
    }

    /**
     * Load PostgreSQL configuration
     */
    get postgresql() {
        const cfg = new pulumi.Config("postgresql");
        return {
            user: cfg.require("user"),
            password: cfg.requireSecret("password"),
        };
    }

    /**
     * Load GitHub Container Registry (GHCR) configuration
     */
    get ghcr() {
        const cfg = new pulumi.Config("ghcr");
        return {
            username: cfg.require("username"),
            token: cfg.requireSecret("token"),
        };
    }

    /**
     * Load cert-manager configuration
     */
    get certManager() {
        const cfg = new pulumi.Config("certmanager");
        return {
            dnsToken: cfg.requireSecret("digitaloceanDnsToken"),
        };
    }

    /**
     * Load container image digests and build image references
     */
    get images() {
        const webDigest = this.config.require("webImageDigest");
        const apiDigest = this.config.require("apiImageDigest");
        return {
            web: `ghcr.io/aphiria/aphiria.com-web@${webDigest}`,
            api: `ghcr.io/aphiria/aphiria.com-api@${apiDigest}`,
        };
    }

    /**
     * Load PR number for preview-pr stacks
     */
    get prNumber() {
        return this.config.requireNumber("prNumber");
    }

    /**
     * Load base stack reference for preview-pr stacks
     */
    get baseStackReference() {
        return this.config.require("baseStackReference");
    }

    /**
     * Load Prometheus configuration
     */
    get prometheus() {
        const cfg = new pulumi.Config("prometheus");
        return {
            authToken: cfg.requireSecret("authToken"),
        };
    }

    /**
     * Load Grafana configuration
     */
    get grafana() {
        const cfg = new pulumi.Config("grafana");
        return {
            githubClientId: cfg.requireSecret("githubClientId"),
            githubClientSecret: cfg.requireSecret("githubClientSecret"),
            githubOrg: cfg.require("githubOrg"),
            adminUser: cfg.require("adminUser"),
            smtpHost: cfg.requireSecret("smtpHost"),
            smtpPort: cfg.requireNumber("smtpPort"),
            smtpUser: cfg.requireSecret("smtpUser"),
            smtpPassword: cfg.requireSecret("smtpPassword"),
            smtpFromAddress: cfg.require("smtpFromAddress"),
            alertEmail: cfg.require("alertEmail"),
        };
    }
}
