# Предлагаемая структура базы данных CodeSensei

## ER-диаграмма (текстовое описание)

```
users (Supabase Auth расширение)
├── id (UUID, primary key)
├── email (text)
├── role (text: 'student' | 'teacher' | 'admin')
├── display_name (text)
├── avatar_url (text, nullable)
├── total_xp (integer, default 0)
├── current_level (integer, default 1)
├── created_at (timestamp)
└── last_active_at (timestamp)

modules
├── id (UUID, primary key)
├── title (text)
├── description (text, nullable)
├── topic (text) -- например, "Переменные", "Циклы", "Функции"
├── level (integer) -- уровень сложности 1-5
├── order_index (integer) -- порядок отображения
├── is_published (boolean, default false)
├── created_by (UUID, foreign key -> users.id)
├── created_at (timestamp)
└── updated_at (timestamp)

lessons
├── id (UUID, primary key)
├── module_id (UUID, foreign key -> modules.id)
├── title (text)
├── theory_content (text) -- Markdown/HTML
├── order_index (integer) -- порядок внутри модуля
├── estimated_duration (integer) -- минуты
├── is_published (boolean, default false)
├── created_at (timestamp)
└── updated_at (timestamp)

tasks
├── id (UUID, primary key)
├── lesson_id (UUID, foreign key -> lessons.id)
├── title (text)
├── description (text) -- описание задания
├── starter_code (text) -- начальный код для ученика
├── solution_code (text, nullable) -- правильное решение (для админа)
├── test_cases (jsonb) -- массив тестов
│   └── [{
│         "input": "arg1, arg2",
│         "expected_output": "expected",
│         "description": "Тест 1"
│       }]
├── xp_reward (integer, default 10) -- XP за решение
├── difficulty (text: 'easy' | 'medium' | 'hard')
├── hints (jsonb, nullable) -- массив подсказок
├── order_index (integer) -- порядок задания в уроке
├── variant_number (integer, nullable) -- номер варианта задания (1-5) для случайного выбора
├── created_at (timestamp)
└── updated_at (timestamp)

user_progress
├── id (UUID, primary key)
├── user_id (UUID, foreign key -> users.id)
├── lesson_id (UUID, foreign key -> lessons.id)
├── status (text: 'not_started' | 'in_progress' | 'completed')
├── xp_earned (integer, default 0)
├── attempts_count (integer, default 0)
├── first_completed_at (timestamp, nullable)
├── last_attempt_at (timestamp, nullable)
└── updated_at (timestamp)
├── UNIQUE(user_id, lesson_id)

task_attempts
├── id (UUID, primary key)
├── user_id (UUID, foreign key -> users.id)
├── task_id (UUID, foreign key -> tasks.id)
├── code_solution (text) -- код, который написал ученик
├── test_results (jsonb) -- результаты тестов
├── is_successful (boolean)
├── used_ai_hint (boolean, default false)
├── execution_time_ms (integer, nullable)
├── error_message (text, nullable)
├── created_at (timestamp)
└── INDEX(user_id, task_id, created_at)

achievements
├── id (UUID, primary key)
├── title (text)
├── description (text)
├── icon_name (text) -- имя иконки из библиотеки
├── xp_reward (integer)
├── condition_type (text) -- 'first_task', 'perfect_week', 'module_complete', etc.
├── condition_value (jsonb) -- параметры условия
├── is_active (boolean, default true)
└── created_at (timestamp)

user_achievements
├── id (UUID, primary key)
├── user_id (UUID, foreign key -> users.id)
├── achievement_id (UUID, foreign key -> achievements.id)
├── earned_at (timestamp)
└── UNIQUE(user_id, achievement_id)

leaderboard_cache -- для оптимизации (опционально)
├── id (UUID, primary key)
├── user_id (UUID, foreign key -> users.id)
├── period (text: 'all_time' | 'week' | 'month')
├── xp (integer)
├── rank (integer)
├── updated_at (timestamp)
└── INDEX(period, xp DESC, rank)

ai_generation_logs -- логирование AI-генераций для rate limiting
├── id (UUID, primary key)
├── user_id (UUID, foreign key -> users.id)
├── generation_type (text: 'module' | 'task') -- тип генерации
├── created_at (timestamp)
├── created_date (date) -- дата создания (для быстрого подсчета за день)
└── UNIQUE(user_id, generation_type, created_date)
```

## Примеры данных

### test_cases (JSON структура)
**Формат:** JSON объект с именованными параметрами

```json
[
  {
    "id": "test_1",
    "description": "Базовый случай с положительными числами",
    "input": {
      "a": 5,
      "b": 3
    },
    "expected_output": 8,
    "category": "basic",
    "is_visible": true
  },
  {
    "id": "test_2",
    "description": "Граничный случай с отрицательными числами",
    "input": {
      "a": -5,
      "b": -3
    },
    "expected_output": -8,
    "category": "edge",
    "is_visible": false
  },
  {
    "id": "test_3",
    "description": "Граничный случай с нулем",
    "input": {
      "a": 0,
      "b": 5
    },
    "expected_output": 5,
    "category": "edge",
    "is_visible": false
  }
]
```

**Правила:**
- `input` - всегда объект JSON с именованными параметрами, соответствующими параметрам функции
- `expected_output` - может быть любого типа (number, string, boolean, array, object, null)
- `category` - "basic" (базовый), "edge" (граничный), "error" (обработка ошибок)
- `is_visible` - показывать ли тест ученику (true) или только для внутренней проверки (false)

### Система вариантов заданий

**Назначение:** Позволяет создавать 5 однотипных и примерно равных по сложности вариантов задания для каждого урока, из которых ученику случайно выдается один при открытии урока.

**Принцип работы:**
1. Для одного урока можно создать несколько заданий с одинаковым `order_index` (например, все с `order_index = 1`)
2. Каждое задание должно иметь уникальный `variant_number` от 1 до 5
3. При отображении списка заданий урока для каждого `order_index` случайно выбирается один вариант из доступных
4. Это обеспечивает разнообразие заданий для учеников при повторном прохождении

**Пример:**
```
Урок 1 (ID: abc-123):
  - Задание 1, вариант 1 (order_index: 1, variant_number: 1) - "Сумма двух чисел"
  - Задание 1, вариант 2 (order_index: 1, variant_number: 2) - "Произведение двух чисел"
  - Задание 1, вариант 3 (order_index: 1, variant_number: 3) - "Разность двух чисел"
  - Задание 1, вариант 4 (order_index: 1, variant_number: 4) - "Частное двух чисел"
  - Задание 1, вариант 5 (order_index: 1, variant_number: 5) - "Остаток от деления"
  
  При открытии урока ученик увидит случайный вариант из этих пяти.
```

**Важно:** Если `variant_number` не указан (NULL), задание считается единственным вариантом для своего `order_index`.

**Пример преобразования для Python:**
```python
# Код ученика
def add(a, b):
    return a + b

# Генерируемый код для теста
test_input = {"a": 5, "b": 3}
result = add(**test_input)  # Распаковка словаря
expected = 8
assert result == expected, f"Expected {expected}, got {result}"
```

### hints (JSON структура)
```json
[
  {
    "id": "hint_1",
    "text": "Подумай, как можно использовать цикл for",
    "unlock_after_attempts": 2
  },
  {
    "id": "hint_2",
    "text": "Проверь, правильно ли ты используешь индексы",
    "unlock_after_attempts": 4
  }
]
```

## Индексы для производительности

```sql
-- Частые запросы
CREATE INDEX idx_user_progress_user_lesson ON user_progress(user_id, lesson_id);
CREATE INDEX idx_tasks_lesson ON tasks(lesson_id);
CREATE INDEX idx_tasks_lesson_variant ON tasks(lesson_id, variant_number); -- для случайного выбора заданий
CREATE INDEX idx_lessons_module ON lessons(module_id);
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_users_xp ON users(total_xp DESC);
CREATE INDEX idx_users_role ON users(role);

-- Для leaderboard
CREATE INDEX idx_user_progress_status ON user_progress(status) WHERE status = 'completed';

-- Для rate limiting
CREATE INDEX idx_ai_generation_logs_user_date ON ai_generation_logs(user_id, created_date);
```

## Row Level Security (RLS) Policies

### Примеры политик безопасности:

```sql
-- Студенты могут видеть только опубликованные модули
CREATE POLICY "Students can view published modules"
ON modules FOR SELECT
TO authenticated
USING (is_published = true OR auth.uid() IN (
  SELECT id FROM users WHERE role IN ('teacher', 'admin')
));

-- Студенты могут видеть свой прогресс
CREATE POLICY "Users can view own progress"
ON user_progress FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Только админы могут редактировать модули
CREATE POLICY "Admins can edit modules"
ON modules FOR ALL
TO authenticated
USING (auth.uid() IN (
  SELECT id FROM users WHERE role = 'admin'
));

-- Пользователи могут видеть только свои логи генераций
CREATE POLICY "Users can view own generation logs"
ON ai_generation_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Пользователи могут создавать свои логи генераций
CREATE POLICY "Users can insert own generation logs"
ON ai_generation_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

## Предлагаемые уровни пользователя

```typescript
const LEVEL_XP_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  1000,   // Level 5
  2000,   // Level 6
  3500,   // Level 7
  5500,   // Level 8
  8000,   // Level 9
  12000   // Level 10
];
```

## Миграции (пример Supabase migration)

```sql
-- migration: create_modules_table
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  topic TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
  order_index INTEGER NOT NULL,
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Добавить триггер для updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_modules_updated_at
BEFORE UPDATE ON modules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### Миграция: Добавление вариантов заданий и rate limiting

```sql
-- migration: add_task_variants_and_rate_limiting
-- Добавляем поле variant_number в tasks
ALTER TABLE tasks 
ADD COLUMN variant_number INTEGER 
CHECK (variant_number IS NULL OR (variant_number >= 1 AND variant_number <= 5));

-- Индекс для поиска заданий одного урока и варианта
CREATE INDEX idx_tasks_lesson_variant 
ON tasks(lesson_id, variant_number);

-- Таблица для отслеживания AI-генераций (rate limiting)
CREATE TABLE ai_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  generation_type TEXT NOT NULL CHECK (generation_type IN ('module', 'task')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Индексы для rate limiting
CREATE INDEX idx_ai_generation_logs_user_date 
ON ai_generation_logs(user_id, created_date);

-- Уникальность по user_id, generation_type и дате
CREATE UNIQUE INDEX idx_ai_generation_logs_unique_user_type_date 
ON ai_generation_logs(user_id, generation_type, created_date);

-- RLS политики для ai_generation_logs
ALTER TABLE ai_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generation logs"
ON ai_generation_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generation logs"
ON ai_generation_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```


