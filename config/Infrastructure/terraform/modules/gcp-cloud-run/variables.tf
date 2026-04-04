variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type        = string
  description = "GCP region"
}

variable "service_name" {
  type        = string
  description = "Cloud Run service name"
}

variable "repository_id" {
  type        = string
  description = "Artifact Registry repository ID"
}

variable "repository_description" {
  type        = string
  description = "Artifact Registry description"
  default     = "BattleTris Cloud Run images"
}

variable "image_uri" {
  type        = string
  description = "Full image URI for Cloud Run"
}

variable "container_port" {
  type        = number
  description = "Container port"
  default     = 8080
}
