import * as digitalocean from "@pulumi/digitalocean";

export function createStorage() {
    const bucket = new digitalocean.SpacesBucket("aphiria-com-infrastructure", {
        name: "aphiria-com-infrastructure",
        region: "nyc3",
        acl: "private",
    }, {
        protect: true,
    });

    return {
        bucket,
    };
}
