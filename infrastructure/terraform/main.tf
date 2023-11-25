module "terraform" {
    source = "./modules/terraform"
    do_access_token = var.do_access_token
}

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
    spaces_access_id = var.do_spaces_access_key
    spaces_secret_key = var.do_spaces_secret_key
}

provider "kubernetes" {
    host = module.kubernetes.cluster_endpoint
    token = module.kubernetes.cluster_kube_config_token
    cluster_ca_certificate = base64decode(module.kubernetes.cluster_ca_certificate)
}
