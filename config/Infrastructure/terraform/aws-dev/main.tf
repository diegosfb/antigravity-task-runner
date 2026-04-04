terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {}
}

locals {
  infra = yamldecode(file(abspath("${path.module}/../../aws-dev.yaml")))
  service_name = var.service_name != "" ? var.service_name : local.infra["WebService"]
  ecr_name     = var.ecr_repository_name != "" ? var.ecr_repository_name : local.infra["WebService"]
  app_image    = try(local.infra["Application Image"], local.ecr_name)
  account_id   = try(local.infra["AccountID"], "")
  image_tag    = try(local.infra["Tag"], "latest")
  auto_deploy  = try(local.infra["Auto Deploy"], true)
  image_identifier = var.image_identifier != "" ? var.image_identifier : "${local.account_id}.dkr.ecr.${local.infra["Region"]}.amazonaws.com/${local.app_image}:${local.image_tag}"
}

provider "aws" {
  region = local.infra["Region"]
}

module "app_runner" {
  source              = "../modules/aws-app-runner"
  service_name        = local.service_name
  ecr_repository_name = local.ecr_name
  image_identifier    = local.image_identifier
  container_port      = var.container_port
  instance_cpu        = var.instance_cpu
  instance_memory     = var.instance_memory
  auto_deploy         = local.auto_deploy
}

output "service_url" {
  value = module.app_runner.service_url
}

output "ecr_repository_url" {
  value = module.app_runner.ecr_repository_url
}

output "region" {
  value = local.infra["Region"]
}

output "target_architecture" {
  value = local.infra["Target Architecture"]
}
