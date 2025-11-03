# Архитектурные рекомендации для CodeSensei

## Админский CRUD модулей — серверные эндпоинты

- Прямая вставка (insert) из браузера под RLS иногда приводит к «зависанию» запроса (pending). Чтобы устранить это и получать корректные ошибки, все операции создания/редактирования/удаления модулей выполняются на сервере:
  - `POST /api/admin/modules/create`
  - `POST /api/admin/modules/[moduleId]/update`
  - `POST /api/admin/modules/[moduleId]/delete`
- Преимущества подхода:
  - надёжная работа с httpOnly-куки и RLS;
  - детальное логирование (длина/сэмпл описания, id пользователя/модуля);
  - явные таймауты (нет «вечных pending»);
  - нормализованные ошибки для UI.

## Аутентификация и сессии

- После успешного входа выполняется `POST /api/auth/set-session` — синхронизация сессии в httpOnly-куки для SSR.
- Выход: `POST /api/auth/signout` (сервер) + клиентский `supabase.auth.signOut()`.
- Ограничение доступа по ролям реализовано на уровне UI; `requireAdmin` не делает RPC‑вызов роли, что исключает RLS‑флапы на сервере.

## AI‑генерация

- Используется модель `openai/gpt-oss-20b` через `https://router.huggingface.co/v1/chat/completions`.
- В серверном роуте генерации — устойчивый парсинг JSON и мягкий фолбэк на текст при сбое парсера.

## Выбор Next.js Router

### Рекомендация: **App Router** (Next.js 13+)

**Причины:**
- ✅ Лучшая производительность (React Server Components)
- ✅ Улучшенная SEO
- ✅ Streaming SSR
- ✅ Более современный подход

**Структура папок:**
```
app/
├── (auth)/
│   ├── login/
│   └── register/
├── (dashboard)/
│   ├── dashboard/
│   ├── modules/
│   │   └── [moduleId]/
│   │       └── lessons/
│   │           └── [lessonId]/
│   ├── leaderboard/
│   └── achievements/
├── (admin)/
│   └── admin/
│       ├── modules/
│       └── content-generator/
└── api/
    ├── ai/
    │   ├── hint/
    │   └── generate-content/
    └── execute/
```

## Редактор кода

### Рекомендация: **Monaco Editor** (VS Code в браузере)

**Альтернативы:**
- CodeMirror 6 (легче, но менее функционален)
- Ace Editor (устаревший)

**Настройки Monaco:**
```typescript
import { Editor } from '@monaco-editor/react';

<Editor
  height="400px"
  language="python"
  theme="vs-dark"
  value={code}
  onChange={setCode}
  options={{
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    automaticLayout: true,
  }}
/>
```

**Функции:**
- ✅ Подсветка синтаксиса Python
- ✅ Базовое автодополнение (можно расширить)
- ✅ Номера строк
- ✅ Темная/светлая тема

## Интеграция PyScript/Pyodide

### Оптимизированная загрузка

```typescript
// hooks/usePyodide.ts
import { useEffect, useState } from 'react';
import { loadPyodide } from 'pyodide';

export function usePyodide() {
  const [pyodide, setPyodide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initPyodide() {
      try {
        const pyodideInstance = await loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
        });

        if (!cancelled) {
          // Установка необходимых пакетов
          await pyodideInstance.loadPackage(['micropip']);
          setPyodide(pyodideInstance);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load Pyodide');
          setLoading(false);
        }
      }
    }

    initPyodide();

    return () => {
      cancelled = true;
    };
  }, []);

  return { pyodide, loading, error };
}
```

### Безопасное выполнение кода

```typescript
// utils/codeExecutor.ts
interface ExecuteResult {
  output: string;
  error: string | null;
  executionTime: number;
  success: boolean;
}

export async function executeCode(
  code: string,
  pyodide: any,
  timeout: number = 5000
): Promise<ExecuteResult> {
  const startTime = performance.now();
  
  try {
    // Создаем Web Worker для изоляции
    const result = await Promise.race([
      pyodide.runPythonAsync(code),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      ),
    ]);

    const executionTime = performance.now() - startTime;

    return {
      output: pyodide.runPython('str(sys.stdout.getvalue())') || '',
      error: null,
      executionTime,
      success: true,
    };
  } catch (error) {
    const executionTime = performance.now() - startTime;
    
    return {
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime,
      success: false,
    };
  }
}
```

### Тестирование в браузере

```typescript
// utils/testRunner.ts
interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  description: string;
}

interface TestResult {
  id: string;
  passed: boolean;
  actualOutput: string;
  error?: string;
}

export async function runTests(
  code: string,
  testCases: TestCase[],
  pyodide: any
): Promise<TestResult[]> {
  // Обертка для функции ученика
  const testWrapper = `
import unittest
from io import StringIO
import sys

${code}

class TestStudentCode(unittest.TestCase):
`;

  // Генерируем тесты динамически
  const testMethods = testCases.map((test, index) => `
    def test_${index}(self):
        result = student_function(${test.input})
        self.assertEqual(result, ${test.expectedOutput})
`).join('\n');

  const fullTestCode = testWrapper + testMethods;

  // Выполняем через unittest
  const results: TestResult[] = [];

  for (const test of testCases) {
    try {
      const testCode = `
result = student_function(${test.input})
expected = ${test.expectedOutput}
assert result == expected, f"Expected {expected}, got {result}"
`;
      
      await pyodide.runPythonAsync(testCode);
      
      results.push({
        id: test.id,
        passed: true,
        actualOutput: pyodide.runPython('str(result)'),
      });
    } catch (error) {
      results.push({
        id: test.id,
        passed: false,
        actualOutput: '',
        error: error instanceof Error ? error.message : 'Test failed',
      });
    }
  }

  return results;
}
```

## Структура API Routes (Vercel)

### AI Hint Endpoint

```typescript
// app/api/ai/hint/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

export async function POST(request: NextRequest) {
  try {
    // Проверка аутентификации
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting (можно использовать Redis или Upstash)
    // Проверка лимита пользователя...

    const { code, taskId, testResults } = await request.json();

    // Получаем информацию о задаче
    const { data: task } = await supabase
      .from('tasks')
      .select('title, description, learning_objectives')
      .eq('id', taskId)
      .single();

    // Формируем промпт
    const prompt = `
Ты — ИИ-наставник по Python для школьников...

[Используем улучшенный промпт из IMPROVED_AI_PROMPTS.md]
    `;

    // Запрос к Hugging Face
    const response = await fetch(
      'https://api-inference.huggingface.co/models/deepseek-ai/deepseek-coder-v2-lite-instruct',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error('HF API error');
    }

    const data = await response.json();
    
    // Парсим JSON ответ (если модель вернула структурированный ответ)
    const hint = parseAIResponse(data[0]?.generated_text);

    // Логируем использование подсказки
    await supabase.from('ai_hint_usage').insert({
      user_id: userId,
      task_id: taskId,
      used_at: new Date().toISOString(),
    });

    return NextResponse.json({ hint });
  } catch (error) {
    console.error('AI Hint Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate hint' },
      { status: 500 }
    );
  }
}
```

## Оптимизация производительности

### 1. Кэширование контента модулей

```typescript
// app/modules/[moduleId]/page.tsx
export const revalidate = 3600; // ISR: обновление каждые 60 минут

export default async function ModulePage({ params }: { params: { moduleId: string } }) {
  const module = await getModule(params.moduleId);
  // ...
}
```

### 2. Оптимизация запросов к Supabase

```typescript
// utils/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Batch запросы где возможно
export async function getUserProgress(userId: string, moduleIds: string[]) {
  const { data } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .in('lesson_id', moduleIds);

  return data;
}
```

### 3. Lazy loading компонентов

```typescript
// Динамический импорт тяжелых компонентов
import dynamic from 'next/dynamic';

const CodeEditor = dynamic(() => import('@/components/CodeEditor'), {
  loading: () => <div>Загрузка редактора...</div>,
  ssr: false, // Monaco Editor не работает на SSR
});

const PyodideRunner = dynamic(() => import('@/components/PyodideRunner'), {
  ssr: false,
});
```

## Мониторинг и логирование

### Интеграция с Sentry (или аналогичным)

```typescript
// lib/monitoring.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});

// Отслеживание ошибок выполнения кода
export function trackCodeExecutionError(error: Error, context: any) {
  Sentry.captureException(error, {
    tags: {
      component: 'code_execution',
    },
    extra: context,
  });
}
```

## Безопасность

### Защита от XSS

```typescript
// utils/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'code', 'pre', 'ul', 'ol', 'li', 'strong', 'em'],
    ALLOWED_ATTR: [],
  });
}
```

### Валидация входных данных

```typescript
// utils/validation.ts
import { z } from 'zod';

export const codeSubmissionSchema = z.object({
  code: z.string().min(1).max(10000), // Максимальная длина кода
  taskId: z.string().uuid(),
});

export type CodeSubmission = z.infer<typeof codeSubmissionSchema>;
```

## Тестирование

### Структура тестов

```
__tests__/
├── components/
│   ├── CodeEditor.test.tsx
│   └── ProgressBar.test.tsx
├── utils/
│   ├── codeExecutor.test.ts
│   └── testRunner.test.ts
└── api/
    └── ai/
        └── hint.test.ts
```

### Пример теста

```typescript
// __tests__/utils/codeExecutor.test.ts
import { executeCode } from '@/utils/codeExecutor';

describe('Code Executor', () => {
  it('should execute simple Python code', async () => {
    const code = 'print("Hello, World!")';
    const result = await executeCode(code, mockPyodide);
    
    expect(result.success).toBe(true);
    expect(result.output).toContain('Hello, World!');
  });

  it('should handle timeout', async () => {
    const code = 'while True: pass';
    const result = await executeCode(code, mockPyodide, 1000);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Timeout');
  });
});
```

## Деплой и CI/CD

### GitHub Actions workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## Переменные окружения

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx

HUGGINGFACE_API_KEY=xxx

NEXT_PUBLIC_SENTRY_DSN=xxx

NODE_ENV=production
```


