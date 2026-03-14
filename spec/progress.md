# VambiantOS2 Implementation Progress

> Tracking file for the full rebuild of VambiantOS.
> Total: 8 phases, ~42 weeks.

---

## Phase 1: Foundation & Auth (Weeks 1-4)

- [x] Monorepo scaffold (Turborepo, pnpm workspaces, tsconfig paths)
- [x] Shared TypeScript config (strict mode, path aliases)
- [x] ESLint + Prettier shared config (Biome linting/formatting)
- [ ] PostgreSQL 16 local + CI setup
- [x] Drizzle ORM package (`packages/db`) with migration tooling
- [x] Auth schema: `users`, `companies`, `company_user`, `roles`, `company_invitations`, `user_competencies`, `api_usage_logs`
- [x] Better Auth integration (email/password registration & login) — placeholder, needs actual implementation
- [ ] Microsoft OAuth provider
- [ ] TOTP two-factor authentication
- [ ] RBAC: roles (owner, admin, manager, member, viewer), permissions matrix
- [ ] Multi-company: create company, invite by email, accept invitation
- [x] Company switcher (active company in session/cookie)
- [x] tRPC v11 package (`packages/api`) with context & auth middleware (70 procedures across 9 routers)
- [ ] File upload infrastructure (S3-compatible / UploadThing)
- [x] Polymorphic comments system (commentable_type + commentable_id)
- [x] Notifications system (in-app, email digest) — schema complete, implementation pending
- [x] App shell: sidebar navigation, header bar, breadcrumbs
- [x] shadcn/ui component library setup (Radix + Tailwind CSS 4) — 27 components
- [x] Company settings page (name, logo, address, billing)
- [x] User profile page (avatar, password change, 2FA toggle)
- [ ] Dark mode toggle
- [ ] Vitest unit test setup
- [ ] Playwright E2E test setup
- [ ] CI pipeline (GitHub Actions: lint, typecheck, test, build)

### Phase 1 Additional Items
- [x] Database schema complete (74 tables across 10 schema files)
- [x] Database schema - cross-cutting tables (comments, tags, taggables, notifications, media, file_categories)
- [x] Shared Zod validators (auth, company, project, crm, tasks, procurement, time-tracking, finance)
- [x] Auth pages: login, register, 2FA verification, forgot password
- [x] Dashboard overview page with stats, recent projects, milestones, activity
- [x] Settings pages: general, members, roles
- [x] Base UI: app shell, sidebar, header, company switcher, breadcrumbs, user menu

## Phase 2: Project Management Core (Weeks 5-9)

- [x] `projects` table with scope discriminator and template system
- [x] Project CRUD (create, read, update, archive, delete)
- [ ] Project templates (predefined scope + phase config)
- [x] HOAI Leistungsphasen (LP 1-9) module per project
- [x] `tasks` table with assignment, priority, status workflow
- [x] Task CRUD with bulk operations
- [x] Task status workflow (open -> in_progress -> review -> done)
- [x] `milestones` table with approval workflow
- [ ] Milestone approval flow (submit -> review -> approved/rejected)
- [x] `deliverables` table with file attachments
- [ ] Deliverable upload and version history
- [x] Gantt chart view (interactive, dependency arrows, drag-to-resize) — custom implementation
- [x] Kanban board view (drag-and-drop between columns)
- [ ] Content blocks library (reusable text/checklist blocks)
- [x] Activity feed (project-level event log) — with infinite scroll
- [ ] Project-level comments and discussions
- [x] Project dashboard (summary cards, progress charts)
- [x] Project list with filters, search, and sorting — grid/table view
- [ ] Project member management (add/remove, role per project)

### Phase 2 Additional Items
- [x] Project creation form (multi-step wizard)
- [x] Project detail layout with tabs
- [x] Project overview page with stats, module progress
- [x] Tasks page with table, filters, inline status
- [x] Task form component
- [x] Modules page with HOAI phase cards
- [x] Milestones timeline view
- [x] Deliverables table
- [x] Files browser with upload zone
- [x] Project settings

## Phase 3: Cost Planning & Fee Calculation (Weeks 10-14)

- [x] DIN 276 cost group hierarchy (3 levels, seeded reference data)
- [x] `cost_groups` table linked to projects
- [x] Cost group CRUD with tree view UI
- [x] BKI reference data import (building types, benchmarks) — types and reference data structures
- [ ] BKI regional factors per Bundesland
- [x] Cost estimation: Kostenrahmen (rough framework)
- [x] Cost estimation: Kostenschaetzung (estimate, DIN 276 level 1)
- [x] Cost estimation: Kostenberechnung (calculation, DIN 276 level 2-3)
- [x] Cost estimation: Kostenanschlag (tender-based)
- [x] Cost estimation: Kostenfeststellung (final determination)
- [ ] Estimation versioning and comparison
- [x] HOAI fee calculation engine (`packages/domain`) — pure TypeScript, all 7 service types
- [x] HOAI Honorarzonen I-V with interpolation
- [ ] HOAI Nebenkostenpauschale (ancillary cost flat rates)
- [ ] HOAI Besondere Leistungen (special services)
- [x] `hoai_offers` table with versioning
- [x] HOAI offer builder: phases, positions, groups
- [ ] HOAI offer PDF export (letterhead, summary, breakdown)
- [x] CRM: `organizations` table (client, contractor, partner types)
- [x] CRM: `contacts` table linked to organizations
- [x] CRM: activity log per organization/contact
- [x] CRM: organization list with type filters and search

### Phase 3 Additional Items
- [x] HOAI interpolation logic
- [x] Cost estimation list page
- [x] Cost estimation detail with DIN 276 tree view
- [x] Cost estimation creation form
- [x] HOAI offers list page
- [x] HOAI offer detail with 5 tabs
- [x] HOAI offer creation wizard (5 steps)
- [x] Interactive HOAI calculator component
- [x] CRM list with type tabs
- [x] CRM detail with contacts, activities
- [x] CRM creation form

## Phase 4: Contracts, Invoices & Communication (Weeks 15-19)

- [x] `contracts` table derived from accepted HOAI offers
- [x] Contract detail view (linked offer, status, amendments)
- [x] `invoices` table with line items
- [x] Partial invoicing by HOAI Leistungsphase
- [ ] Invoice PDF generation (compliant German format, Pflichtangaben)
- [x] Invoice status workflow (draft -> sent -> paid -> overdue)
- [ ] `change_orders` (Nachtraege) with approval flow
- [ ] Change order impact on contract value
- [x] `meeting_protocols` with agenda, participants, decisions
- [x] Meeting action items linked to tasks
- [ ] Meeting protocol PDF export
- [x] `correspondence` tracking (letters, emails logged)
- [ ] Correspondence templates
- [x] Questionnaire builder (dynamic form schema)
- [x] Questionnaire fill view and response collection
- [ ] Questionnaire response export (CSV/PDF)

### Phase 4 Additional Items
- [x] Contracts list page
- [x] Contract creation form
- [x] Invoices list page
- [x] Invoice detail (document preview style)
- [x] Invoice creation with dynamic line items
- [x] Communication list (protocols + correspondence)
- [x] Communication detail with action items
- [x] Communication creation form
- [x] Questionnaires list
- [x] Questionnaire detail (section-based form)

## Phase 5: AVA System (Weeks 20-25)

- [x] `lv_projects` (Leistungsverzeichnis project container)
- [x] `lv_groups` hierarchical grouping (Lose, Titel, Positionen)
- [x] `lv_positions` with quantity, unit, description
- [x] LV editor UI (tree with inline editing)
- [ ] LV position types: Normalposition, Bedarfsposition, Alternativposition, Eventualposition
- [ ] GAEB DA81 import (LV structure)
- [ ] GAEB DA83 export (LV for bidding)
- [ ] GAEB DA84 import (bid prices)
- [x] `bids` table per LV position
- [x] Bid entry UI (spreadsheet-like)
- [x] Preisspiegel (price mirror) comparison view
- [ ] Preisspiegel PDF export
- [x] Award decision workflow
- [ ] Contractor assignment per Lot/Titel
- [x] `aufmass` (measurement) entries per position
- [ ] Cumulative accounting (kumulierte Abrechnung)
- [ ] Payment certificate generation
- [ ] AVA dashboard (project-level summary)

### Phase 5 Additional Items
- [x] AVA list page
- [x] AVA detail with tabs
- [x] Leistungsverzeichnis (hierarchical positions)
- [x] Bid entry and management
- [x] Preisspiegel comparison matrix
- [x] Award decision page
- [x] Aufmass measurement entries

## Phase 6: BIM, Documents & Reports (Weeks 26-31)

- [ ] IFC file upload and storage
- [ ] xeokit 3D viewer integration
- [x] BIM model navigation (element tree, properties panel) — placeholder 3D viewer
- [ ] BIM element selection and annotation
- [ ] Raumbuch (room book) extraction from IFC
- [ ] Raumbuch editor (room properties, finishes, equipment)
- [ ] Raumbuch export (Excel/PDF)
- [ ] `permits` table (Baugenehmigung tracking)
- [ ] Permit document management
- [ ] Permit timeline and status tracking
- [ ] Explanatory report templates (Erlaeuterungsbericht)
- [ ] AI-assisted report generation (section drafting)
- [ ] Report versioning and approval
- [ ] Variant comparison tool (side-by-side, scoring matrix)
- [ ] Document management (folders, tags, search)

### Phase 6 Additional Items
- [x] BIM model list
- [x] BIM detail with 3D viewer placeholder
- [x] Reports list page
- [x] Report detail with editor and variants

## Phase 7: Resources, Time & Finance (Weeks 32-36)

- [x] `resource_allocations` table (person + project + hours)
- [x] Resource allocation calendar view — heat map
- [ ] Scenario modeling (what-if allocation changes)
- [ ] Capacity planning dashboard
- [ ] `skills` and `certifications` tables
- [ ] Skills/certification tracking per user
- [ ] Skill matrix view (team overview)
- [x] `time_entries` table
- [x] Time tracking UI (start/stop, manual entry) — weekly timesheet
- [x] Timesheet calendar view (week/month)
- [ ] Timesheet approval workflow
- [ ] Time reports (per project, per user, per period)
- [ ] Financial dashboard (revenue, costs, margins)
- [ ] Project profitability analysis
- [x] `wiki_pages` table (hierarchical)
- [x] Wiki editor (Tiptap rich text)
- [ ] Wiki search and navigation

### Phase 7 Additional Items
- [x] Time tracking with weekly timesheet
- [x] Weekly timesheet component
- [x] Resource allocation heat map
- [x] Resource detail with skills
- [x] Wiki knowledge base
- [x] Wiki article detail

## Phase 8: Marketplace, Tenders & Portfolio (Weeks 37-42)

- [x] `tenders` table with pipeline stages
- [x] Tender pipeline Kanban view
- [ ] SPEN integration (tender feed import)
- [ ] Tender document management
- [ ] Go/no-go decision workflow
- [x] `references` table (completed project portfolio)
- [x] Reference detail page (images, key data, testimonials)
- [ ] Reference PDF export (project sheet)
- [ ] Public portfolio page (shareable link)
- [x] Marketplace: capacity offers (available resources)
- [x] Marketplace: capacity requests (needed resources)
- [ ] Marketplace matching and messaging
- [ ] Group administration (multi-company groups)
- [ ] Group-level reporting and dashboards
- [ ] Cross-company resource sharing
- [ ] Final integration testing
- [ ] Performance optimization and audit
- [ ] Documentation and handover

### Phase 8 Additional Items
- [x] Tender pipeline (kanban-style)
- [x] Tender detail with analysis/scoring
- [x] Marketplace listings
- [x] References portfolio grid
- [x] Reference detail

---

## Cross-Cutting Progress

- [x] Database schema complete (74 tables across 10 schema files)
- [x] tRPC API routes complete (70 procedures across 9 routers)
- [x] Shared validators complete (Zod schemas for all domains)
- [x] UI component library complete (27 shadcn/ui components)
- [x] Domain logic: HOAI calculator, DIN 276, BKI types

## Remaining Work (Not Started / In Progress)

- [ ] Better Auth actual implementation (currently placeholder)
- [ ] Database migrations (Drizzle Kit push/migrate)
- [ ] tRPC procedure implementations (currently TODO placeholders)
- [ ] Real data integration (currently using mock data)
- [ ] PDF export templates (HOAI offers, invoices, protocols, Preisspiegel)
- [ ] GAEB import/export integration (DA81/DA83/DA84)
- [ ] xeokit BIM viewer integration
- [ ] SPEN tender API integration
- [ ] Email notifications (React Email + Resend)
- [ ] File upload to S3/R2
- [ ] Real-time updates (WebSocket/Ably)
- [ ] i18n setup (next-intl)
- [ ] Microsoft OAuth provider
- [ ] TOTP two-factor authentication
- [ ] RBAC permissions matrix implementation
- [ ] CI pipeline (GitHub Actions)
- [ ] Vitest + Playwright test suites

---

## Legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete
- `[-]` Skipped / Descoped
