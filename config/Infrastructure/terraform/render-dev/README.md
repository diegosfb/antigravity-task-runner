# Render Terraform (Dev)

This stack provisions a Render web service using values from `config/Infrastructure/render-dev.yaml`.

## Usage

```bash
cd config/Infrastructure/terraform/render-dev
terraform init \
  -backend-config="bucket=amzn-s3-terraform-build" \
  -backend-config="key=bettertris/render-dev/terraform.tfstate" \
  -backend-config="region=us-east-2" \
  -backend-config="dynamodb_table=bettertris-terraform-lock" \
  -backend-config="encrypt=true"
terraform apply -var="render_api_key=..."
```
