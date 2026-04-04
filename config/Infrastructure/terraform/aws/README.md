# AWS App Runner Terraform

This stack provisions:
- ECR repository
- App Runner service
- IAM role for App Runner to pull images

It reads region and target architecture from `config/Infrastructure/aws.yaml`.

## Usage

```bash
cd config/Infrastructure/terraform/aws
terraform init \
  -backend-config="bucket=amzn-s3-terraform-build" \
  -backend-config="key=bettertris/aws/terraform.tfstate" \
  -backend-config="region=us-east-2" \
  -backend-config="dynamodb_table=bettertris-terraform-lock" \
  -backend-config="encrypt=true"
terraform apply -var="image_identifier=<account>.dkr.ecr.<region>.amazonaws.com/<service-name-from-config/Infrastructure/aws.yaml>:tag"
```

Notes:
- You must build/push the image to ECR before App Runner can deploy it.
- Target architecture is informational here; use it when building images.
- Backend defaults point to the shared BetterTris state bucket and lock table.
