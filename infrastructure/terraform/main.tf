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
    host = module.kubernetes.cluster_endpoint
    token = module.kubernetes.cluster_kube_config_token
    cluster_ca_certificate = base64decode(module.kubernetes.cluster_ca_certificate)
}
