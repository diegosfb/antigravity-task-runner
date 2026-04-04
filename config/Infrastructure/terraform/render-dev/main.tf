terraform {
  required_version = ">= 1.5.0"
  required_providers {
    render = {
      source  = "render-oss/render"
      version = "~> 1.0"
    }
  }
  backend "s3" {}
}

locals {
  infra  = yamldecode(file(abspath("${path.module}/../../render-dev.yaml")))
  region = coalesce(try(local.infra["Region"], ""), var.region)
  auto_deploy = try(local.infra["Auto Deploy"], var.auto_deploy)
}

module "render_service" {
  source             = "../modules/render-web-service"
  render_api_key     = var.render_api_key
  owner_id           = local.infra["Render OwnerID"]
  service_name       = local.infra["WebService"]
  repo               = local.infra["Repository"]
  branch             = var.branch
  runtime            = var.runtime
  plan               = var.plan
  region             = local.region
  build_command      = var.build_command
  start_command      = var.start_command
  auto_deploy        = local.auto_deploy
  use_native_runtime = true
}

output "service_name" {
  value = module.render_service.service_name
}

output "service_url" {
  value = module.render_service.service_url
}
