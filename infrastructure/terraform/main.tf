module "kubernetes" {
    source = "./modules/kubernetes"
    do_access_token = var.do_access_token
}

module "networking" {
    source = "./modules/networking"
    do_access_token = var.do_access_token
}

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
