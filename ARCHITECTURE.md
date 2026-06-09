# Architecture

## Stack

- TypeScript
- React + Vite
- Capacitor (Android)
- SQLite via `@capacitor-community/sqlite`
- Lightweight rich text editor: `react-quill` (Quill)

---

## Architectural Style

Clean architecture with modular boundaries and reusable components.

Layers:

1. `features/*` → module-level screens and workflows (Goals, Projects, Tasks, Recurring, Daily Logs)
2. `components/*` → shared UI components (Card, BottomNav, FAB, form fields, search, empty state)
3. `design/*` → theme tokens and global RTL design system
4. `db/*` → SQLite service, migrations, repository layer
5. `localization/*` → Persian resources
6. `utils.ts` / `hooks.ts` / `notifications.ts` → shared business helpers and app services

---

## UI & UX Principles

- Persian-first, RTL-first layout
- Modern Telegram-like Android visual style
- Floating circular action button
- Rounded bottom navigation with soft shadows
- Rounded cards and minimal visual density
- White + Facebook-blue palette
- Fast daily interaction focus

All user-facing text is Persian.
All source code naming is English.

---

## Storage Strategy

Local-first mobile persistence.

- Engine: SQLite (`@capacitor-community/sqlite`)
- Access pattern: repository layer (`src/db/repositories/*`)
- Schema bootstrapping: migration statements in `src/db/schema.ts`
- Connection orchestration: `src/db/sqliteService.ts`
- No backend
- No authentication

---

## Domain Constraints

### Dynamic Categories

No hardcoded business categories. Categories are user-defined per module:

- `goal_categories`
- `project_categories`
- `task_categories`
- `recurring_task_categories`

### Subject Depth

Project subjects enforce maximum nesting depth = `3`.
Validation is performed in feature logic before insert.

### Task Priority Formula

`priorityScore = importance + urgency + benefit`

Each component is clamped to range `1..5`.

---

## Entities

### GoalCategory

- id
- title

### Goal

- id
- categoryId
- title
- description
- createdAt

### ProjectCategory

- id
- title

### Project

- id
- categoryId
- title
- description

### Subject

- id
- projectId
- parentSubjectId (nullable)
- title
- description
- isDone

### TaskCategory

- id
- title

### Task

- id
- categoryId
- title
- description
- importance
- urgency
- benefit
- priorityScore
- isDone
- createdAt
- completedAt

### RecurringTaskCategory

- id
- title

### RecurringTask

- id
- categoryId
- title
- description
- frequencyType (`daily | weekly | biweekly | monthly`)
- timeOfDay
- lastCompletedAt
- nextDueAt
- notificationsEnabled

### DailyLog

- id
- title
- logDate
- content
- createdAt

---

## Editor Policy

- CKEditor is forbidden
- Quill is used as lightweight rich text editor
- Enabled formatting:
  - Bold
  - Italic
  - Bullet list
  - Number list
  - Paragraph

---

## Notifications

Recurring task reminders use Capacitor Local Notifications via `src/notifications.ts`.
Scheduling follows selected time-of-day and frequency metadata.
