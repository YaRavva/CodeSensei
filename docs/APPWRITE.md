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
Appwrite. Google/GitHub OAuth на сервере не настроены, поэтому кнопки OAuth
удалены из интерфейса. После настройки провайдеров в Console можно вернуть
вход через `account.createOAuth2Token` (см. `docs/APPWRITE.md` и официальную
документацию Appwrite SSR).
