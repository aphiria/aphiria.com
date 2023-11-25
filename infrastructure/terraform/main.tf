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
