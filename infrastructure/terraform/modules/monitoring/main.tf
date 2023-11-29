terraform {
    required_providers {
        digitalocean = {
            source  = "digitalocean/digitalocean"
            version = "~> 2.0"
        }
    }
}

resource "digitalocean_uptime_check" "api" {
    name = "API Health Check"
    type = "https"
    target = "https://api.aphiria.com/health"
    regions = ["us_east", "us_west"]
}

resource "digitalocean_uptime_check" "web" {
    name = "Web Health Check"
    type = "https"
    target = "https://www.aphiria.com"
    regions = ["us_east", "us_west"]
}
