resource "random_password" "session_secret" {
  length  = 48
  special = false
}

resource "aws_ssm_parameter" "session_secret" {
  name  = "/${var.app_name}/${var.env}/session_secret"
  type  = "SecureString"
  value = random_password.session_secret.result
}

resource "aws_ssm_parameter" "database_url" {
  name  = "/${var.app_name}/${var.env}/database_url"
  type  = "SecureString"
  value = "postgres://postgres:${var.db_password}@${aws_db_instance.pg.address}:5432/finance"
}

resource "random_password" "rizo_password" {
  length  = 16
  special = true
  override_special = "!@#$%^&*"
}
resource "random_password" "alina_password" {
  length  = 16
  special = true
  override_special = "!@#$%^&*"
}

resource "aws_ssm_parameter" "seed_password_rizo" {
  name  = "/${var.app_name}/${var.env}/seed_password_rizo"
  type  = "SecureString"
  value = random_password.rizo_password.result
}
resource "aws_ssm_parameter" "seed_password_alina" {
  name  = "/${var.app_name}/${var.env}/seed_password_alina"
  type  = "SecureString"
  value = random_password.alina_password.result
}
