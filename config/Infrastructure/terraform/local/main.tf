terraform {
  required_version = ">= 1.5.0"
}

locals {
  infra = yamldecode(file(abspath("${path.module}/../../local.yaml")))
}

output "deployment_url" {
  value = local.infra["Deployment URL"]
}

output "target_architecture" {
  value = local.infra["Target Architecture"]
}
