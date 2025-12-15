# Migration from Terraform to Pulumi

This document outlines the steps to migrate from Terraform to Pulumi with zero downtime.

## Prerequisites

1. Pulumi CLI installed (`./install.sh --install-pulumi`)
2. Node.js and npm installed
3. DigitalOcean credentials configured

## Migration Steps

### 1. Install Dependencies

```bash
cd infrastructure/pulumi
npm install
```

### 2. Configure Backend

Set up environment variables for the S3-compatible backend (DigitalOcean Spaces):

```bash
# For S3 backend (state storage)
export AWS_ACCESS_KEY_ID="<your-spaces-access-key>"
export AWS_SECRET_ACCESS_KEY="<your-spaces-secret-key>"
export AWS_REGION="us-east-1"

# For DigitalOcean provider (same values as above, different variable names)
export DIGITALOCEAN_TOKEN="<your-do-token>"
export SPACES_ACCESS_KEY_ID="<your-spaces-access-key>"  # Same as AWS_ACCESS_KEY_ID
export SPACES_SECRET_ACCESS_KEY="<your-spaces-secret-key>"  # Same as AWS_SECRET_ACCESS_KEY

# For Pulumi encryption
export PULUMI_CONFIG_PASSPHRASE="<choose-a-strong-passphrase>"
```

### 3. Login to Pulumi Backend

```bash
pulumi login s3://aphiria-com-infrastructure?endpoint=nyc3.digitaloceanspaces.com&region=us-east-1&s3ForcePathStyle=true
```

### 4. Initialize Stack

```bash
pulumi stack init prod
```

### 5. Import Existing Resources

Import all existing resources from your Terraform state into Pulumi. This ensures Pulumi manages the existing infrastructure without recreating it.

**Storage Bucket:**
```bash
pulumi import digitalocean:index/spacesBucket:SpacesBucket aphiria-com-infrastructure nyc3,aphiria-com-infrastructure
```

**Kubernetes Cluster:**
```bash
# Get your cluster ID from DigitalOcean dashboard or: doctl kubernetes cluster list
pulumi import digitalocean:index/kubernetesCluster:KubernetesCluster aphiria-com-cluster <cluster-id>
```

**Domain:**
```bash
pulumi import digitalocean:index/domain:Domain default aphiria.com
```

**DNS Records:**
```bash
# A records
pulumi import digitalocean:index/dnsRecord:DnsRecord a aphiria.com,1744933307
pulumi import digitalocean:index/dnsRecord:DnsRecord api-a aphiria.com,1744933306

# CNAME records
pulumi import digitalocean:index/dnsRecord:DnsRecord www-cname aphiria.com,1744933304

# MX records
pulumi import digitalocean:index/dnsRecord:DnsRecord mx-default aphiria.com,1744933308  # priority 1, aspmx.l.google.com
pulumi import digitalocean:index/dnsRecord:DnsRecord mx-1 aphiria.com,1744933310        # priority 5, alt1.aspmx.l.google.com
pulumi import digitalocean:index/dnsRecord:DnsRecord mx-2 aphiria.com,1744933305        # priority 5, alt2.aspmx.l.google.com
pulumi import digitalocean:index/dnsRecord:DnsRecord mx-3 aphiria.com,1744933309        # priority 10, alt3.aspmx.l.google.com
pulumi import digitalocean:index/dnsRecord:DnsRecord mx-4 aphiria.com,1744933302        # priority 10, alt4.aspmx.l.google.com

# NS records (using the first occurrence of each)
pulumi import digitalocean:index/dnsRecord:DnsRecord ns-1 aphiria.com,1744933299  # ns1.digitalocean.com
pulumi import digitalocean:index/dnsRecord:DnsRecord ns-2 aphiria.com,1744933300  # ns2.digitalocean.com
pulumi import digitalocean:index/dnsRecord:DnsRecord ns-3 aphiria.com,1744933301  # ns3.digitalocean.com
```

**Uptime Checks:**
```bash
# Get uptime check IDs from: doctl monitoring uptime list
pulumi import digitalocean:index/uptimeCheck:UptimeCheck api a0512b62-000e-4344-9588-da1b1bb352b5
pulumi import digitalocean:index/uptimeCheck:UptimeCheck web 0258c53d-efa3-4f4f-85a1-084856151859
```

### 6. Verify Import

Run a preview to ensure Pulumi recognizes all resources without proposing changes:

```bash
pulumi preview --stack prod
```

Expected output: `no changes` or only minor metadata updates.

### 7. Test Deployment

Once imports are verified, test a deployment:

```bash
pulumi up --stack prod
```

### 8. Update GitHub Actions

The GitHub Actions workflows have already been updated in this repository to use Pulumi instead of Terraform.

**Environment Variables in GitHub Secrets:**
- `DIGITALOCEAN_ACCESS_TOKEN` - Used as `DIGITALOCEAN_TOKEN` for Pulumi
- `DIGITALOCEAN_SPACES_ACCESS_KEY` - Used as `AWS_ACCESS_KEY_ID` for S3 backend
- `DIGITALOCEAN_SPACES_SECRET_KEY` - Used as `AWS_SECRET_ACCESS_KEY` for S3 backend

### 9. Cleanup (After Successful Migration)

Once Pulumi is managing your infrastructure successfully:

1. Archive the Terraform directory (don't delete immediately)
2. Remove Terraform-related files from workflows (if desired)

## Key Differences

### Variable Configuration

**Terraform:**
```bash
terraform apply -var="do_access_token=$TOKEN"
```

**Pulumi:**
Environment variables or stack config:
```bash
export DIGITALOCEAN_TOKEN=$TOKEN
pulumi up --stack prod
```

### State Management

**Terraform:**
- State file: `s3://aphiria-com-infrastructure/infrastructure/terraform.tfstate`

**Pulumi:**
- State file: `s3://aphiria-com-infrastructure/.pulumi/stacks/prod.json`

### Outputs

**Terraform:**
```bash
terraform output -raw cluster_id
```

**Pulumi:**
```bash
pulumi stack output clusterId --stack prod
```

## Troubleshooting

### Import Errors

If imports fail, verify:
1. Resource IDs are correct
2. Environment variables are set correctly
3. You're in the correct directory (`infrastructure/pulumi`)

### Preview Shows Unwanted Changes

If preview shows resources being recreated:
1. Double-check that all resources are imported
2. Verify resource names match exactly
3. Check that configuration values match existing infrastructure

### CI/CD Issues

Ensure GitHub Actions secrets are correctly configured and the install script has execute permissions.
