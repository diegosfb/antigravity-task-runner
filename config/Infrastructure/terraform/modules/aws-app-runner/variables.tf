variable "service_name" {
  type        = string
  description = "App Runner service name"
}

variable "ecr_repository_name" {
  type        = string
  description = "ECR repository name"
}

variable "image_identifier" {
  type        = string
  description = "Full ECR image identifier, e.g. <account>.dkr.ecr.<region>.amazonaws.com/repo:tag"
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

variable "auto_deploy" {
  type        = bool
  description = "Enable App Runner auto deployments"
  default     = true
}
