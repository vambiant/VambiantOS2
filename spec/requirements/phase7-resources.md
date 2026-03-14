# Phase 7: Resources, Time & Finance

**Timeline:** Weeks 32-36
**Goal:** Resource allocation and capacity planning, skills tracking, time tracking, financial dashboards, and knowledge base.

---

## 7.1 Resource Allocation

### `resource_allocations` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| user_id | uuid | FK -> users.id |
| project_id | uuid | FK -> projects.id |
| phase_id | uuid | FK -> project_phases.id, nullable |
| start_date | date | not null |
| end_date | date | not null |
| hours_per_week | decimal(5,2) | not null |
| role_description | varchar(255) | nullable (e.g. "Projektleiter", "Tragwerksplaner") |
| status | enum | 'planned','confirmed','active','completed' |
| scenario_id | uuid | FK -> allocation_scenarios.id, nullable |
| notes | text | nullable |
| created_by | uuid | FK -> users.id |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### `allocation_scenarios` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| name | varchar(255) | not null (e.g. "Baseline", "With New Project X") |
| description | text | nullable |
| is_active | boolean | default false (only one active = reality) |
| created_by | uuid | FK -> users.id |
| created_at | timestamp | default now() |

### Calendar View Requirements

- Weekly/monthly calendar showing allocations per person
- Rows: team members
- Columns: weeks or days
- Cells: colored blocks per project (height = hours allocated)
- Color coding by project
- Hover: show project name, role, hours
- Stacked view for users on multiple projects
- Overallocation warning (> company's hours/week, typically 40h)
- Drag-and-drop to adjust allocation dates
- Click to edit hours/details

### Capacity Planning Dashboard

- **Supply view**: Available hours per person per week
  - Total capacity (e.g., 40h/week) minus allocated hours
  - Visual: bar chart of free capacity per team member
- **Demand view**: Required hours per project per week
  - Based on project timeline and planned allocations
- **Gap analysis**: Where demand exceeds supply
  - Highlight weeks/people that are overbooked
  - Highlight unallocated project needs
- Filters: department, skill, date range, project

### Scenario Modeling

- Create named scenarios (what-if analysis)
- Clone active scenario as starting point
- Add/modify/remove allocations in scenario
- Side-by-side comparison: active vs. scenario
- Impact analysis: which projects are affected, who is over/under-allocated
- Promote scenario to active (replaces current allocations)
- Delete scenario

### Requirements

- Resource allocation CRUD
- Allocation conflict detection (same person, overlapping dates, > capacity)
- Allocation request workflow: manager proposes -> person confirms (optional)
- Allocation report: per person or per project, exportable
- Integration with project phases: suggest allocation needs based on phase timeline
- Company-wide utilization metrics (target vs. actual)

---

## 7.2 Skills & Certifications

### `skills` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| name | varchar(255) | not null |
| category | varchar(100) | e.g. "Planung", "Software", "Fachgebiet" |
| description | text | nullable |
| created_at | timestamp | default now() |

### `user_skills` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK -> users.id |
| skill_id | uuid | FK -> skills.id |
| level | enum | 'basic','intermediate','advanced','expert' |
| self_assessed | boolean | default true |
| verified_by | uuid | FK -> users.id, nullable |
| verified_at | timestamp | nullable |
| notes | text | nullable |
| updated_at | timestamp | default now() |

### `certifications` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| name | varchar(255) | not null |
| issuing_body | varchar(255) | nullable |
| description | text | nullable |
| validity_months | int | nullable (null = never expires) |

### `user_certifications` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK -> users.id |
| certification_id | uuid | FK -> certifications.id |
| obtained_date | date | not null |
| expiry_date | date | nullable |
| certificate_file_id | uuid | FK -> files.id, nullable |
| notes | text | nullable |
| created_at | timestamp | default now() |

### Skill Matrix View

- Grid: rows = team members, columns = skills
- Cells: level indicator (color-coded dots or bars)
- Filter by: skill category, minimum level
- Sort by: name, number of skills, specific skill level
- Identify skill gaps: which skills have no expert in the team
- Export as PDF/Excel

### Requirements

- Company-managed skill catalog
- Self-assessment: users rate their own skills
- Manager verification: approve/adjust skill levels
- Certification tracking with expiry alerts
- Certification renewal reminders (30/60/90 days before expiry)
- Find people by skill: "Who knows Revit at advanced level?"
- Skill development plans (optional, stretch goal)

---

## 7.3 Time Tracking

### `time_entries` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| user_id | uuid | FK -> users.id |
| project_id | uuid | FK -> projects.id |
| task_id | uuid | FK -> tasks.id, nullable |
| phase_id | uuid | FK -> project_phases.id, nullable |
| date | date | not null |
| hours | decimal(5,2) | not null |
| description | text | nullable |
| billable | boolean | default true |
| status | enum | 'draft','submitted','approved','rejected' |
| approved_by | uuid | FK -> users.id, nullable |
| approved_at | timestamp | nullable |
| started_at | timestamp | nullable (for timer mode) |
| stopped_at | timestamp | nullable (for timer mode) |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### `time_entry_categories` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| name | varchar(100) | not null (e.g. "Planung", "Besprechung", "Reise") |
| is_billable | boolean | default true |
| color | varchar(7) | hex color |
| sort_order | int | |

### Time Tracking UI

#### Manual Entry
- Quick entry form: project, task (optional), date, hours, description
- Weekly timesheet grid:
  - Rows: projects/tasks
  - Columns: Mon-Sun
  - Cells: hours input
  - Row totals, column totals, grand total
- Add row to timesheet (search project/task)
- Copy previous week's structure

#### Timer Mode
- Start/stop timer button in header
- Select project and task when starting
- Running timer visible in header bar
- Pause/resume functionality
- Manual adjustment of start/stop times
- Auto-create time entry when stopped

#### Calendar View
- Month view: colored blocks per project per day
- Day detail: list of time entries
- Click to add/edit entries
- Drag to adjust hours (visual resize)

### Timesheet Approval Workflow

1. User fills weekly timesheet
2. User submits week for approval (status: draft -> submitted)
3. Manager reviews: approve all / reject with comments
4. Approved entries locked from editing
5. Rejected entries returned to user for correction

### Time Reports

- **Per user**: weekly/monthly summary, project breakdown
- **Per project**: who worked how many hours, by phase
- **Per company**: total hours, utilization rate, billable ratio
- Filters: date range, project, user, category, billable/non-billable
- Charts: hours over time, project distribution pie chart
- Export: CSV, Excel, PDF
- Comparison: actual hours vs. allocated hours vs. estimated hours

### Requirements

- Default work hours per user (configurable, default 8h/day)
- Holiday/vacation calendar (mark non-working days)
- Overtime tracking (hours beyond daily/weekly limit)
- Missing timesheet reminders (Inngest job, weekly)
- Link time entries to HOAI phase for fee tracking
- Actual hours vs. HOAI fee analysis (effective hourly rate per project)

---

## 7.4 Financial Dashboard

### Key Metrics

- **Revenue**
  - Total invoiced (all projects, period)
  - Total paid (received payments)
  - Outstanding (invoiced but unpaid)
  - Overdue (past due date)
- **Costs**
  - Staff costs (hours * hourly rate per person)
  - Subcontractor costs (from AVA settlements)
  - Direct project costs
- **Margins**
  - Gross margin per project (revenue - direct costs)
  - Net margin (including allocated overhead)
  - Effective hourly rate (revenue / hours worked)
- **Pipeline**
  - Total value of active offers
  - Expected revenue (offer value * probability)
  - Conversion rate (accepted / sent offers)

### Dashboard Views

#### Company Overview
- Revenue chart (monthly, last 12 months)
- Outstanding invoices aging chart (0-30, 31-60, 61-90, 90+ days)
- Top projects by revenue
- Top projects by profitability
- Utilization rate gauge (actual hours / capacity)
- Billable ratio gauge (billable hours / total hours)

#### Project Profitability
- Table: project, contract value, invoiced, hours worked, staff cost, margin, margin %
- Sort by any column
- Drill down to project detail
- Traffic light indicators (green/yellow/red) for margin thresholds
- Trend sparklines

#### Cash Flow
- Monthly cash in (payments received) vs. cash out (known costs)
- Forecast based on outstanding invoices and expected payments
- Rolling 6-month projection

### Requirements

- Real-time calculation from underlying data (invoices, time entries, contracts)
- Date range selector (this month, quarter, year, custom)
- Compare periods (this year vs. last year)
- Export dashboard as PDF
- Scheduled email reports (weekly/monthly digest to managers)
- Configurable target metrics (target utilization %, target margin %)

---

## 7.5 Wiki / Knowledge Base

### `wiki_spaces` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| name | varchar(255) | not null |
| slug | varchar(255) | unique per company |
| description | text | nullable |
| icon | varchar(50) | nullable (emoji or icon name) |
| is_default | boolean | default false |
| created_at | timestamp | default now() |

### `wiki_pages` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| space_id | uuid | FK -> wiki_spaces.id |
| parent_id | uuid | FK -> wiki_pages.id, nullable |
| title | varchar(500) | not null |
| slug | varchar(500) | unique per space |
| body | text | rich text (Tiptap) |
| sort_order | int | |
| is_pinned | boolean | default false |
| last_edited_by | uuid | FK -> users.id |
| created_by | uuid | FK -> users.id |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### `wiki_page_versions` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| page_id | uuid | FK -> wiki_pages.id |
| version | int | auto-increment |
| title | varchar(500) | |
| body | text | |
| edited_by | uuid | FK -> users.id |
| created_at | timestamp | default now() |

### Requirements

- Wiki organized in spaces (e.g., "Company Handbook", "Project Standards", "Templates")
- Hierarchical page tree within each space
- Tiptap rich text editor with:
  - Headings, bold, italic, strikethrough
  - Ordered/unordered lists, checklists
  - Code blocks with syntax highlighting
  - Tables
  - Images (upload inline)
  - Internal links (link to other wiki pages)
  - Callout blocks (info, warning, tip)
  - Table of contents (auto-generated from headings)
- Page version history: view diffs between versions, restore previous version
- Full-text search across all wiki content
- Star/favorite pages for quick access
- Recent changes feed
- Page comments (using polymorphic comments system)
- Templates: create page from template
- Export page as PDF
- Permissions: wiki space-level access control (view, edit, manage)

---

## 7.6 UI Pages (Phase 7)

### Routes

- `/app/resources` - Resource management section
  - `/allocations` - Allocation calendar view
  - `/allocations/scenarios` - Scenario management
  - `/capacity` - Capacity planning dashboard
  - `/skills` - Skill matrix
  - `/certifications` - Certification tracker
- `/app/time` - Time tracking section
  - `/track` - Timer + quick entry
  - `/timesheet` - Weekly timesheet grid
  - `/calendar` - Calendar view
  - `/approvals` - Approval queue (for managers)
  - `/reports` - Time reports
- `/app/finance` - Financial section
  - `/dashboard` - Financial overview dashboard
  - `/profitability` - Project profitability table
  - `/cashflow` - Cash flow view
  - `/invoices` - All invoices (cross-project)
- `/app/wiki` - Knowledge base
  - `/[spaceSlug]` - Space view (page tree)
  - `/[spaceSlug]/[...pageSlug]` - Page view/edit
  - `/search` - Search results
