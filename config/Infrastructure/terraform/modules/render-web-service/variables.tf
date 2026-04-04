variable "render_api_key" {
  type        = string
  description = "Render API key"
  sensitive   = true
}

variable "owner_id" {
  type        = string
  description = "Render owner ID"
  default     = ""
}

variable "service_name" {
  type        = string
  description = "Render service name"
}

variable "repo" {
  type        = string
  description = "Git repo URL (HTTPS)"
  default     = ""
}

variable "branch" {
  type        = string
  description = "Git branch to deploy"
  default     = "main"
}

variable "runtime" {
  type        = string
  description = "Render runtime environment"
  default     = "node"
}

variable "plan" {
  type        = string
  description = "Render plan name"
  default     = "free"
}

variable "region" {
  type        = string
  description = "Render region"
  default     = ""
}

variable "build_command" {
  type        = string
  description = "Build command"
  default     = ""
}

variable "start_command" {
  type        = string
  description = "Start command"
  default     = ""
}

variable "auto_deploy" {
  type        = bool
  description = "Enable auto deploy"
  default     = true
}

variable "use_native_runtime" {
  type        = bool
  description = "Use native runtime source configuration"
  default     = false
}
