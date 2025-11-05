## Tailwind CSS v4 + shadcn/ui: руководство по стилю

### 1. Базовая настройка

- Используем Tailwind CSS v4 (пакет `@tailwindcss/postcss@4.x` + `tailwindcss@4.x`).
- Конфигурация хранится в `tailwind.config.ts`. Обязательно указываем `darkMode: ["class"]` — переключение темы идёт через класс `dark` на `<html>`.
- Глобальные CSS‑переменные темы задаём в `app/globals.css`. shadcn/ui теперь работает на `@theme inline`, поэтому:
  - Все значения цветов и других токенов объявляем вне `@layer`, прямо в `:root` и `.dark`.
  - Цвета задаются только в формате `oklch(...)`. Tailwind v4 автоматически конвертирует их в `lab(...)` в runtime.
  - `@theme inline { --color-* }` должен ссылаться на переменные `var(--...)` без дополнительных `hsl()` или `oklch()` обёрток.

### 2. Работа с shadcn/ui

- Компоненты из shadcn/ui копируем в каталог `components/ui/*` через CLI (`pnpm dlx shadcn@latest add ...`).
- После добавления компоненты можно модифицировать, но следим за токенами цвета: используем только Tailwind классы (`bg-primary`, `text-muted-foreground`, `border-input` и т.д.). Ручных hex или rgb не добавляем.
- При обновлении зависимостей используем официальные команды: `pnpm up "@radix-ui/*" cmdk lucide-react tailwind-merge clsx --latest`.

### 3. Стили страниц и тёмный режим

- Вёрстку страниц строим на Tailwind классах. Не используем собственные глобальные классы, если аналог уже есть в Tailwind или shadcn.
- Фон страницы:
  - Светлая тема — контейнер верхнего уровня оставляем без явного цвета (или `bg-background`), фон берётся из `:root --background`.
  - Тёмная тема — обязательно наследуем `bg-background`. Никаких `bg-muted` на уровне body/основного контейнера, чтобы фон был почти чёрным (`oklch(0.141 0.005 285.823)` → `#09090b`).
- Карточки, модальные окна, панели — используем `bg-card` (в тёмной теме это `oklch(0.21 0.006 285.885)` → `#18181b`).
- Границы / разделители — `border-border` (`--border` → 10% прозрачное белое в тёмной теме).
- Текстовые оттенки: `text-foreground` для основного текста, `text-muted-foreground` для вторичного.
- Акцентные кнопки: `bg-primary`, `text-primary-foreground`. Проверяем контраст в обеих темах.
- Для фоновых оттенков в интерфейсах (таблицы, панели, skeleton) используем `bg-muted` и `bg-accent`. Они уже адаптированы под тёмную/светлую палитру.

### 4. Переключение темы

- Компонент `ThemeProvider` прописывает класс `dark` на `<html>`. Используем только его (из `components/theme-provider.tsx`).
- Компонент `ThemeToggle` переключает `light` / `dark` / `system`. Не дублируем логику.
- Любая кастомная логика должна опираться на `data-theme` или класс `dark`, но предпочтительно использовать готовые токены.

### 5. Проверка и тестирование

- После изменения палитры всегда перезапускаем dev‑сервер (`pnpm dev`) — Tailwind v4 кеширует CSS в `.next`.
- Проверяем страницу и в светлом, и в тёмном режимах (Ctrl+Shift+R чтобы сбросить кеш браузера).
- Цвета можно проверить в DevTools: `getComputedStyle(document.documentElement).getPropertyValue('--background')` и аналогично для других токенов.
- Дополнительно сверяемся с эталоном shadcn Themes Gallery (https://ui.shadcn.com/themes#themes) для соответствия гаммы (например, тема Rose).

### 6. Запрещённые практики

- Нельзя использовать устаревший формат `hsl(var(--...))` в Tailwind v4.
- Не добавляем прямые hex/rgb значения в Tailwind классы (`bg-[#111]` и т.п.) — используем токены.
- Не модифицируем `tailwind.config.ts` через `theme.extend.colors` для shadcn-токенов — всё хранится в `@theme inline`.
- Не задаём фон страницы вручную (через инлайн стили/другие классы), чтобы не ломать тёмную тему.

### 7. Дополнительные ссылки

- Tailwind CSS v4 upgrade guide: https://tailwindcss.com/docs/upgrade-guide
- shadcn/ui Tailwind v4 docs: https://ui.shadcn.com/docs/tailwind-v4
- shadcn Themes (эталон палитр): https://ui.shadcn.com/themes


