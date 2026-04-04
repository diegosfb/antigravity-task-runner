variable "service_name" {
  type        = string
  description = "App Runner service name"
  default     = ""
}

variable "ecr_repository_name" {
  type        = string
  description = "ECR repository name"
  default     = ""
}

variable "image_identifier" {
  type        = string
  description = "Full ECR image identifier, e.g. <account>.dkr.ecr.<region>.amazonaws.com/repo:tag"
  default     = ""
}

variable "container_port" {
  type        = string
  description = "Container port for App Runner"
  default     = "8080"
}

variable "instance_cpu" {
  type        = string
  description = "App Runner CPU units"
  default     = "1024"
}

variable "instance_memory" {
  type        = string
  description = "App Runner memory"
  default     = "2048"
}
