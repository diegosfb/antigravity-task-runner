# Render Terraform

This stack provisions a Render web service.

It reads defaults from `config/Infrastructure/render.yaml` (service name, build/start commands) and expects repo/branch via variables.

## Usage

```bash
cd config/Infrastructure/terraform/render
terraform init \
  -backend-config="bucket=amzn-s3-terraform-build" \
  -backend-config="key=bettertris/render/terraform.tfstate" \
  -backend-config="region=us-east-2" \
  -backend-config="dynamodb_table=bettertris-terraform-lock" \
  -backend-config="encrypt=true"
terraform apply -var="render_api_key=..." -var="repo=https://github.com/your-org/your-repo"
```
