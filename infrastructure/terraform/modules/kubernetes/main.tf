terraform {
    required_providers {
        digitalocean = {
            source  = "digitalocean/digitalocean"
            version = "~> 2.0"
        }
    }
}

resource "digitalocean_kubernetes_cluster" "aphiria_com_cluster" {
    name = "aphiria-com-cluster"
    region = "nyc3"
    version = "1.28.2-do.0"

    node_pool {
        name = "worker-pool"
        size = "s-2vcpu-2gb"
        node_count = 1
    }
}

output "cluster_id" {
    value = digitalocean_kubernetes_cluster.aphiria_com_cluster.id
}
