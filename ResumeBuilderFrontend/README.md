# AI-Powered Resume Builder Frontend

Production-oriented Angular frontend scaffold for an AI-powered Resume Builder platform.

Implementation snapshot date: April 4, 2026.

## 1) Current Status (What Is Done So Far)

This project has completed the first functional frontend baseline:

- Authentication shell with Login and Register tabs.
- Dashboard shell with collapsible sidebar and nested feature routing.
- Project creation/listing flow with browser persistence (`localStorage`).
- Theme switching system (Light, Night, Aurora) with persisted preference.
- Placeholder workspace pages for ATS, Resume Builder, Templates, Cover Letter, Account Settings, Subscription, and Theme.

Primary implemented scope:

- `UC-1: Dashboard Workspace Setup and Feature Entry Flow`

## 2) Purpose

The app currently delivers:

- A modern auth entry experience.
- A SaaS-style post-login dashboard workspace.
- Feature-oriented navigation for resume-related modules.
- Project setup flow to enter ATS, Resume, or Template workflows quickly.
- Global theme personalization persisted across refresh.

## 3) Tech Stack

- Angular `21.x`
- Standalone components (no NgModules)
- Angular Router (nested child routes)
- Angular Forms (`FormsModule`, template-driven forms)
- Angular Signals (`signal`, `computed`) for lightweight store state
- SSR-ready setup (`@angular/ssr` + Express server entry)
- TypeScript `5.9.x`

## 4) Architecture

### 4.1 Layered Frontend Structure

- Pages: route-level screens.
- Reusable Components: focused UI elements (sidebar, cards, modal).
- Services/Stores: app state and browser persistence.
- Models: strongly typed domain contracts.

### 4.2 Composition Strategy

- Standalone components import only required dependencies.
- Route-driven page rendering via `router-outlet`.
- Dashboard acts as the shell; feature pages render as children.

### 4.3 State Strategy

- Projects are managed in `ProjectsStore` using Angular signals.
- Data persistence is via `localStorage` under `resume-builder.projects`.
- Browser-only operations are SSR-safe through `isPlatformBrowser` checks.

### 4.4 Theme Strategy

- `Theme` service applies class names to both `html` and `body`.
- Selected theme is stored under `app-theme` in `localStorage`.
- App root loads persisted theme on startup.
- Global theme variables and effects are defined in `src/styles.css`.

## 5) Implemented Features

### 5.1 Authentication

- Tabbed auth shell (`Login` / `Register`).
- Login supports two modes:
  - email + password
  - phone + password (10-digit validation)
- Register includes:
  - password rule checks (upper/lower/number/special/min length)
  - delayed confirm-password status feedback
  - role selection (`user` / `admin`)
- Successful login navigates to `/dashboard`.

### 5.2 Dashboard Shell and Navigation

- Collapsible sidebar with navigation sections.
- Main navigation:
  - Projects
  - ATS Score
  - Resume Builder
  - Cover letter
  - Templates
- Secondary navigation:
  - Account Settings
  - Subscription
  - Theme
  - Log out

Correction applied:

- There is no active separate bottom logout button in the sidebar template; logout is available through the secondary navigation item.

### 5.3 Projects Workspace

- Projects page is the default dashboard child route.
- Create project cards open a modal for project naming.
- Supported project types:
  - ATS
  - Resume
  - Template
- New projects are persisted locally and shown as project cards.
- Cards support open and delete actions.
- Clicking/opening routes to feature pages by project type.

### 5.4 Theme Workspace

- Theme page renders theme cards for:
  - Light
  - Night
  - Aurora
- Card click applies selected theme globally.
- Theme persists across app reload.

Correction applied:

- Theme support is already implemented (service + page + global CSS), so it is not only a future plan.

### 5.5 Feature Placeholder Pages (Scaffolded)

The following pages exist and are routed:

- ATS
- Resume Builder
- Templates
- Cover Letter
- Account Settings
- Subscription
- Theme

These pages currently focus on layout and UX scaffolding. Full business logic and API integration are pending.

## 6) Routing Map

Defined in `src/app/app.routes.ts`.

Top-level routes:

- `/` -> Auth
- `/dashboard` -> Dashboard shell

Dashboard child routes:

- `/dashboard` -> redirects to `/dashboard/projects`
- `/dashboard/projects` -> Projects page
- `/dashboard/ats` -> ATS page
- `/dashboard/resume` -> Resume Builder page
- `/dashboard/templates` -> Templates page
- `/dashboard/cover-letter` -> Cover Letter page
- `/dashboard/account-settings` -> Account Settings page
- `/dashboard/subscription` -> Subscription page
- `/dashboard/theme` -> Theme page

## 7) Key Files and Responsibilities

### 7.1 App and Routing

- `src/app/app.ts`: root app component; loads persisted theme.
- `src/app/app.html`: root `router-outlet` host.
- `src/app/app.routes.ts`: route registry.

### 7.2 Auth

- `src/app/auth/auth.ts`: auth tab switching.
- `src/app/auth/login/login.ts`: login validation and dashboard navigation.
- `src/app/auth/register/register.ts`: password rules + register form flow.

### 7.3 Dashboard and Projects

- `src/app/dashboard/dashboard.ts`: shell state, nav definitions, logout behavior.
- `src/app/dashboard/components/sidebar/*`: sidebar rendering/collapse behavior.
- `src/app/dashboard/pages/projects/projects.page.ts`: create/open/delete orchestration.
- `src/app/dashboard/components/project-modal/*`: project naming modal.
- `src/app/dashboard/components/project-card/*`: reusable project card.
- `src/app/dashboard/services/projects.store.ts`: signal store + local persistence.
- `src/app/dashboard/models/project.model.ts`: domain and navigation interfaces.

### 7.4 Theme

- `src/app/dashboard/services/theme.ts`: global theme manager.
- `src/app/dashboard/pages/theme/theme.page.ts`: theme settings page.
- `src/app/dashboard/components/theme-card/*`: theme selector cards.
- `src/styles.css`: global theme tokens and visual effects.

## 8) Engineering Concepts Applied

- Strong typing with interfaces and union types.
- Parent-child communication through `@Input()` and `@Output()`.
- Event handling for keyboard and mouse interactions.
- Dependency injection via constructor and `inject()` API.
- Angular signals for reactive local state.
- SSR safety for browser-only APIs.
- Structural directives (`*ngIf`, `*ngFor` with `trackBy`).

## 9) Styling and UX Direction

Current visual language:

- Premium soft-glass aesthetic.
- Teal-led palette in default/light.
- Distinct atmospheric variants for night and aurora.
- Gradient layers, depth, and animated ambient effects in themed modes.

UX principles currently applied:

- Clear hierarchy: auth -> dashboard shell -> feature workspace.
- Persistent nav + workspace pattern familiar to SaaS users.
- Progressive disclosure via sidebar collapse.
- Quick-start project flow with minimal friction.
- Theme personalization with persistent preference.

## 10) Testing and Quality Snapshot

- Unit spec files are scaffolded across features/components.
- The codebase has a test command (`npm test`) available.
- Comprehensive test coverage is still pending for production readiness.

## 11) Current Limitations

- No backend/API integration yet.
- No route guards or token/session lifecycle.
- Feature pages are mostly scaffolds/placeholders.
- No centralized API error/loading state architecture yet.
- No complete unit/integration/e2e coverage yet.

## 12) Run and Build

Install dependencies:

```bash
npm install
```

Run dev server:

```bash
npm start
```

Build production artifacts:

```bash
npm run build
```

Run tests:

```bash
npm test
```

## 13) Production Readiness Checklist (Next)

Before launch, prioritize:

- Auth API integration and secure session handling.
- Route guards and authorization checks.
- ATS/Resume/Templates real feature logic.
- Robust loading, error, and retry UX patterns.
- Strong automated testing strategy (unit + integration + e2e).
- CI/CD pipeline and environment configuration strategy.

## 14) Suggested Next Use Cases

- `UC-2`: Auth session + protected routes.
- `UC-3`: ATS analyzer API integration.
- `UC-4`: Resume editor model + save/retrieve flow.
- `UC-5`: Account and subscription backend integration.
