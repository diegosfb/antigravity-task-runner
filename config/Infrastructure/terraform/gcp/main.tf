terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  backend "s3" {}
}

locals {
  infra = yamldecode(file(abspath("${path.module}/../../gcp.yaml")))
  service_name = var.service_name != "" ? var.service_name : local.infra["WebService"]
  repo_id      = var.repository_id != "" ? var.repository_id : local.infra["Artifact Registry Repo"]
  app_image    = try(local.infra["Application Image"], local.service_name)
  image_tag    = try(local.infra["Tag"], "latest")
  image_uri    = var.image_uri != "" ? var.image_uri : "${local.infra["Region"]}-docker.pkg.dev/${local.infra["GCP ProjectID"]}/${local.repo_id}/${local.app_image}:${local.image_tag}"
}

provider "google" {
  project = local.infra["GCP ProjectID"]
  region  = local.infra["Region"]
}

module "cloud_run" {
  source         = "../modules/gcp-cloud-run"
  project_id     = local.infra["GCP ProjectID"]
  region         = local.infra["Region"]
  service_name   = local.service_name
  repository_id  = local.repo_id
  image_uri      = local.image_uri
  container_port = var.container_port
}

output "service_url" {
  value = module.cloud_run.service_url
}

output "artifact_registry_repo" {
  value = module.cloud_run.artifact_registry_repo
}

output "project_id" {
  value = local.infra["GCP ProjectID"]
}

output "region" {
  value = local.infra["Region"]
}

output "target_architecture" {
  value = local.infra["Target Architecture"]
}
