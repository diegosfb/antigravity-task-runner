terraform {
  required_providers {
    render = {
      source  = "render-oss/render"
      version = "~> 1.0"
    }
  }
}

provider "render" {
  api_key  = var.render_api_key
  owner_id = var.owner_id != "" ? var.owner_id : null
}

resource "render_web_service" "app" {
  name        = var.service_name
  plan        = var.plan
  auto_deploy = var.auto_deploy

  repo          = var.use_native_runtime ? null : var.repo
  branch        = var.use_native_runtime ? null : var.branch
  env           = var.use_native_runtime ? null : var.runtime
  build_command = var.use_native_runtime ? null : var.build_command
  start_command = var.start_command
  region        = var.use_native_runtime ? var.region : null

  dynamic "runtime_source" {
    for_each = var.use_native_runtime ? [1] : []
    content {
      native_runtime {
        repo_url      = var.repo
        branch        = var.branch
        runtime       = var.runtime
        build_command = var.build_command
        auto_deploy   = var.auto_deploy
      }
    }
  }
}
