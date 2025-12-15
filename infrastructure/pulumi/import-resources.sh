#!/bin/bash

# This script helps import existing Terraform-managed resources into Pulumi
# Run this script after initializing the Pulumi stack but before running pulumi up

set -e

echo "=== Pulumi Resource Import Script ==="
echo "This script will help you import your existing infrastructure into Pulumi."
echo ""

# Check if we're in the right directory
if [ ! -f "Pulumi.yaml" ]; then
    echo "Error: Must be run from the infrastructure/pulumi directory"
    exit 1
fi

# Check if logged in
if ! pulumi stack ls &>/dev/null; then
    echo "Error: Not logged into Pulumi. Run 'pulumi login' first."
    exit 1
fi

# Select the prod stack
pulumi stack select prod

echo ""
echo "Step 1: Import DigitalOcean Spaces Bucket"
echo "Run: pulumi import digitalocean:index/spacesBucket:SpacesBucket aphiria-com-infrastructure nyc3,aphiria-com-infrastructure"
read -p "Press Enter to import Spaces bucket, or Ctrl+C to skip..."
pulumi import digitalocean:index/spacesBucket:SpacesBucket aphiria-com-infrastructure nyc3,aphiria-com-infrastructure || echo "Warning: Import failed, may already be imported"

echo ""
echo "Step 2: Import Kubernetes Cluster"
echo "First, get your cluster ID:"
echo "  Option 1: doctl kubernetes cluster list"
echo "  Option 2: Check DigitalOcean dashboard"
read -p "Enter your cluster ID: " CLUSTER_ID
if [ -n "$CLUSTER_ID" ]; then
    pulumi import digitalocean:index/kubernetesCluster:KubernetesCluster aphiria-com-cluster "$CLUSTER_ID" || echo "Warning: Import failed, may already be imported"
else
    echo "Skipping cluster import"
fi

echo ""
echo "Step 3: Import Domain"
echo "Run: pulumi import digitalocean:index/domain:Domain default aphiria.com"
read -p "Press Enter to import domain, or Ctrl+C to skip..."
pulumi import digitalocean:index/domain:Domain default aphiria.com || echo "Warning: Import failed, may already be imported"

echo ""
echo "Step 4: Import DNS Records"
echo "First, get DNS record IDs:"
echo "  Run: doctl compute domain records list aphiria.com"
echo ""
read -p "Do you want to import DNS records now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter A record ID (@ record): " A_RECORD_ID
    [ -n "$A_RECORD_ID" ] && pulumi import digitalocean:index/dnsRecord:DnsRecord a "$A_RECORD_ID" || echo "Skipping"

    read -p "Enter A record ID for api subdomain: " API_A_RECORD_ID
    [ -n "$API_A_RECORD_ID" ] && pulumi import digitalocean:index/dnsRecord:DnsRecord api-a "$API_A_RECORD_ID" || echo "Skipping"

    read -p "Enter CNAME record ID for www: " WWW_CNAME_ID
    [ -n "$WWW_CNAME_ID" ] && pulumi import digitalocean:index/dnsRecord:DnsRecord www-cname "$WWW_CNAME_ID" || echo "Skipping"

    echo "Importing MX records..."
    read -p "Enter MX record ID (priority 1): " MX_DEFAULT_ID
    [ -n "$MX_DEFAULT_ID" ] && pulumi import digitalocean:index/dnsRecord:DnsRecord mx-default "$MX_DEFAULT_ID" || echo "Skipping"

    read -p "Enter MX record ID (priority 5, alt1): " MX_1_ID
    [ -n "$MX_1_ID" ] && pulumi import digitalocean:index/dnsRecord:DnsRecord mx-1 "$MX_1_ID" || echo "Skipping"

    read -p "Enter MX record ID (priority 5, alt2): " MX_2_ID
    [ -n "$MX_2_ID" ] && pulumi import digitalocean:index/dnsRecord:DnsRecord mx-2 "$MX_2_ID" || echo "Skipping"

    read -p "Enter MX record ID (priority 10, alt3): " MX_3_ID
    [ -n "$MX_3_ID" ] && pulumi import digitalocean:index/dnsRecord:DnsRecord mx-3 "$MX_3_ID" || echo "Skipping"

    read -p "Enter MX record ID (priority 10, alt4): " MX_4_ID
    [ -n "$MX_4_ID" ] && pulumi import digitalocean:index/dnsRecord:DnsRecord mx-4 "$MX_4_ID" || echo "Skipping"

    echo "Importing NS records..."
    read -p "Enter NS record ID (ns1.digitalocean.com): " NS_1_ID
    [ -n "$NS_1_ID" ] && pulumi import digitalocean:index/dnsRecord:DnsRecord ns-1 "$NS_1_ID" || echo "Skipping"

    read -p "Enter NS record ID (ns2.digitalocean.com): " NS_2_ID
    [ -n "$NS_2_ID" ] && pulumi import digitalocean:index/dnsRecord:DnsRecord ns-2 "$NS_2_ID" || echo "Skipping"

    read -p "Enter NS record ID (ns3.digitalocean.com): " NS_3_ID
    [ -n "$NS_3_ID" ] && pulumi import digitalocean:index/dnsRecord:DnsRecord ns-3 "$NS_3_ID" || echo "Skipping"
fi

echo ""
echo "Step 5: Import Uptime Checks"
echo "First, get uptime check IDs:"
echo "  Run: doctl monitoring uptime-check list"
echo ""
read -p "Do you want to import uptime checks now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter API uptime check ID: " API_CHECK_ID
    [ -n "$API_CHECK_ID" ] && pulumi import digitalocean:index/uptimeCheck:UptimeCheck api "$API_CHECK_ID" || echo "Skipping"

    read -p "Enter Web uptime check ID: " WEB_CHECK_ID
    [ -n "$WEB_CHECK_ID" ] && pulumi import digitalocean:index/uptimeCheck:UptimeCheck web "$WEB_CHECK_ID" || echo "Skipping"
fi

echo ""
echo "=== Import Complete ==="
echo ""
echo "Next steps:"
echo "1. Run 'pulumi preview' to verify no unwanted changes"
echo "2. If preview looks good, run 'pulumi up' to sync state"
echo "3. Update GitHub Actions to use Pulumi (already done in this repo)"
echo ""
