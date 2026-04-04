# GCP Cloud Run Terraform

This stack provisions:
- Artifact Registry repository
- Cloud Run service

It reads project, region, and target architecture from `config/Infrastructure/gcp.yaml`.

## Usage

```bash
cd config/Infrastructure/terraform/gcp
terraform init \
  -backend-config="bucket=amzn-s3-terraform-build" \
  -backend-config="key=bettertris/gcp/terraform.tfstate" \
  -backend-config="region=us-east-2" \
  -backend-config="dynamodb_table=bettertris-terraform-lock" \
  -backend-config="encrypt=true"
terraform apply -var="image_uri=us-central1-docker.pkg.dev/bettertris/cloud-run-source-deploy/battletris-server:tag"
```

Notes:
- Build and push the image to Artifact Registry before applying.
- Target architecture is informational here; use it during image builds.
