# AWS деплой

Минимально-необходимая инфра под приложение: **VPC → RDS (Postgres 16, t4g.micro) → ECS Fargate → ALB + ACM (HTTPS)**, с образом в ECR, секретами в SSM Parameter Store и логами в CloudWatch.

Стек Terraform ниже — стартовая точка (не production-grade безопасность). Перед прод-раскаткой минимум:
- поменять пароли БД,
- пересобрать RDS в private-subnet (сейчас — публичный на всякий случай для миграций),
- включить multi-AZ у RDS,
- ужесточить IAM policy у ECS task,
- добавить WAF.

## Требования

- Terraform ≥ 1.7
- AWS CLI, настроенный на нужный аккаунт (`aws sso login` / профиль)
- Доменное имя в Route53 (для HTTPS через ACM). Если нет — можно временно ходить на публичный DNS ALB без TLS.

## Первый раскат

```bash
cd deploy/terraform
cp terraform.tfvars.example terraform.tfvars   # заполнить домен, пароль БД, регион
terraform init
terraform apply
```

Что создаётся:
- VPC 10.0.0.0/16, 2 public + 2 private subnets, IGW, NAT-GW
- RDS Postgres 16, t4g.micro, 20 GB gp3, backups 7 дней
- ECR-репозиторий `finance-app`
- ECS-кластер `finance`, сервис `web` на 1 таске (Fargate, 0.25 vCPU, 512 MB)
- ALB c HTTPS-листенером (ACM certificate по указанному домену)
- SSM параметры `/finance/prod/session_secret`, `/finance/prod/database_url`
- CloudWatch log group `/ecs/finance`

## Первый деплой образа

Через GitHub Actions (см. `.github/workflows/deploy.yml`) — по каждому push в `main` собирает Docker-образ, пушит в ECR и обновляет сервис ECS.

Ручной вариант:

```bash
AWS_REGION=us-east-1
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

docker build -t finance-app:latest .
docker tag finance-app:latest $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/finance-app:latest
docker push $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/finance-app:latest

aws ecs update-service --cluster finance --service web --force-new-deployment --region $AWS_REGION
```

## Миграции и сид

Первый раз БД пустая. `docker-entrypoint.sh` внутри контейнера сам применяет миграции и, если БД пуста, запускает `db:seed` (создаёт двух пользователей). Задать пароли можно через SSM-параметры:

```bash
aws ssm put-parameter --name /finance/prod/seed_password_rizo --value 'strong-password' --type SecureString --overwrite
aws ssm put-parameter --name /finance/prod/seed_password_alina --value 'strong-password' --type SecureString --overwrite
```

и добавить их в переменные task-definition (см. `terraform/ecs.tf`).

## Бэкапы

RDS: включены автоматические — 7 дней retention. Ручной снапшот:

```bash
aws rds create-db-snapshot --db-instance-identifier finance-db --db-snapshot-identifier finance-manual-$(date +%F)
```

## Секреты в GitHub Actions

Задайте secrets в репозитории:
- `AWS_ROLE_ARN` — IAM Role с политикой `AmazonEC2ContainerRegistryPowerUser` + `AmazonECS_FullAccess` (используется OIDC federation).
- `AWS_REGION` — регион (например `us-east-1`).
