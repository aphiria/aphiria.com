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

# We likely had to provision the S3 bucket manually for it to store state (chicken-and-the-egg problem).  So, make sure we import it into state after the fact.
import {
    provider = digitalocean_spaces_bucket
    to = digitalocean_spaces_bucket.aphiria_com_infrastructure
    id = "aphiria-com-infrastructure"
}

resource "digitalocean_spaces_bucket" "aphiria_com_infrastructure" {
    name = "aphiria-com-infrastructure"
    region = "nyc3"
}
