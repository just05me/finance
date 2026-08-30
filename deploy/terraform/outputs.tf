output "alb_dns" {
  value = aws_lb.app.dns_name
}

output "app_url" {
  value = "https://${var.domain_name}"
}

output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}

output "cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "service_name" {
  value = aws_ecs_service.web.name
}

output "db_endpoint" {
  value = aws_db_instance.pg.address
}

output "seed_password_rizo" {
  value     = random_password.rizo_password.result
  sensitive = true
}

output "seed_password_alina" {
  value     = random_password.alina_password.result
  sensitive = true
}
