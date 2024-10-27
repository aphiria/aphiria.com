module "kubernetes" {
    source = "./modules/kubernetes"
    do_access_token = var.do_access_token
}

module "monitoring" {
    source = "./modules/monitoring"
    depends_on = [module.kubernetes]
    do_access_token = var.do_access_token
}

module "networking" {
    source = "./modules/networking"
    depends_on = [module.kubernetes]
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

# These outputs are needed
output "cluster_id" {
    value = module.kubernetes.cluster_id
}
