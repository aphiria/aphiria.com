provider "digitalocean" {
    token = var.do_access_token
}

provider "kubernetes" {
    host  = digitalocean_kubernetes_cluster.aphiria_com_cluster.endpoint
    token = digitalocean_kubernetes_cluster.aphiria_com_cluster.kube_config[0].token
    cluster_ca_certificate = base64decode(
        digitalocean_kubernetes_cluster.aphiria_com_cluster.kube_config[0].cluster_ca_certificate
    )
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
