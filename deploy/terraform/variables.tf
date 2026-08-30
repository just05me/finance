variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "env" {
  type    = string
  default = "prod"
}

variable "app_name" {
  type    = string
  default = "finance"
}

variable "domain_name" {
  type        = string
  description = "Public DNS name for HTTPS (must have a Route53 hosted zone)"
}

variable "route53_zone_id" {
  type        = string
  description = "Route53 hosted zone id owning domain_name"
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "container_image" {
  type        = string
  description = "Full ECR image URI (leave empty on first apply; update after first push)"
  default     = ""
}

variable "task_cpu" {
  type    = number
  default = 256
}

variable "task_memory" {
  type    = number
  default = 512
}

variable "desired_count" {
  type    = number
  default = 1
}
