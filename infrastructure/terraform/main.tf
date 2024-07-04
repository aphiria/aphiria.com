module "kubernetes" {
    source = "./modules/kubernetes"
    do_access_token = var.do_access_token
}

module "monitoring" {
    source = "./modules/monitoring"
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

# We likely had to provision the S3 bucket manually for it to store state (chicken-and-the-egg problem).  So, make sure we import it into state after the fact.
import {
    to = digitalocean_spaces_bucket.aphiria_com_infrastructure
    id = "nyc3,aphiria-com-infrastructure"
}

resource "digitalocean_spaces_bucket" "aphiria_com_infrastructure" {
    name = "aphiria-com-infrastructure"
    region = "nyc3"
}

# These outputs need to mirror the outputs from the modules so that they're accessible from the root module
output "cluster_id" {
    value = module.kubernetes.cluster_id
}

output "cluster_endpoint" {
    value = module.kubernetes.cluster_endpoint
}

output "cluster_kube_config_token" {
    value = module.kubernetes.cluster_kube_config_token
}

output "cluster_ca_certificate" {
    value = module.kubernetes.cluster_ca_certificate
}
