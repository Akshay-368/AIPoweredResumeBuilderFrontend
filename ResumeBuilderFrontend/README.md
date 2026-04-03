# ResumeBuilderFrontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.5.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

# AI-Powered Resume Builder Frontend

Production-oriented Angular frontend scaffold for an AI-powered Resume Builder platform.

Current implementation status corresponds to:

- `UC-1: Dashboard Workspace Setup and Feature Entry Flow`

This README documents what has been built so far: architecture, folder structure, pages, routing, important components/services, key TypeScript/HTML/CSS concepts, and the UI/UX principles currently followed.

## 1) Project Purpose

The application provides:

- A modern authentication entry experience (login + registration).
- A post-auth dashboard shell similar to SaaS consoles.
- Feature-first navigation to resume workflows.
- Local project creation and listing flow (mock persistence via `localStorage`).

No backend integration is enabled yet.

## 2) Tech Stack

- Angular `21.x`
- Standalone components only (no NgModules)
- Angular Router with nested child routes
- Angular Forms (template-driven forms for auth and modal input)
- Angular Signals (`signal`, `computed`) for local reactive state in store
- SSR-ready setup (`@angular/ssr` present)

## 3) Architecture and Design Approach

## 3.1 Architectural Style

The codebase currently follows a lightweight layered frontend architecture:

- `Pages`: route-level feature screens.
- `Reusable Components`: presentational and interaction-focused pieces.
- `Store/Service`: local state and persistence abstraction.
- `Models`: shared TypeScript domain contracts.

This keeps UI composition and business data logic separated while remaining easy to scale into domain modules later.

## 3.2 Standalone Component Architecture

Every component is standalone (`standalone: true`) and imports only what it needs. This provides:

- Lower coupling
- Better tree-shaking
- Easier lazy-loading migration later

## 3.3 Routing-Driven Composition

Route navigation is the only page-switching mechanism for dashboard pages.

- Dashboard contains a `router-outlet` workspace.
- Sidebar links route to child pages.
- Default child route redirects to Projects.

## 3.4 State Strategy (Current)

Temporary local state strategy is used until backend integration:

- `ProjectsStore` keeps project entities in a signal.
- Projects are persisted to `localStorage`.
- Store is SSR-safe through `isPlatformBrowser` checks.

## 4) Implemented Features So Far

## 4.1 Authentication Shell

- Login and Register tabs inside a premium visual auth shell.
- Login supports email/phone mode validation.
- Register includes password rule validation and password match feedback.
- On successful login, navigation goes to `/dashboard`.

## 4.2 Dashboard Workspace

- Collapsible sidebar (hamburger toggle).
- Primary navigation:
	- Projects
	- ATS Score
	- Resume Builder
	- Templates
- Secondary navigation:
	- Cover letter
	- Account Settings
	- Subscription
	- Theme
	- Log out (route to `/`)
- Additional bottom logout action button also present.

## 4.3 Projects Flow

- Projects page is default dashboard page.
- Create feature projects via modal (ATS/Resume/Template).
- Persist project in `localStorage`.
- Navigate user to corresponding feature page after creation.
- Existing project cards are clickable and route by project type.

## 4.4 Feature Placeholder Pages

The following pages are present with headers + AI interaction placeholders:

- ATS
- Resume Builder
- Templates
- Cover Letter
- Account Settings
- Subscription
- Theme

## 5) Project Structure (Current)

```text
ResumeBuilderFrontend/
	angular.json
	package.json
	README.md
	tsconfig.json
	tsconfig.app.json
	tsconfig.spec.json
	public/
	src/
		index.html
		main.ts
		main.server.ts
		server.ts
		styles.css
		app/
			app.ts
			app.html
			app.css
			app.config.ts
			app.config.server.ts
			app.routes.ts
			app.routes.server.ts
			auth/
				auth.ts
				auth.html
				auth.css
				login/
					login.ts
					login.html
					login.css
				register/
					register.ts
					register.html
					register.css
			dashboard/
				dashboard.ts
				dashboard.html
				dashboard.css
				models/
					project.model.ts
				services/
					projects.store.ts
				components/
					sidebar/
						sidebar.component.ts
						sidebar.component.html
						sidebar.component.css
					project-card/
						project-card.component.ts
						project-card.component.html
						project-card.component.css
					project-modal/
						project-modal.component.ts
						project-modal.component.html
						project-modal.component.css
				pages/
					projects/
						projects.page.ts
						projects.page.html
						projects.page.css
					ats/
						ats.page.ts
						ats.page.html
						ats.page.css
					resume-builder/
						resume-builder.page.ts
						resume-builder.page.html
						resume-builder.page.css
					templates/
						templates.page.ts
						templates.page.html
						templates.page.css
					cover-letter/
						cover-letter.page.ts
						cover-letter.page.html
						cover-letter.page.css
					account-settings/
						account-settings.page.ts
						account-settings.page.html
						account-settings.page.css
					subscription/
						subscription.page.ts
						subscription.page.html
						subscription.page.css
					theme/
						theme.page.ts
						theme.page.html
						theme.page.css
```

## 6) Routing Map

Defined in `src/app/app.routes.ts`.

Top-level routes:

- `/` -> `Auth`
- `/dashboard` -> `Dashboard` (layout route with child routes)

Dashboard child routes:

- `/dashboard` -> redirect to `/dashboard/projects`
- `/dashboard/projects` -> Projects page
- `/dashboard/ats` -> ATS page
- `/dashboard/resume` -> Resume Builder page
- `/dashboard/templates` -> Templates page
- `/dashboard/cover-letter` -> Cover Letter page
- `/dashboard/account-settings` -> Account Settings page
- `/dashboard/subscription` -> Subscription page
- `/dashboard/theme` -> Theme page

## 7) Important Files and Responsibilities

## 7.1 App Shell and Routing

- `src/app/app.ts`: root standalone app component.
- `src/app/app.html`: root `router-outlet`.
- `src/app/app.routes.ts`: full route registry.

## 7.2 Auth Domain

- `src/app/auth/auth.ts`: tab switching between login/register.
- `src/app/auth/login/login.ts`: login mode selection and validation.
- `src/app/auth/register/register.ts`: registration validation workflow.

## 7.3 Dashboard Domain

- `src/app/dashboard/dashboard.ts`: layout state, nav config, logout action.
- `src/app/dashboard/components/sidebar/*`: collapsible navigation UI.
- `src/app/dashboard/pages/projects/*`: project creation/listing and feature redirection.
- `src/app/dashboard/components/project-modal/*`: project naming modal flow.
- `src/app/dashboard/components/project-card/*`: reusable project card.
- `src/app/dashboard/services/projects.store.ts`: local project persistence.
- `src/app/dashboard/models/project.model.ts`: project/nav contracts.

## 8) Key TypeScript Functions and Concepts Used

## 8.1 Functions (Examples)

- `switchTab(tab)` in auth:
	- Controls whether login or register panel is rendered.
- `isValidLogin()` in login:
	- Validates either email/password or phone/password mode.
- `validatePassword()` and `checkPasswordMatch()` in register:
	- Enforces password quality and confirmation consistency.
- `toggleSidebar()` in dashboard:
	- Toggles collapsed state for the left navigation.
- `openCreateProjectModal()`, `onCreateProject()`, `navigateToType()` in Projects page:
	- Handles create flow + route decision.
- `createProject()`, `load()`, `persist()` in `ProjectsStore`:
	- CRUD-lite local persistence abstraction.

## 8.2 TypeScript/Angular Concepts Applied

- Strong typing via string unions and interfaces.
- Event-based parent-child communication (`@Output`, `EventEmitter`).
- Controlled inputs with `@Input`.
- Dependency injection (`inject`, constructor DI).
- Reactive state with signals (`signal`, `computed`).
- SSR-safe browser API access using `isPlatformBrowser`.

## 9) HTML Concepts Used

- Semantic sectioning: `header`, `section`, `article`, `nav`, `main`.
- Accessibility-minded attributes:
	- `aria-label` on nav/buttons.
	- keyboard handler support in project cards (`keydown.enter`).
- Structural directives:
	- `*ngIf` for conditional render blocks.
	- `*ngFor` with `trackBy` optimization for list rendering.
- Component composition through selector-based nesting.

## 10) CSS Concepts and Styling Language

## 10.1 Styling Direction

The project currently uses a premium soft-glass visual identity:

- Serif typography (Georgia/Times family)
- Teal-green accent palette
- Layered radial + linear gradients
- Semi-transparent cards and subtle backdrop blur

## 10.2 CSS Techniques Used

- CSS variables for theme tokens in auth.
- Responsive grid layouts for major page skeletons.
- `clamp()` for fluid spacing and typography.
- Hover/focus transitions for interactive affordance.
- Visual depth using shadows + translucent surfaces.
- Mobile behavior with media queries for shell restructuring.

## 11) UI/UX Principles Followed So Far

- Clear hierarchy:
	- Auth entry -> Dashboard shell -> Feature workspace.
- Familiar SaaS pattern:
	- Persistent left navigation and dynamic right workspace.
- Progressive disclosure:
	- Sidebar collapse to preserve screen real estate.
- Low friction project creation:
	- Quick modal capture then immediate routing.
- Visual consistency:
	- Shared color story and component shape language.
- Feedback and clarity:
	- Empty states and placeholder guidance for future AI modules.

## 12) Current Limitations

- No backend/API integration yet.
- No auth guards/session/token lifecycle.
- Feature pages are placeholders (AI logic pending).
- No advanced form error model or centralized validation service yet.
- No comprehensive unit/integration/e2e test coverage yet.

## 13) Run and Build

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

## 14) Deployment Readiness (Current Snapshot)

What is ready:

- Stable standalone Angular app scaffold.
- Defined route architecture and navigation model.
- Clean feature folder organization for team collaboration.
- SSR build support configured in dependencies/scripts.

What should be completed before production launch:

- API integration for auth/projects/features.
- Route guards and permission model.
- Security hardening (token storage strategy, request interception).
- Error handling, loading states, and retry UX.
- Test strategy (unit + integration + e2e).
- CI/CD setup and environment-based configuration.

## 15) Suggested Next UC Split

- `UC-2`: Auth session + protected routes.
- `UC-3`: ATS analyzer real API flow.
- `UC-4`: Resume editor data model + save flow.
- `UC-5`: Account/subscription settings integration.

---


## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
