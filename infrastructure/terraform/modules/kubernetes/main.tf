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
    version = "1.31.1-do.5"

    node_pool {
        name = "worker-pool"
        size = "s-2vcpu-2gb"
        node_count = 1
    }
}

output "cluster_id" {
    value = digitalocean_kubernetes_cluster.aphiria_com_cluster.id
}

output "cluster_endpoint" {
    value = digitalocean_kubernetes_cluster.aphiria_com_cluster.endpoint
}

output "cluster_kube_config_token" {
    value = digitalocean_kubernetes_cluster.aphiria_com_cluster.kube_config[0].token
}

output "cluster_ca_certificate" {
    value = digitalocean_kubernetes_cluster.aphiria_com_cluster.kube_config[0].cluster_ca_certificate
}
