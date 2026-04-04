variable "service_name" {
  type        = string
  description = "Cloud Run service name"
  default     = ""
}

variable "repository_id" {
  type        = string
  description = "Artifact Registry repository id"
  default     = ""
}

variable "image_uri" {
  type        = string
  description = "Container image URI for Cloud Run"
  default     = ""
}

variable "container_port" {
  type        = number
  description = "Container port"
  default     = 8080
}
