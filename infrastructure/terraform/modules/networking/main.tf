terraform {
    required_providers {
        digitalocean = {
            source  = "digitalocean/digitalocean"
            version = "~> 2.0"
        }
        kubernetes = {
            source  = "hashicorp/kubernetes"
            version = ">= 2.0.0"
        }
    }
}

data "kubernetes_service" "load_balancer" {
    metadata {
        name = "nginx-gateway-nginx-gateway-fabric"
        namespace = "nginx-gateway"
    }
}

resource "digitalocean_domain" "default" {
    name = "aphiria.com"
}

resource "digitalocean_record" "a" {
    domain = digitalocean_domain.default.id
    type = "A"
    name = "@"
    value = data.kubernetes_service.load_balancer.status[0].load_balancer[0].ingress[0].ip
    ttl = 3600
}

resource "digitalocean_record" "api_a" {
    domain = digitalocean_domain.default.id
    type = "A"
    name = "api"
    value = data.kubernetes_service.load_balancer.status[0].load_balancer[0].ingress[0].ip
    ttl = 3600
}

resource "digitalocean_record" "www_cname" {
    domain = digitalocean_domain.default.id
    type = "CNAME"
    name = "www"
    value = "aphiria.com."
    ttl = 43200
}

resource "digitalocean_record" "mx_default" {
    domain = digitalocean_domain.default.id
    type = "MX"
    name = "@"
    priority = 1
    value = "aspmx.l.google.com."
    ttl = 1800
}

resource "digitalocean_record" "mx_1" {
    domain = digitalocean_domain.default.id
    type = "MX"
    name = "@"
    priority = 5
    value = "alt1.aspmx.l.google.com."
    ttl = 1800
}

resource "digitalocean_record" "mx_2" {
    domain = digitalocean_domain.default.id
    type = "MX"
    name = "@"
    priority = 5
    value = "alt2.aspmx.l.google.com."
    ttl = 1800
}

resource "digitalocean_record" "mx_3" {
    domain = digitalocean_domain.default.id
    type = "MX"
    name = "@"
    priority = 10
    value = "alt3.aspmx.l.google.com."
    ttl = 1800
}

resource "digitalocean_record" "mx_4" {
    domain = digitalocean_domain.default.id
    type = "MX"
    name = "@"
    priority = 10
    value = "alt4.aspmx.l.google.com."
    ttl = 1800
}

resource "digitalocean_record" "ns_1" {
    domain = digitalocean_domain.default.id
    type = "NS"
    name = "@"
    value = "ns1.digitalocean.com."
    ttl = 1800
}

resource "digitalocean_record" "ns_2" {
    domain = digitalocean_domain.default.id
    type = "NS"
    name = "@"
    value = "ns2.digitalocean.com."
    ttl = 1800
}

resource "digitalocean_record" "ns_3" {
    domain = digitalocean_domain.default.id
    type = "NS"
    name = "@"
    value = "ns3.digitalocean.com."
    ttl = 1800
}
