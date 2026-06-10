# BUG REPORT

## Functional Bugs

- **App fails on web/browser runtime**: `src/db/sqliteService.ts` throws `SQLite native layer needs Android runtime.` on web, but `src/main.tsx` always boots the SPA with no fallback. This makes local browser usage and Vite preview unusable.
- **SQLite foreign-key cascades may not work**: `src/db/schema.ts` relies on `ON DELETE CASCADE`, but `src/db/sqliteService.ts` never enables `PRAGMA foreign_keys = ON`. Deleting categories/projects can leave orphaned rows or fail inconsistently depending on SQLite defaults.
- **Recurring notification can target the wrong task**: `src/features/recurring/RecurringTasksPage.tsx` reloads the list after save and schedules notifications for `reloaded[0]`, which is just the newest matching row, not guaranteed to be the item just created/edited.
- **Recurring scheduling ignores selected frequency for notification time**: `src/features/recurring/RecurringTasksPage.tsx` always schedules the next local notification for today/tomorrow based only on clock time. Weekly, biweekly, and monthly items still get a near-term one-off notification.
- **Marking recurring task complete does not reschedule notification**: `markCompletedNow` updates `nextDueAt` in the database but never schedules a fresh local notification, so reminders drift out of sync after completion.
- **Deleting recurring tasks does not cancel existing notifications**: `src/notifications.ts` only schedules notifications. `src/features/recurring/RecurringTasksPage.tsx` removes rows but leaves previously scheduled OS notifications behind.
- **Editing recurring tasks can duplicate notifications**: re-saving a recurring item schedules another notification with no cancellation/update path, likely causing duplicate reminders for the same logical task.
- **Category deletion does not refresh dependent lists consistently**: several pages reload only categories after deleting a category, not the dependent entities list. Example: `TasksPage`, `ProjectsPage`, and `RecurringTasksPage` call `categoriesQuery.reload()` only, so removed-category items can remain visible until another refresh.
- **Forms can stay bound to deleted categories**: after category deletion, form state such as `categoryId` may still reference a removed row, causing save failures or invalid foreign-key writes later.
- **Daily log rendering is vulnerable to unsafe HTML injection**: `src/features/daily-logs/DailyLogsPage.tsx` renders stored content with `dangerouslySetInnerHTML` and no sanitization step.
- **Subject tree is not actually rendered as a tree**: `src/features/projects/ProjectsPage.tsx` stores parent-child relations but displays all subjects as a flat list ordered by id, so nested structure is functionally lost in the UI.
- **Project subject management supports create/delete/toggle only**: `PROJECT_CONTEXT.md` and `TASK.md` require CRUD for subjects, but there is no subject edit flow in `src/features/projects/ProjectsPage.tsx`.
- **Goal/project/task cards show category IDs instead of category names**: pages display `#categoryId` badges instead of joined category titles, which breaks meaningful categorization for end users.
- **Browser routing is risky for Capacitor/WebView compatibility**: `src/main.tsx` uses `BrowserRouter`; hash-based routing is usually safer in embedded/mobile contexts and static previews.
- **GitHub Actions workflow destroys tracked Android project**: `.github/workflows/main.yml` deletes `android/` and recreates it every run. That can discard committed native config/plugin setup and produce artifacts that differ from the repository’s real Android app.

## UX Issues

- **No visible loading states**: `useAsyncData` exposes `loading`, but pages mostly ignore it. Users see empty sections instead of explicit loading feedback.
- **Most save failures are silent**: several pages return early on invalid input with no message, especially `TasksPage`, `ProjectsPage`, `RecurringTasksPage`, and `DailyLogsPage`.
- **No success/error toasts or confirmations**: destructive actions like delete happen instantly with no confirmation and no feedback.
- **FAB has no useful action**: `src/components/Fab.tsx` navigates to the current route again. It looks like a primary “add” action but does not open a form, scroll, or create anything.
- **Bottom navigation icons are placeholder glyphs**: `src/components/BottomNav.tsx` uses simple geometric characters instead of recognizable mobile icons, weakening scanability and polish.
- **Recurring frequency is shown in English values**: the list badge shows `daily | weekly | biweekly | monthly` instead of Persian labels.
- **Category management is mixed into every page**: category CRUD blocks occupy large space above primary content, slowing common daily interactions.
- **No empty-state guidance for first use**: empty states describe absence but do not guide the next action clearly.
- **No way to close subject-management context**: once a project is selected for subject management, there is no explicit deselect/close interaction.
- **Completed tasks list lacks useful metadata**: no completion date, category, or priority remains visible in the archive.
- **Daily log HTML preview can become visually heavy**: Quill content is rendered raw inside cards without truncation/collapse, making the archive hard to scan.
- **No accessibility hints for form validation**: required fields are not marked, and errors are not associated with specific inputs.

## Architecture Issues

- **Repository layer uses dynamic table-name interpolation**: `src/db/repositories/commonRepository.ts` builds SQL with raw table names. Even if current callers are internal, this weakens safety and maintainability.
- **No domain/service layer for recurring logic**: reminder scheduling, save behavior, and due-date calculation live inside the page component, tightly coupling UI, persistence, and OS integration.
- **No migration tracking/version persistence**: `src/db/sqliteService.ts` reruns all migration statements on first open and has no schema version table or upgrade strategy beyond `IF NOT EXISTS`.
- **Documentation is stale/inconsistent**: `src/db/README.md` still says the DB layer is “Planned” although repositories are implemented.
- **Localization strategy is incomplete**: `src/localization/fa.ts` exists but most UI strings are hardcoded directly in components instead of using one localization source.
- **Styling is split between global CSS and large inline style objects**: components like `BottomNav` and `Fab` hardcode major layout styles inline, making them harder to theme and reuse.
- **No shared error-handling strategy**: repository and notification failures bubble directly into UI with almost no structured recovery path.
- **App shell assumes one global layout for all screens**: there is no separation for modal/create flows, detail views, or future onboarding/settings screens.
- **Native build pipeline is not aligned with tracked source**: committed `android/` sources coexist with a CI flow that deletes and regenerates them, creating architectural drift.

## Missing Features Compared To `PROJECT_CONTEXT.md`

- **No APK output artifact in repo workflow for release use**: the workflow builds only a debug APK, while `PROJECT_CONTEXT.md` says APK output is required in general.
- **Fast daily access is only partially implemented**: there is no dashboard, quick-add flow, home screen, or shortcuts despite the “daily use / fast access” emphasis.
- **Category experiences are incomplete**: users can create and delete categories, but cannot rename/edit categories in any module.
- **Projects module lacks full subject CRUD**: no subject edit capability.
- **Recurring scheduling is incomplete**: metadata exists, but true recurring reminder lifecycle management is missing.
- **Daily logs rich-text policy is only partially enforced**: Quill is present, but there is no sanitization or controlled render pipeline for safe persisted rich text.
- **No Persian font provisioning/configuration**: `TASK.md` Phase 1 explicitly mentions Persian fonts, but the app only references `Vazirmatn` in CSS without bundling or loading it.
- **No dedicated Android runtime QA hooks**: no in-app permission education, notification troubleshooting, or SQLite readiness checks for the single-user mobile workflow.

## UI Issues

- **Telegram-like design goal is only loosely met**: the visual system is rounded and blue, but the navigation/iconography and FAB behavior do not resemble a polished modern Telegram-style Android experience.
- **Long pages stack too many cards vertically**: every module begins with category management, then forms, then lists, producing dense screens with weak hierarchy.
- **No sticky page actions**: save/create controls scroll away on longer forms, especially daily logs with the editor.
- **Badge styling is semantically overloaded**: the same badge style is used for category IDs, dates, scores, and frequency labels.
- **Project depth information is textual only**: nested subjects have no indentation, connectors, or hierarchy visuals.
- **Input styling is generic**: focus states, invalid states, disabled states, and checkbox styling are minimal, reducing perceived quality.
- **Quill editor styling is incomplete for RTL Persian content**: only container/toolbar radius is customized; typography, spacing, and content preview styling are not adapted deeply.
- **Bottom navigation may crowd on smaller devices**: five equal columns with text labels and icons inside a fixed-height bar risks cramped labels in Persian.
- **FAB can overlap content awkwardly**: fixed positioning plus long scrolling cards can obscure buttons or list items near the bottom.
