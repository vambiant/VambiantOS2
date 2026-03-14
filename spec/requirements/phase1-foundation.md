# Phase 1: Foundation & Auth

**Timeline:** Weeks 1-4
**Goal:** Fully working monorepo with auth, multi-company, base UI, and cross-cutting concerns.

---

## 1.1 Monorepo Setup

### Turborepo + pnpm Workspaces

- Root `turbo.json` with pipelines: `build`, `dev`, `lint`, `typecheck`, `test`
- Workspace structure:
  ```
  apps/
    web/          # Next.js 15 (App Router)
  packages/
    api/          # tRPC v11 routers
    db/           # Drizzle ORM schemas + migrations
    domain/       # Pure business logic (no framework deps)
    ui/           # Shared React components (shadcn/ui based)
    config/       # Shared ESLint, TypeScript, Tailwind configs
  ```
- pnpm workspace protocol for inter-package dependencies
- All packages use TypeScript strict mode (`strict: true`, `noUncheckedIndexedAccess: true`)

### TypeScript Configuration

- Base `tsconfig.json` at root with strict settings
- Per-package `tsconfig.json` extending base
- Path aliases: `@vambiant/db`, `@vambiant/api`, `@vambiant/domain`, `@vambiant/ui`
- Target: ES2022, module: ESNext

### Code Quality

- ESLint flat config with rules for React, TypeScript, import ordering
- Prettier with consistent settings (single quotes, trailing commas, 100 char width)
- Lint-staged + Husky for pre-commit hooks
- `turbo lint` and `turbo typecheck` in CI

---

## 1.2 Database & ORM

### PostgreSQL 16+

- Local dev via Docker Compose (`docker-compose.yml` at root)
- Database: `vambiant_dev`, `vambiant_test`
- Extensions: `uuid-ossp`, `pg_trgm` (for fuzzy search)

### Drizzle ORM (`packages/db`)

- Schema-first approach using `drizzle-orm/pg-core`
- Migration tooling via `drizzle-kit` (`push`, `generate`, `migrate`)
- Seed script for development data
- Connection pooling config

### Auth Schema Tables

#### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| email | varchar(255) | unique, not null |
| email_verified_at | timestamp | nullable |
| password_hash | varchar(255) | not null |
| name | varchar(255) | not null |
| avatar_url | text | nullable |
| phone | varchar(50) | nullable |
| locale | varchar(10) | default 'de' |
| timezone | varchar(50) | default 'Europe/Berlin' |
| totp_secret | varchar(255) | nullable, encrypted |
| totp_enabled_at | timestamp | nullable |
| last_login_at | timestamp | nullable |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

#### `companies`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | varchar(255) | not null |
| slug | varchar(255) | unique, not null |
| logo_url | text | nullable |
| address_line1 | varchar(255) | nullable |
| address_line2 | varchar(255) | nullable |
| zip | varchar(20) | nullable |
| city | varchar(100) | nullable |
| country | varchar(2) | default 'DE' |
| phone | varchar(50) | nullable |
| website | text | nullable |
| tax_id | varchar(50) | nullable (USt-IdNr.) |
| plan | varchar(50) | default 'free' |
| owner_id | uuid | FK -> users.id |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

#### `company_user` (pivot)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| user_id | uuid | FK -> users.id |
| role | enum | 'owner','admin','manager','member','viewer' |
| joined_at | timestamp | default now() |
| unique(company_id, user_id) | | |

#### `roles` (for granular RBAC if needed beyond company_user.role)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| name | varchar(100) | not null |
| permissions | jsonb | array of permission strings |
| is_system | boolean | default false (system roles not editable) |
| created_at | timestamp | default now() |

#### `company_invitations`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| email | varchar(255) | not null |
| role | enum | same as company_user.role |
| token | varchar(255) | unique, not null |
| invited_by | uuid | FK -> users.id |
| accepted_at | timestamp | nullable |
| expires_at | timestamp | not null |
| created_at | timestamp | default now() |

#### `user_competencies`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK -> users.id |
| company_id | uuid | FK -> companies.id |
| name | varchar(255) | e.g. "Tragwerksplanung" |
| level | enum | 'junior','mid','senior','expert' |
| verified_at | timestamp | nullable |
| created_at | timestamp | default now() |

#### `api_usage_logs`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| user_id | uuid | FK -> users.id, nullable |
| endpoint | varchar(255) | not null |
| method | varchar(10) | not null |
| status_code | int | not null |
| response_time_ms | int | nullable |
| ip_address | varchar(45) | nullable |
| created_at | timestamp | default now() |

---

## 1.3 Authentication (Better Auth)

### Email/Password

- Registration form: name, email, password, confirm password
- Password requirements: min 8 chars, at least 1 number, 1 uppercase
- Email verification flow (send link, verify token)
- Login form: email, password, remember me
- Password reset flow (request -> email -> reset form)
- Session management: httpOnly cookies, 30-day expiry with refresh

### Microsoft OAuth

- Azure AD OAuth2 provider via Better Auth plugin
- Auto-link if email matches existing account
- First-time OAuth creates user + prompts company setup

### TOTP Two-Factor Authentication

- Enable/disable in user settings
- QR code generation for authenticator apps
- Recovery codes (10 single-use codes, stored hashed)
- 2FA challenge on login when enabled

### RBAC

- Five base roles: `owner`, `admin`, `manager`, `member`, `viewer`
- Permission matrix:

| Permission | Owner | Admin | Manager | Member | Viewer |
|-----------|-------|-------|---------|--------|--------|
| Manage company settings | x | x | | | |
| Manage members/invitations | x | x | | | |
| Create projects | x | x | x | | |
| Manage all projects | x | x | | | |
| Manage assigned projects | x | x | x | x | |
| View all projects | x | x | x | x | x |
| Delete projects | x | x | | | |
| Manage billing | x | | | | |

- Middleware: `requireRole('admin')`, `requirePermission('projects.create')`
- Role check in tRPC context for every procedure

---

## 1.4 Multi-Company

### Company Creation

- After registration, prompt to create first company or accept an invitation
- Company creation form: name, slug (auto-generated from name, editable)
- Creator is automatically assigned `owner` role

### Invitation System

- Admin/owner can invite by email
- Invitation email with magic link (token-based)
- Token expires in 7 days
- If invitee has account: add to company immediately
- If invitee is new: registration flow, then auto-join

### Company Switching

- Dropdown in header showing all user's companies
- Active company stored in cookie/session
- All data queries scoped to active company
- URL structure: `/app/...` (company context from session, not URL)

### Role Management

- Company settings > Members page
- List members with role badges
- Change role (owner can change any, admin can change non-owner)
- Remove member (with confirmation)
- Pending invitations list with resend/revoke

---

## 1.5 Cross-Cutting Concerns

### File Upload

- S3-compatible storage (MinIO for dev, AWS S3 or UploadThing for prod)
- `files` table: id, company_id, uploaded_by, filename, mime_type, size_bytes, storage_key, created_at
- Presigned upload URLs (direct browser-to-S3)
- Image processing: thumbnail generation for images
- File size limits configurable per company plan
- Virus scanning hook (optional, via ClamAV or external API)

### Polymorphic Comments

- `comments` table:
  - id, company_id, user_id, commentable_type, commentable_id, body (rich text), parent_id (for threads), created_at, updated_at
- Commentable types: project, task, milestone, deliverable, invoice, contract, etc.
- Tiptap editor for comment body (bold, italic, lists, mentions, links)
- @mentions: notify mentioned users
- Edit/delete own comments
- Threaded replies (one level deep)

### Notifications

- `notifications` table: id, user_id, company_id, type, title, body, data (jsonb), read_at, created_at
- In-app notification bell with unread count
- Notification dropdown with mark-as-read
- Notification types: mention, assignment, approval_request, invitation, deadline_reminder
- Email digest (configurable: instant, daily, weekly, off)
- User notification preferences page

---

## 1.6 Base UI

### App Shell

- Responsive layout: sidebar (collapsible) + main content area
- Sidebar navigation:
  - Dashboard
  - Projects
  - CRM (Organizations, Contacts)
  - AVA (later phases)
  - Resources (later phases)
  - Settings
- Sidebar collapses to icons on mobile / when toggled
- Header bar: breadcrumbs, search, notifications bell, user avatar menu
- Company switcher in sidebar header

### shadcn/ui Component Library

- Install and configure shadcn/ui in `packages/ui`
- Tailwind CSS 4 setup with design tokens
- Base components to include:
  - Button, Input, Textarea, Select, Checkbox, Radio, Switch, Slider
  - Dialog, Sheet, Popover, Tooltip, DropdownMenu, ContextMenu
  - Table, DataTable (with sorting, filtering, pagination)
  - Card, Tabs, Accordion, Badge, Avatar
  - Toast/Sonner notifications
  - Command palette (cmdk)
  - Form components with react-hook-form + zod validation
  - Calendar, DatePicker
  - Skeleton loaders
- Color theme: professional blue/gray palette, dark mode support
- Typography scale following Tailwind defaults

### Pages (Phase 1)

- `/login` - Login form
- `/register` - Registration form
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset form
- `/verify-email` - Email verification
- `/app/dashboard` - Dashboard (placeholder)
- `/app/settings/profile` - User profile
- `/app/settings/company` - Company settings
- `/app/settings/members` - Member management
- `/app/settings/billing` - Billing (placeholder)

---

## 1.7 Testing & CI

### Vitest

- Unit tests for `packages/domain` (pure logic)
- Unit tests for `packages/db` (schema validation)
- Integration tests for `packages/api` (tRPC procedures with test DB)
- Test utilities: factory functions for creating test data

### Playwright

- E2E tests for auth flows (register, login, logout, 2FA)
- E2E tests for company management (create, invite, switch)
- Test fixtures for authenticated sessions
- Screenshot comparison for critical UI states

### CI Pipeline (GitHub Actions)

- On PR: lint, typecheck, unit tests, E2E tests
- On merge to main: build, deploy to staging
- Caching: pnpm store, Turborepo remote cache, Playwright browsers
- PostgreSQL service container for test DB
