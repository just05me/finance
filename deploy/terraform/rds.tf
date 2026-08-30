resource "aws_db_subnet_group" "main" {
  name       = "${var.app_name}-db-subnet"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_db_instance" "pg" {
  identifier                 = "${var.app_name}-db"
  engine                     = "postgres"
  engine_version             = "16.4"
  instance_class             = "db.t4g.micro"
  allocated_storage          = 20
  max_allocated_storage      = 100
  storage_type               = "gp3"
  db_name                    = "finance"
  username                   = "postgres"
  password                   = var.db_password
  db_subnet_group_name       = aws_db_subnet_group.main.name
  vpc_security_group_ids     = [aws_security_group.db.id]
  publicly_accessible        = false
  skip_final_snapshot        = true
  backup_retention_period    = 7
  backup_window              = "03:00-04:00"
  maintenance_window         = "sun:04:30-sun:05:30"
  storage_encrypted          = true
  performance_insights_enabled = true
  auto_minor_version_upgrade = true
  deletion_protection        = false # включите true для продакшена
  tags                       = { Name = "${var.app_name}-db" }
}
