terraform {
    backend "s3" {
        endpoint = "nyc3.digitaloceanspaces.com"
        bucket = "aphiria-com-infrastructure"
        key = "infrastructure/terraform.tfstate" # Your desired path within the bucket
        region = "us-east-1"
        access_key = var.do_access_token
        encrypt = true
    }
}
