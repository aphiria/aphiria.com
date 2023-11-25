terraform {
    required_providers {
        digitalocean = {
            source  = "digitalocean/digitalocean"
            version = "~> 2.0"
        }
    }
}

# We likely had to provision the S3 bucket manually for it to store state (chicken-and-the-egg problem).  So, make sure we import it into state after the fact.Z
import {
    to = digitalocean_spaces_bucket.aphiria_com_infrastructure
    id = "nyc3,aphiria-com-infrastructure"
}

resource "digitalocean_spaces_bucket" "aphiria_com_infrastructure" {
    name = "aphiria-com-infrastructure"
    region = "nyc3"
}
