# ResumeBuilderFrontend

Angular frontend for the ResumeAI platform.

This is now a working application, not a scaffold. It integrates with the gateway and backend services for:

- authentication
- project management
- ATS parsing and scoring
- resume builder generation and PDF export
- account settings and default resume selection
- notifications and feedback

## Current Runtime Model

- Angular app runs on `http://localhost:4200`
- `/api` is proxied to the gateway through `proxy.conf.json`
- the gateway forwards requests to Auth, Parser, and ATS services
- access tokens are stored in `localStorage` and attached by an HTTP interceptor

## Main Workflows

### Authentication

- Login supports email or phone number.
- Register supports USER and ADMIN accounts.
- Forgot-password and delete-account flows use OTP challenges.

### Projects

- Projects are listed from the backend and mirrored in a local signal store.
- New projects can be created as ATS, Resume, or Template projects.
- The UI navigates by project type.

### ATS Wizard

- Supports file upload or pasted text for resume and job description.
- Can restore a project by `projectId` from query params.
- Persists wizard state to backend and local storage.
- Can use a default resume when one is configured in Account Settings.
- Sends parsed resume and JD data to the backend as artifacts.
- Calls ATS scoring after the resume and JD are ready.

### Resume Builder Wizard

- Multi-step builder for personal info, target job, education, experience, projects, template selection, and final editor.
- Can restore a saved project by `projectId`.
- Supports default resume reuse when configured.
- Generates preview JSON, PDF preview, and final PDF export.
- Stores and restores wizard state, template selection, and generated artifacts.

### Account Settings

- Shows project history.
- Supports restore and permanent delete.
- Shows resume library and lets the user choose a default resume.
- Includes forgot-password and delete-account flows.

### Notifications and Feedback

- Notifications support inbox, sent, read, soft delete, and admin hard delete.
- Feedback supports user submissions and admin review.

## Architecture

### Frontend layers

- Pages: route-level screens.
- Components: sidebar, cards, project modal, theme card.
- Services: API access and auth/session helpers.
- Store: local project signal store.

### State strategy

- `AuthService` manages tokens in browser storage.
- `ProjectsStore` keeps local project cards responsive even when backend sync fails.
- Wizard pages persist browser snapshots and also sync to backend state endpoints.

### Routing

- `/` -> auth shell
- `/dashboard/projects`
- `/dashboard/ats`
- `/dashboard/resume`
- `/dashboard/notifications`
- `/dashboard/rate-us`
- `/dashboard/templates`
- `/dashboard/admin`
- `/dashboard/account-settings`
- `/dashboard/subscription`
- `/dashboard/theme`

## Key Files

- `src/app/app.routes.ts`: route map and guards
- `src/app/app.config.ts`: HTTP client and interceptor setup
- `src/app/auth/services/auth.service.ts`: tokens and auth API calls
- `src/app/auth/interceptors/auth-token.interceptor.ts`: bearer token attachment
- `src/app/dashboard/services/projects-api.service.ts`: project and artifact API calls
- `src/app/dashboard/services/resume-parser-api.service.ts`: resume parser API
- `src/app/dashboard/services/job-description-parser-api.service.ts`: JD parser API
- `src/app/dashboard/services/ats-score-api.service.ts`: ATS scoring API
- `src/app/dashboard/services/resume-builder-api.service.ts`: resume builder API
- `src/app/dashboard/pages/ats/ats.page.ts`: ATS wizard orchestration
- `src/app/dashboard/pages/resume-builder/resume-builder.page.ts`: resume builder orchestration
- `src/app/dashboard/pages/account-settings/account-settings.page.ts`: history, default resume, OTP flows

## Build and Run

```bash
npm install
npm start
```

Tests:

```bash
npm test
```

Production build:

```bash
npm run build
```

## Notes on Default Resume Reuse

The default resume path is now part of the application behavior.

- ATS can resolve a default resume and skip the upload step.
- Resume Builder can resolve a default resume and fast-forward into the template/editor flow.
- If the backend returns an empty canonical resume payload, the UI will still look empty, so the resolver must return real personal info or actual section data.

## Current Limitations

- PDF rendering still depends on valid resume data being present in the resolved default payload.
- The UI uses browser storage as a convenience layer, not the source of truth.
- Some pages remain largely presentational, but the core ATS and Resume Builder flows are now wired.
