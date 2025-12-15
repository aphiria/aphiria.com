import * as digitalocean from "@pulumi/digitalocean";

export function createMonitoring() {
    const apiUptimeCheck = new digitalocean.UptimeCheck("api", {
        enabled: true,
        name: "API Health Check",
        type: "https",
        target: "https://api.aphiria.com/health",
        regions: ["us_east", "us_west"],
    }, {
        protect: true,
    });

    const webUptimeCheck = new digitalocean.UptimeCheck("web", {
        enabled: true,
        name: "Web Health Check",
        type: "https",
        target: "https://www.aphiria.com",
        regions: ["us_east", "us_west"],
    }, {
        protect: true,
    });

    return {
        apiUptimeCheck,
        webUptimeCheck,
    };
}
