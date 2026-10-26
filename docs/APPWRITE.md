# Appwrite backend

CodeSensei использует self-hosted Appwrite 1.9.x (TablesDB) вместо Supabase.
Все обращения к базе идут только с сервера (Next.js server components и route
handlers) через серверный SDK с API-ключом. Браузер никогда не получает ключ и
не работает с Appwrite напрямую.

## Переменные окружения

Создайте `.env.local` (файл в `.gitignore`):

```dotenv
APPWRITE_ENDPOINT=https://aw.example.com/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_DATABASE_ID=codesensei
APPWRITE_API_KEY=standard_...
# Необязательно: публичный endpoint для OAuth-редиректов (см. ниже)
# APPWRITE_OAUTH_ENDPOINT=https://appwrite.example.com/v1

OMNIROUTE_BASE_URL=https://omniroute.example.com/v1
OMNIROUTE_API_KEY=sk-...
OMNIROUTE_MODEL=antigravity/gemini-3-flash
# Необязательно: ограничения запроса (контекст модели ~1M токенов — это не они)
# OMNIROUTE_MAX_OUTPUT_TOKENS=8192
# OMNIROUTE_MAX_INPUT_CHARS=100000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`OMNIROUTE_MAX_OUTPUT_TOKENS` ограничивает только длину ответа модели
(`max_tokens`), а `OMNIROUTE_MAX_INPUT_CHARS` — размер одного фрагмента,
вставляемого в промпт (код ученика, описание, вывод). Оба значения можно
поднять; по умолчанию они выбраны с запасом для школьных задач и защищают от
многомегабайтных промптов.

Нужные scopes API-ключа: `databases.read`, `databases.write`, `tables.read`,
`tables.write`, `rows.read`, `rows.write`, `users.read`, `users.write`,
`sessions.write`.

## Развёртывание схемы

```bash
pnpm appwrite:setup   # база, таблицы, колонки, индексы (идемпотентно)
pnpm appwrite:seed    # достижения и демо-модули/задания
```

Скрипты читают `.env.local` через `node --env-file-if-exists`.

`appwrite:seed` обновляет существующие достижения (`ach_*`) — это позволяет
синхронизировать с БД названия, иконки, XP и условия. Модули и задания
создаются только если их ещё нет, чтобы не перезаписать контент и прогресс.
Подробнее — в [MANAGING_ACHIEVEMENTS.md](./MANAGING_ACHIEVEMENTS.md).

## Модель данных

База `codesensei`, таблицы:

| Таблица | Назначение |
| --- | --- |
| `users` | профиль (id = Appwrite user id), роль, XP, уровень |
| `modules` | учебные модули |
| `tasks` | задания модуля, тест-кейсы и подсказки в JSON-строках |
| `user_progress` | прогресс пользователя по модулю, уникальный индекс `(user_id, module_id)` |
| `task_attempts` | попытки решения |
| `achievements` | справочник достижений |
| `user_achievements` | полученные достижения, уникальный индекс `(user_id, achievement_id)` |
| `ai_generation_logs` | дневной лимит AI-генераций |

Особенности Appwrite 1.9, учтённые в схеме:

- JSON-поля (`test_cases`, `hints`, `condition_value`, `test_results`)
  хранятся как JSON-строки в колонках `mediumtext` и парсятся в
  `lib/appwrite/mappers.ts`.
- Колонки `varchar`, `text`, `mediumtext`, `enum`, `email` создаются
  отдельными вызовами SDK: `createTable` в 1.9 принимает только базовые типы.
- `created_at`/`updated_at` берутся из системных `$createdAt`/`$updatedAt`,
  кроме таблиц, где дата является доменным полем (`task_attempts.created_at`,
  `ai_generation_logs.created_at`, `user_achievements.earned_at`).
- Таблицы не имеют клиентских разрешений: доступ только по API-ключу.

## Аутентификация

- Вход/регистрация/выход — `app/api/auth/*`.
- Сервер создаёт сессию через серверный SDK и кладёт её секрет в HttpOnly
  cookie `a_session_<PROJECT_ID>`.
- `lib/utils/auth.ts`: `requireAuth()` / `requireAdmin()` для server components,
  `getAuthContext()` для route handlers.
- `proxy.ts` проверяет наличие cookie и редиректит на `/login` для защищённых
  разделов.
- Профиль создаётся автоматически при первом входе (`ensureUserProfile`).

### Роли

Роль хранится в `users.role` (`student` | `teacher` | `admin`). Чтобы выдать
права администратора:

1. Создайте пользователя в Appwrite Console → Auth (или через регистрацию).
2. Откройте таблицу `users` → строку с его ID → измените `role` на `admin`.

### Письма и OAuth

Восстановление пароля (`/api/auth/password-reset`) требует настроенного SMTP в
Appwrite.

Вход через **Google** и **GitHub** настроен и доступен на `/login` и
`/register` (кнопки в `components/oauth-buttons.tsx`). Провайдеры включены в
Appwrite Console → Auth → Providers.

Callback URL, зарегистрированный у провайдеров:

```text
https://appwrite.ravva.su/v1/account/sessions/oauth2/callback/google/<PROJECT_ID>
https://appwrite.ravva.su/v1/account/sessions/oauth2/callback/github/<PROJECT_ID>
```

Поток входа:

1. `GET /api/auth/oauth/{provider}` (`google` | `github`) запрашивает OAuth2-URL
   через `getOAuthAdminAccount()` и редиректит пользователя к провайдеру.
2. Провайдер возвращает код на callback Appwrite, Appwrite — на
   `/api/auth/oauth/callback` с параметрами `userId` и `secret`.
3. Callback обменивает их на сессию (`createSession`), кладёт httpOnly-cookie и
   вызывает `ensureUserProfile()`. Если OAuth-аккаунт получил новый Appwrite ID,
   `reconcileByEmail()` переносит профиль, прогресс, попытки и достижения на
   этот ID.

`getOAuthAdminAccount()` намеренно ходит в Appwrite через **публичный домен**:
провайдеры сверяют `redirect_uri` с зарегистрированным, а внутренний
Tailscale/docker-endpoint дал бы приватный IP. Если `APPWRITE_ENDPOINT`
внутренний, задайте `APPWRITE_OAUTH_ENDPOINT=https://appwrite.ravva.su/v1`
(иначе будет использован публичный `NEXT_PUBLIC_APPWRITE_ENDPOINT`).

## Деплой сайта (Appwrite Sites)

Прод-версия — Appwrite Site `codesensei`, а не Vercel. Конфигурация сайта лежит
в `appwrite.config.json` (framework `nextjs`, adapter `ssr`, runtime `node-22`).

### Авторизация CLI

```bash
npm install -g appwrite-cli

appwrite client \
  -e https://appwrite.ravva.su/v1 \
  -p "$APPWRITE_PROJECT_ID" \
  -k "$APPWRITE_API_KEY"
```

Команда сохраняет endpoint, project ID и API-ключ в конфиг CLI. Для
project-команд (sites, tablesdb, functions) достаточно ключа. Консольные
команды вроде `appwrite whoami` требуют полноценный `appwrite login` и с
API-ключом не работают.

### Деплой

```bash
appwrite sites create-deployment --site-id codesensei --code . --activate
```

CLI упаковывает текущую директорию (с учётом `.gitignore`), отправляет её в
Appwrite и запускает сборку. Флаг `--activate` переключает сайт на новый
деплой после успешного билда. Логи сборки выводятся в терминал и доступны в
Console.

### Проверка и откат

```bash
# текущий активный деплой
appwrite sites get --site-id codesensei

# история деплоев
appwrite sites list-deployments --site-id codesensei

# откат на предыдущий деплой
appwrite sites update-site-deployment \
  --site-id codesensei \
  --deployment-id <deployment-id>
```

### Переменные окружения

Переменные сайта задаются в Console (Sites → codesensei → Variables) или через
CLI:

```bash
appwrite sites list-variables --site-id codesensei
appwrite sites create-variable --site-id codesensei --key KEY --value VALUE --secret
```

Используются те же ключи, что и в `.env.local`: `APPWRITE_ENDPOINT`,
`APPWRITE_PROJECT_ID`, `APPWRITE_DATABASE_ID`, `APPWRITE_API_KEY`,
`NEXT_PUBLIC_APPWRITE_ENDPOINT`, `NEXT_PUBLIC_APPWRITE_PROJECT_ID`,
`NEXT_PUBLIC_SITE_URL`, `OMNIROUTE_BASE_URL`, `OMNIROUTE_API_KEY`,
`OMNIROUTE_MODEL`. Для OAuth при внутреннем `APPWRITE_ENDPOINT` также нужен
`APPWRITE_OAUTH_ENDPOINT`.
