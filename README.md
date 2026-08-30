# Финансы — семейный учёт

Веб-приложение для учёта семейных финансов: доходы, расходы, плановые платежи,
цели накоплений и аналитика. Модель — не «бюджет-лимит», а «сколько нужно
заработать, чтобы всё было сделано». Phone-first, PWA-совместимо, тёмная тема.

## Ментальная модель

- **Нужно заработать за месяц** = Σ плановых платежей (USD-экв) + Σ месячных
  взносов в активные цели. Считается автоматически.
- **Заработано** — сумма доходов месяца (Зарплата, Фриланс, Продажа и т.п.).
- **Осталось заработать** = Нужно − Заработано.
- **Свободно** = Заработано − Потрачено − Факт взносов в цели.
- **Красная сигнализация** включается при отклонениях: перерасход, минус по
  «Свободно», отставание по целям к 20-му числу, просроченные плановые платежи.

## Технологии

- Next.js 15 (App Router, RSC) + TypeScript
- Tailwind CSS + собственные примитивы UI в стиле Apple (материалы, пружинные
  анимации через `motion`, типографика с size-specific tracking)
- Drizzle ORM + **PostgreSQL** (`postgres-js` драйвер)
- `jose` (JWT в HttpOnly-cookie, 90 дней) + bcryptjs
- Recharts (готовы для аналитики)
- Lucide-react (иконки)

## Быстрый старт (локально)

Требования: Node.js 20+, Docker (для Postgres) — или локальный Postgres.

```bash
cp .env.example .env      # заполните SESSION_SECRET и, если нужно, DATABASE_URL
docker compose up -d db   # поднимет только Postgres
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Откройте [http://localhost:3000/login](http://localhost:3000/login).

### Учётные записи

Регистрация закрыта; двоих пользователей создаёт `db:seed`:

| Имя  | Email                 | Пароль                                              |
| ---- | --------------------- | --------------------------------------------------- |
| Ризо | `rizo@family.local`   | `SEED_PASSWORD_RIZO`  (иначе `changeme`)            |
| Алина | `alina@family.local` | `SEED_PASSWORD_ALINA` (иначе `changeme`)            |

Смените пароли в разделе **Настройки → Пароль**.

`SESSION_SECRET` (минимум 32 символа) — обязательный.

## Скрипты npm

| Команда              | Описание                                     |
| -------------------- | -------------------------------------------- |
| `npm run dev`        | dev-сервер Next.js (порт 3000)               |
| `npm run build`      | production-сборка                            |
| `npm run start`      | запуск production-сборки                     |
| `npm run lint`       | ESLint (Next.js правила)                     |
| `npm run db:generate`| сгенерировать миграции drizzle-kit           |
| `npm run db:migrate` | применить схему к Postgres                   |
| `npm run db:seed`    | посеять пользователей и категории            |

## Запуск полностью в Docker

```bash
cp .env.example .env  # заполните SESSION_SECRET (>=32 симв)
docker compose up -d --build
```

- Приложение доступно на `http://localhost:3000`.
- Postgres поднимается в контейнере `finance-db` с томом `pgdata`.
- Entrypoint дожидается БД, применяет миграции и запускает seed при пустой БД.

## Структура

```
src/
  app/                — маршруты App Router
    api/              — REST-эндпоинты (расходы, доходы, цели, планы, настройки, ...)
    (страницы)        — /, /months, /months/[year]/[month], /goals, /settings, /analytics, /login
  components/         — UI (app-shell, quick-add-sheet, month-workspace, goals-view, settings-view, theme-provider, toast-provider)
    ui/               — примитивы (button, card, dialog, input, segmented, stat-card, ...)
  db/                 — Drizzle schema, client, migrate, queries
  lib/                — auth, session, aggregate (needToEarn, summarizeMonth), format, month-service, owner, schemas
scripts/
  seed.ts             — пользователи + категории по умолчанию
public/
  manifest.webmanifest — PWA-манифест
  icon.svg            — исходная иконка приложения
```

## Резервное копирование Postgres

```bash
docker exec -t finance-db pg_dump -U postgres finance > backup-$(date +%F).sql
```

## Что уже реализовано

- **Аутентификация**: логин по email/паролю, JWT в HttpOnly-cookie на 90 дней.
- **Дашборд**: прогресс-бар «Заработано / Нужно заработать», 5 карточек-метрик,
  список последней активности, обзор целей, история месяцев, автосигнализация
  при отклонениях.
- **Быстрый ввод** (FAB «+»): всплывающий bottom-sheet с сегментом
  «Расход / Доход», категориями в горизонтальной ленте, UZS по умолчанию,
  чекбокс «Личный расход» (не виден партнёру), toast «Отменить» после сохранения,
  haptic-фидбек на телефоне.
- **Месяц**: табы Обзор / Расходы / Доходы / План, редактируемые плановые платежи
  с due-day и статусом «Оплачено», удаление свайпом эффектом.
- **Цели**: цель = title + target + monthlyContribution + status; редактор
  фактического взноса за месяц с красной подсветкой при отставании; авто-закрытие
  при достижении target.
- **Настройки**: тема (Авто/Светлая/Тёмная), резервный курс USD/UZS, категории
  расходов и доходов (add/rename/archive/restore/delete), регулярные доходы,
  смена пароля.
- **Мульти-юзер**: общая БД, `createdByUserId` во всех user-generated таблицах,
  «Личный» флаг у расхода скрывает от партнёра на уровне API.
- **Автосоздание месяца**: месяц создаётся на лету при первом заходе или при
  добавлении расхода в новый месяц (курс — из ЦБ Узбекистана с fallback на
  сохранённый; клонирует плановые платежи, шаблоны регулярных доходов и планы
  взносов в активные цели).
- **PWA-заготовка**: manifest.webmanifest, iOS meta-теги, viewport-fit=cover,
  safe-area паддинги, тёмная тема через `data-theme` + `prefers-color-scheme`.
- **Apple-дизайн**: пружинные анимации (`motion`), полупрозрачные материалы
  (`backdrop-filter`), 44px минимальные touch-таргеты, size-specific tracking,
  `prefers-reduced-motion` / `prefers-reduced-transparency` / `prefers-contrast`,
  тактильный отклик через Vibration API.

## Roadmap (v2)

- **Аналитика**: три слоя — инсайты (rules-based), KPI (Savings Rate, Runway,
  Goal ETA, Burn rate forecast), продвинутая виз (Sankey, календарная heatmap,
  cohort-таблица категорий, weekday/weekend, percentile-полосы).
- **Real-time**: polling 30–60с на дашборде + бейдж «+N новых от партнёра»,
  тумблер «Все / Мои / Партнёра».
- **Офлайн**: service worker с IndexedDB очередью POST /api/daily-expenses и
  Background Sync.
- **Cron месяца**: серверная задача 1-го числа для гарантированного создания
  нового месяца (сейчас — lazy при первом заходе).
- **Уведомления**: web push для просроченных платежей и превышения дневного среднего.
- **Passkey / биометрия** через WebAuthn.
- **Экспорт данных** (CSV / PDF).
- **AWS deployment**: инструкции/IaC для RDS + ECS Fargate + ALB + ACM +
  Secrets Manager + CloudWatch.

## Известные ограничения

- Excel-импорт (устаревший) удалён — данные начинаются с чистого seed.
- `db:generate` (drizzle-kit) не запускается автоматически; для schema-changes
  используем `src/db/migrate.ts` с idempotent CREATE TABLE IF NOT EXISTS.
- CBU API возвращает данные только по будним дням; при неудаче за 5 предыдущих
  дней используется `settings.default_rate`.
