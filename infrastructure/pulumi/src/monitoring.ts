import * as digitalocean from "@pulumi/digitalocean";

export function createMonitoring() {
    const apiUptimeCheck = new digitalocean.UptimeCheck("api", {
        name: "API Health Check",
        type: "https",
        target: "https://api.aphiria.com/health",
        regions: ["us_east", "us_west"],
    });

    const webUptimeCheck = new digitalocean.UptimeCheck("web", {
        name: "Web Health Check",
        type: "https",
        target: "https://www.aphiria.com",
        regions: ["us_east", "us_west"],
    });

    return {
        apiUptimeCheck,
        webUptimeCheck,
    };
}
