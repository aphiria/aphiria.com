import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";

// Get list of clusters
digitalocean.getKubernetesClusters({}).then(clusters => {
    console.log("Found clusters:", clusters.clusters.map(c => ({ id: c.id, name: c.name })));
});
