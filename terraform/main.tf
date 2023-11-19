provider "digitalocean" {
  token = var.do_access_token
}

resource "digitalocean_kubernetes_cluster" "aphiria_com_cluster" {
  name = "aphiria-com-cluster"
  region = "nyc3"
  version = "latest"

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
