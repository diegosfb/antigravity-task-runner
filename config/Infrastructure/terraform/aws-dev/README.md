# AWS App Runner Terraform (Dev)

This stack provisions:
- ECR repository
- App Runner service
- IAM role for App Runner to pull images

It reads region, service name, image tag, and target architecture from `config/Infrastructure/aws-dev.yaml`.

## Usage

```bash
cd config/Infrastructure/terraform/aws-dev
terraform init \
  -backend-config="bucket=amzn-s3-terraform-build" \
  -backend-config="key=bettertris/aws-dev/terraform.tfstate" \
  -backend-config="region=us-east-2" \
  -backend-config="dynamodb_table=bettertris-terraform-lock" \
  -backend-config="encrypt=true"
terraform apply -auto-approve
```

## Example: Create aws-dev Infra (Recommended)

This is the standard path used by the project scripts. It also checks for
existing infra before applying changes.

```bash
./scripts/create-infra.sh config/Infrastructure/aws-dev.yaml
```

### What the script checks before applying
- App Runner service existence (by `WebService` name)
- ECR repository existence (by `Application Image`)
- Terraform state contents

If anything already exists, it will **inform you and ask for confirmation**
before proceeding.

### Manual pre-check (optional)
```bash
aws apprunner list-services --region us-east-2
aws ecr describe-repositories --region us-east-2
```
