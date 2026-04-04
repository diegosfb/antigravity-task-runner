variable "render_api_key" {
  type        = string
  description = "Render API key"
  sensitive   = true
}

variable "branch" {
  type        = string
  description = "Git branch to deploy"
  default     = "main"
}

variable "region" {
  type        = string
  description = "Render region (ohio, oregon, virginia, frankfurt, singapore)"
  default     = ""
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

variable "build_command" {
  type        = string
  description = "Build command"
  default     = "npm install --include=dev && npm run build"
}

variable "start_command" {
  type        = string
  description = "Start command"
  default     = "npm start"
}

variable "auto_deploy" {
  type        = bool
  description = "Enable auto deploy"
  default     = true
}
