# AIPoweredResumeBuilderFrontend

This repository contains the full ResumeAI platform: authentication, gateway, file parsing, ATS scoring, project persistence, and the Angular frontend.

The current codebase is no longer a scaffold. It is a working multi-service system with:

- Auth and JWT issuance
- Google sign-in and registration through Google Identity Services
- Gateway routing through YARP
- Resume and job description parsing through Gemini
- ATS scoring through Gemini
- Resume Builder generation, revision, and PDF export
- Project history, soft delete, restore, and permanent delete flows
- Default resume selection and reuse flows
- Account Settings profile data, including current phone number display and phone number updates
- Notifications and feedback

## Solution Map

- [ResumeAI.Auth.API](ResumeAI.Auth.API/README.md): users, login, refresh, OTP, account deletion, admin views
- [ResumeAI.Gateway](ResumeAI.Gateway/README.md): reverse proxy and route-level auth enforcement
- [ResumeBuilderFrontend](ResumeBuilderFrontend/README.md): Angular UI for auth, dashboard, ATS, and Resume Builder

## Current Architecture

Runtime services:

- `ResumeAI.Auth.API` on `http://localhost:5196`
- `ResumeAI.FileParserToJSON` on `http://localhost:5111`
- `ResumeAI.ATSScore.API` on `http://localhost:5050`
- `ResumeAI.Gateway` on `http://localhost:5290`
- `ResumeBuilderFrontend` on `http://localhost:4200`

Google sign-in configuration:

- Auth API reads `GoogleAuth__ClientId`
- Google Cloud Console must allow the frontend origin in Authorized JavaScript origins
- The current frontend assumes the Google Identity Services client script is available at runtime

Request flow:

1. Frontend calls `/api/*`.
2. Angular dev proxy forwards `/api` to the Gateway.
3. Gateway routes to the correct backend service.
4. Auth API issues and validates identity.
5. File Parser and ATS services call Gemini and persist to the projects schema.

## Tech Stack

- .NET 10
- ASP.NET Core Web API
- Angular 21
- Entity Framework Core 10
- PostgreSQL with Npgsql
- JWT Bearer authentication
- BCrypt password hashing
- YARP reverse proxy
- Gemini API integration with Polly retry and timeout policies
- QuestPDF for resume PDF rendering

## Repository Layout

```text
AI-Resume-Builder/
├─ ResumeAI.Auth.API/
├─ ResumeAI.FileParserToJSON/
├─ ResumeAI.ATSScore.API/
├─ ResumeAI.Gateway/
└─ ResumeBuilderFrontend/
```

## Prerequisites

- .NET SDK 10.x
- Node.js for the Angular frontend
- PostgreSQL 14+
- Optional: `dotnet-ef` for migrations and schema updates

Install EF Core CLI if needed:

```powershell
dotnet tool install --global dotnet-ef
```

## Restore Dependencies

From the solution root:

```powershell
dotnet restore
cd ResumeBuilderFrontend
npm install
```

## Running the Platform

Run each backend in a separate terminal:

```powershell
cd ResumeAI.Auth.API
dotnet run
```

```powershell
cd ResumeAI.FileParserToJSON
dotnet run
```

```powershell
cd ResumeAI.ATSScore.API
dotnet run
```

```powershell
cd ResumeAI.Gateway
dotnet run
```

Run the frontend:

```powershell
cd ResumeBuilderFrontend
npm start
```

## Database Configuration

Auth and ATS use PostgreSQL connections from appsettings and environment variables.

Recommended practice:

- keep secrets out of source control
- use environment variables or user-secrets for local development

## Migrations

Auth API example:

```powershell
cd ResumeAI.Auth.API
dotnet ef database update
```

ATS API example:

```powershell
cd ResumeAI.ATSScore.API
dotnet ef database update
```

## Manual PostgreSQL Workflow

Your local command for checking the server state is preserved here:

```cmd
C:\pgsql\bin\pg_ctl -D C:\pgsql\data status
```

To start or stop the server, swap `status` with `start` or `stop` as needed.

Useful inspection queries:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'projects';

SELECT * FROM "Users";

SELECT * FROM projects.projects;
SELECT * FROM projects.resume_artifacts;
SELECT * FROM projects.job_description_artifacts;
SELECT * FROM projects.ats_results;
SELECT * FROM projects.wizard_state;
SELECT * FROM projects.user_resume_preferences;
SELECT * FROM projects.feedback;
SELECT * FROM projects.resume_builder_artifacts;
SELECT * FROM projects.resume_pdf_exports;
SELECT * FROM projects.resume_builder_templates;
SELECT * FROM projects.notifications;
SELECT * FROM projects.notification_user_states;
SELECT * FROM projects.resume_template_assets;
```

Encoding checks:

```sql
SHOW SERVER_ENCODING;

SELECT datname, encoding, pg_encoding_to_char(encoding)
FROM pg_database;
```

Practical DB interaction notes:

- `projects.projects` is the root project table.
- `resume_artifacts` stores parsed resume JSON and raw extracted text.
- `job_description_artifacts` stores JD JSON and raw extracted text.
- `resume_builder_artifacts` stores generated resume JSON and the builder snapshot.
- `resume_pdf_exports` stores rendered PDF bytes and metadata.
- `user_resume_preferences` stores the default resume reference used by ATS and Resume Builder quick reuse.

## Current Functional Highlights

- Auth supports register, login, refresh, logout, forgot-password OTP, and delete-account OTP.
- Auth also supports Google sign-in / sign-up with Google token verification.
- Gateway routes auth, parser, ATS, projects, notifications, feedback, and admin traffic.
- Parser service extracts text from PDF/DOCX and turns it into structured JSON.
- ATS service scores resume vs job description and persists ATS results.
- Resume Builder generates, revises, previews, and exports PDFs.
- Account Settings supports project history, restore, permanent delete, resume library, default resume selection, and phone number management.
- Default resume reuse is supported for ATS and Resume Builder workflows.

## Notes

- The gateway and frontend both assume `/api` is the public entry point.
- The ATS API owns the `projects` schema and its related artifacts.
- If a resume preview or PDF looks empty, inspect the stored default resume reference and the resolved canonical JSON from `/api/projects/resume-library/default/resolve`.
- If Google sign-in fails with `invalid_client`, check the Google OAuth client type and the exact JavaScript origin allowed in Google Cloud Console.
