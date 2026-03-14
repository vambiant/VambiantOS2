# Phase 8: Marketplace, Tenders & Portfolio

**Timeline:** Weeks 37-42
**Goal:** Tender pipeline with external feed integration, project references/portfolio, marketplace for capacity trading, and group administration.

---

## 8.1 Tender Pipeline

### `tenders` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| title | varchar(500) | not null |
| source | enum | 'manual','spen','ted','other' |
| external_id | varchar(255) | nullable (ID from external source) |
| external_url | text | nullable (link to original listing) |
| client_name | varchar(255) | nullable |
| client_org_id | uuid | FK -> organizations.id, nullable |
| description | text | nullable |
| category | varchar(100) | nullable (e.g. "Hochbau", "Tiefbau", "TGA") |
| region | varchar(100) | nullable (Bundesland or city) |
| estimated_value_cents | bigint | nullable |
| submission_deadline | timestamp | nullable |
| stage | enum | 'identified','evaluating','go','preparing','submitted','won','lost','no_bid' |
| probability_percent | int | nullable (0-100) |
| assigned_to | uuid | FK -> users.id, nullable |
| go_no_go_decision | enum | 'pending','go','no_go' |
| go_no_go_decided_by | uuid | FK -> users.id, nullable |
| go_no_go_decided_at | timestamp | nullable |
| go_no_go_notes | text | nullable |
| won_value_cents | bigint | nullable (actual award value) |
| lost_reason | text | nullable |
| notes | text | nullable |
| created_by | uuid | FK -> users.id |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### `tender_documents` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| tender_id | uuid | FK -> tenders.id |
| file_id | uuid | FK -> files.id |
| document_type | enum | 'listing','brief','submission','correspondence','evaluation','other' |
| name | varchar(255) | not null |
| created_at | timestamp | default now() |

### `tender_team_members` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| tender_id | uuid | FK -> tenders.id |
| user_id | uuid | FK -> users.id |
| role | varchar(100) | e.g. "Projektleiter", "Kalkulation", "Akquise" |

### `tender_evaluation_criteria` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| tender_id | uuid | FK -> tenders.id |
| name | varchar(255) | not null |
| weight | decimal(5,2) | |
| score | decimal(5,2) | nullable (filled during evaluation) |
| notes | text | nullable |

### Tender Pipeline Kanban

- Columns mapping to stages:
  - Identified (new leads)
  - Evaluating (under review)
  - Go (decided to pursue)
  - Preparing (bid in progress)
  - Submitted (bid sent)
  - Won / Lost / No Bid (outcomes)
- Drag-and-drop between columns
- Card shows: title, client, deadline, value, probability, assignee
- Deadline countdown (days remaining, overdue highlight)
- Quick filters: category, region, assignee, deadline range

### SPEN Integration

- SPEN (or similar German public tender platform) API integration
- Automated tender feed import:
  - Configure search criteria (keywords, categories, regions)
  - Inngest scheduled job: poll SPEN API daily
  - Import new tenders to "Identified" stage
  - Deduplication (by external_id)
- Manual import from SPEN URL
- Mark imported tenders as relevant/irrelevant
- Link SPEN tender to internal tender record

### Go/No-Go Decision

- Evaluation checklist (configurable per company):
  - Does it match our expertise? (Y/N + weight)
  - Do we have capacity? (Y/N + weight)
  - Is the timeline feasible? (Y/N + weight)
  - Expected competition level? (Low/Med/High)
  - Strategic importance? (Low/Med/High)
  - Estimated effort for bid preparation (hours)
  - Expected probability of winning (%)
- Scoring summary with recommendation
- Decision: Go / No-Go with justification
- Decision approval (optional: requires manager sign-off)

### Requirements

- Tender CRUD with rich detail view
- Document management per tender
- Team assignment per tender
- Deadline tracking and reminders (7d, 3d, 1d before deadline)
- Tender dashboard:
  - Active tenders count and total pipeline value
  - Win rate (won / (won + lost) over period)
  - Average bid preparation effort
  - Pipeline value chart by stage
  - Upcoming deadlines
- Tender report: monthly/quarterly summary of activity and outcomes
- Convert won tender to project (auto-populate from tender data)

---

## 8.2 References / Portfolio

### `references` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| project_id | uuid | FK -> projects.id, nullable (link to internal project) |
| title | varchar(255) | not null |
| subtitle | varchar(255) | nullable |
| description | text | nullable (rich text) |
| client_name | varchar(255) | nullable |
| location | varchar(255) | nullable |
| year_completed | int | nullable |
| year_started | int | nullable |
| project_type | varchar(100) | e.g. "Neubau Bürogebäude" |
| scope | varchar(100) | e.g. "LP 1-8 HOAI" |
| gross_floor_area_m2 | decimal(10,2) | nullable |
| construction_cost_cents | bigint | nullable |
| fee_volume_cents | bigint | nullable |
| services_provided | text[] | array of service descriptions |
| awards | text[] | nullable (prizes received) |
| is_public | boolean | default false |
| sort_order | int | |
| created_by | uuid | FK -> users.id |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### `reference_images` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| reference_id | uuid | FK -> references.id |
| file_id | uuid | FK -> files.id |
| caption | varchar(255) | nullable |
| is_cover | boolean | default false |
| sort_order | int | |

### `reference_testimonials` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| reference_id | uuid | FK -> references.id |
| quote | text | not null |
| author_name | varchar(255) | not null |
| author_title | varchar(255) | nullable |
| author_organization | varchar(255) | nullable |
| sort_order | int | |

### `reference_tags` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| name | varchar(100) | not null (e.g. "Holzbau", "Denkmalschutz", "Passivhaus") |

### `reference_tag_links` (pivot)

| Column | Type | Notes |
|--------|------|-------|
| reference_id | uuid | FK -> references.id |
| tag_id | uuid | FK -> reference_tags.id |
| PK(reference_id, tag_id) | | |

### Reference Detail Page

- Hero image (cover photo)
- Project metadata: type, location, year, area, cost
- Description (rich text)
- Image gallery (lightbox viewer)
- Services provided list
- Awards
- Testimonials
- Tags

### Project Sheet PDF Export

- Single-page or two-page layout
- Company branding (logo, colors)
- Cover image
- Key data in structured layout
- Description excerpt
- 2-4 additional images
- Company contact info
- Configurable template (choice of layouts)

### Public Portfolio Page

- Shareable URL: `https://app.vambiant.com/portfolio/{company-slug}`
- Grid/masonry layout of reference cards
- Filter by tag, project type, year
- Click through to reference detail
- Responsive design (desktop + mobile)
- Optional: custom domain support (CNAME)
- SEO-friendly (meta tags, structured data)

### Requirements

- Reference CRUD with image management
- Import reference from completed project (auto-fill from project data)
- Tag management
- Drag-and-drop image reordering
- PDF export with template selection
- Batch PDF export (multiple references, compiled)
- Public portfolio toggle per reference
- Portfolio page configuration (company intro text, logo, color scheme)
- Portfolio analytics (views, popular references)

---

## 8.3 Marketplace (Capacity Trading)

### `marketplace_listings` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| type | enum | 'offer','request' |
| title | varchar(255) | not null |
| description | text | nullable |
| category | varchar(100) | e.g. "Tragwerksplanung", "TGA-Planung" |
| skills_required | text[] | array of skill names |
| location | varchar(255) | nullable |
| remote_possible | boolean | default false |
| start_date | date | nullable |
| end_date | date | nullable |
| hours_per_week | decimal(5,2) | nullable |
| hourly_rate_cents | bigint | nullable (indicative) |
| status | enum | 'draft','active','paused','filled','expired' |
| visibility | enum | 'public','group_only' |
| expires_at | timestamp | nullable |
| created_by | uuid | FK -> users.id |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### `marketplace_inquiries` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| listing_id | uuid | FK -> marketplace_listings.id |
| from_company_id | uuid | FK -> companies.id |
| from_user_id | uuid | FK -> users.id |
| message | text | not null |
| status | enum | 'sent','read','replied','accepted','declined' |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### `marketplace_messages` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| inquiry_id | uuid | FK -> marketplace_inquiries.id |
| sender_user_id | uuid | FK -> users.id |
| body | text | not null |
| read_at | timestamp | nullable |
| created_at | timestamp | default now() |

### Marketplace Types

1. **Capacity Offers** ("Wir bieten an"):
   - Company has available resources/expertise
   - Example: "Tragwerksplaner mit 20h/Woche verfügbar ab Mai 2026"

2. **Capacity Requests** ("Wir suchen"):
   - Company needs additional resources
   - Example: "Suche TGA-Planer für Bürogebäude in München, LP 5-8"

### Requirements

- Listing creation form (offer or request)
- Marketplace browse view:
  - Tab toggle: Offers / Requests
  - Card layout with key info
  - Filters: category, location, remote, date range, availability
  - Search by keyword
- Listing detail page
- Inquiry system: send message to listing company
- Conversation thread per inquiry
- Notification on new inquiry and new message
- Listing management: pause, reactivate, mark as filled
- Auto-expire old listings (configurable, default 90 days)
- Company profile on marketplace (from company settings)
- Privacy: company identity revealed only after inquiry
- Matching suggestions: "Based on your skills, these requests match"
- Marketplace dashboard: active listings, inquiries, matches

---

## 8.4 Group Administration

### `company_groups` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | varchar(255) | not null |
| description | text | nullable |
| owner_company_id | uuid | FK -> companies.id |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### `company_group_members` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| group_id | uuid | FK -> company_groups.id |
| company_id | uuid | FK -> companies.id |
| role | enum | 'owner','admin','member' |
| joined_at | timestamp | default now() |

### `group_invitations` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| group_id | uuid | FK -> company_groups.id |
| company_id | uuid | FK -> companies.id |
| invited_by_company_id | uuid | FK -> companies.id |
| token | varchar(255) | unique |
| status | enum | 'pending','accepted','rejected','expired' |
| created_at | timestamp | default now() |
| expires_at | timestamp | |

### Group Features

- **Group creation**: company creates a group, invites other companies
- **Cross-company visibility**: group members can share:
  - Marketplace listings (group-only visibility)
  - References (shared portfolio)
  - Resource availability
- **Group dashboard**:
  - Member companies overview
  - Combined capacity view
  - Shared project pipeline
  - Group-level KPIs
- **Group-level reporting**:
  - Aggregated financial metrics (anonymized or full, based on permissions)
  - Combined skill matrix across companies
  - Group utilization rates
- **Cross-company resource sharing**:
  - Allocate resources from member companies to group projects
  - Shared time tracking for cross-company engagements
  - Inter-company billing (internal settlement)

### Requirements

- Group CRUD (create, rename, dissolve)
- Invite company by email or search
- Member management (change role, remove)
- Group-scoped marketplace listings
- Group portfolio (combined references from all members)
- Group settings: what data is shared, permission levels
- Group notifications: new member, new shared resource
- Inter-company agreement templates (for resource sharing terms)

---

## 8.5 Final Integration & Polish

### Integration Testing

- End-to-end flows across all phases:
  - Create company -> Create project -> Estimate costs -> Create HOAI offer -> Win contract -> Generate invoices -> Track time -> Financial reporting
  - Create LV -> Publish tender -> Receive bids -> Award -> Aufmaß -> Settlement
  - Upload IFC -> Extract room book -> Link to cost groups
- Cross-module data consistency checks
- Performance testing under load:
  - 50 concurrent users
  - 100+ projects per company
  - 10,000+ LV positions per project
  - Large IFC models (100MB+)

### Performance Optimization

- Database query optimization (indexes, query plans)
- React Server Components for initial page loads
- Client-side caching with TanStack Query (via tRPC)
- Image optimization (Next.js Image component, WebP)
- Code splitting per route
- Lazy loading for heavy components (Gantt, BIM viewer, charts)
- Bundle size analysis and optimization
- Lighthouse performance audit (target: 90+ score)

### Security Audit

- Authentication flows review
- Authorization: verify all endpoints enforce RBAC
- Input validation on all tRPC procedures
- SQL injection prevention (Drizzle ORM parameterized)
- XSS prevention (React default escaping + CSP headers)
- CSRF protection
- File upload validation (type, size, virus scan)
- Rate limiting on auth endpoints
- Dependency audit (`pnpm audit`)
- HTTPS enforcement
- GDPR compliance review (data export, deletion, consent)

### Documentation

- API documentation (auto-generated from tRPC procedures)
- Deployment guide (environment variables, infrastructure)
- User guide (feature walkthrough with screenshots)
- Admin guide (company setup, configuration)
- Developer guide (contributing, architecture overview)

---

## 8.6 UI Pages (Phase 8)

### Routes

- `/app/tenders` - Tender section
  - `/pipeline` - Kanban pipeline view
  - `/[id]` - Tender detail
  - `/[id]/evaluate` - Go/no-go evaluation
  - `/import` - SPEN import
- `/app/portfolio` - Portfolio management
  - `/references` - Reference list
  - `/references/[id]` - Reference editor
  - `/references/[id]/pdf` - PDF preview
  - `/settings` - Portfolio page settings
- `/portfolio/[company-slug]` - Public portfolio page (no auth required)
  - `/[reference-slug]` - Public reference detail
- `/app/marketplace` - Marketplace
  - `/browse` - Browse listings
  - `/listings` - My listings
  - `/listings/[id]` - Listing detail
  - `/inquiries` - My inquiries / conversations
- `/app/group` - Group administration
  - `/members` - Member companies
  - `/dashboard` - Group dashboard
  - `/settings` - Group settings
