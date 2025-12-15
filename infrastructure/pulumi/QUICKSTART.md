# Quick Start - Migration Process

## Step 1: Create PR with Pulumi Code
You can now create a PR. The workflows are migration-safe:
- **test.yml**: Will run `pulumi preview` but won't fail if stack is empty
- **build-deploy.yml**: Will skip deployment if resources aren't imported yet

## Step 2: Import Resources (After PR is Merged)
Once merged to master, you need to import existing resources **locally**:

```bash
# 1. Set environment variables
export AWS_ACCESS_KEY_ID="<your-spaces-access-key>"
export AWS_SECRET_ACCESS_KEY="<your-spaces-secret-key>"
export DIGITALOCEAN_TOKEN="<your-do-token>"

# 2. Navigate to pulumi directory
cd infrastructure/pulumi
npm install

# 3. Login to backend
pulumi login s3://aphiria-com-infrastructure?endpoint=nyc3.digitaloceanspaces.com&region=us-east-1&s3ForcePathStyle=true

# 4. Select prod stack
pulumi stack select prod

# 5. Run import script
./import-resources.sh

# 6. Verify no changes
pulumi preview --stack prod
```

## Step 3: Trigger Deployment
Once resources are imported and `pulumi preview` shows no changes:

```bash
# Push any small change to trigger deployment
git commit --allow-empty -m "Trigger Pulumi deployment"
git push origin master
```

The deployment workflow will now:
- Detect resources are imported
- Run `pulumi up` successfully
- Manage infrastructure with zero downtime

## Step 4: Create PR to Remove Terraform
After Pulumi is successfully managing infrastructure, create a new PR to:
1. Remove `infrastructure/terraform/` directory
2. Remove Terraform from `install.sh`
3. Remove any other Terraform references

## Migration Flow Summary

```
PR #1: Add Pulumi code
  ↓
Merge to master (workflows skip Pulumi deployment)
  ↓
Local: Import resources via import-resources.sh
  ↓
Trigger deployment (empty commit or next change)
  ↓
Verify Pulumi is managing infrastructure
  ↓
PR #2: Remove Terraform code
```
