terraform {
    required_providers {
        digitalocean = {
            source = "digitalocean/digitalocean"
            version = "~> 2.0"
        }
        kubernetes = {
            source  = "hashicorp/kubernetes"
            version = ">= 2.0.0"
        }
    }

    backend "s3" {
        endpoints = {
            s3 = "https://nyc3.digitaloceanspaces.com"
        }
        bucket = "aphiria-com-infrastructure"
        key = "infrastructure/terraform.tfstate"
        region = "us-east-1" # Dummy value since it's typically only required for AWS S3, not DO S3
        skip_requesting_account_id = true
        skip_credentials_validation = true
        skip_get_ec2_platforms = true
        skip_metadata_api_check = true
        skip_region_validation = true
        skip_s3_checksum = true
        # Note: access_key and secret_key values must be specified when running "terraform init" for S3 to store state
    }
}
