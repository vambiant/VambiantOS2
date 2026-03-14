# Phase 2: Project Management Core

**Timeline:** Weeks 5-9
**Goal:** Full project lifecycle management with tasks, milestones, deliverables, Gantt, and Kanban.

---

## 2.1 Project CRUD & Templates

### `projects` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| name | varchar(255) | not null |
| slug | varchar(255) | unique per company |
| description | text | nullable |
| scope | enum | 'architecture','structural','mep','landscape','interior','urban','general' |
| status | enum | 'planning','active','on_hold','completed','archived' |
| template_id | uuid | FK -> project_templates.id, nullable |
| client_org_id | uuid | FK -> organizations.id, nullable |
| project_number | varchar(50) | company-scoped auto-increment |
| address_line1 | varchar(255) | nullable |
| zip | varchar(20) | nullable |
| city | varchar(100) | nullable |
| country | varchar(2) | default 'DE' |
| start_date | date | nullable |
| end_date | date | nullable |
| budget_cents | bigint | nullable |
| created_by | uuid | FK -> users.id |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### `project_members` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| project_id | uuid | FK -> projects.id |
| user_id | uuid | FK -> users.id |
| role | enum | 'lead','member','viewer' |
| joined_at | timestamp | default now() |
| unique(project_id, user_id) | | |

### `project_templates` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id, nullable (null = system template) |
| name | varchar(255) | not null |
| scope | enum | same as projects.scope |
| description | text | nullable |
| config | jsonb | default phases, task templates, milestones |
| is_system | boolean | default false |
| created_at | timestamp | default now() |

### Requirements

- Create project from scratch or from template
- Template applies default tasks, milestones, HOAI phases
- Project number auto-generated: `{year}-{sequential}` (e.g., `2026-001`)
- Archive/unarchive projects (soft delete via status)
- Duplicate project (deep copy option)
- Project list page with filters: status, scope, date range, search
- Project detail page with tabbed navigation

---

## 2.2 HOAI Leistungsphasen (LP 1-9)

### `project_phases` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| project_id | uuid | FK -> projects.id |
| phase_number | int | 1-9 |
| name | varchar(100) | e.g. "Grundlagenermittlung" |
| status | enum | 'not_started','in_progress','completed' |
| weight_percent | decimal(5,2) | HOAI standard weight |
| start_date | date | nullable |
| end_date | date | nullable |
| completed_at | timestamp | nullable |
| notes | text | nullable |
| created_at | timestamp | default now() |

### HOAI Standard Phases

| LP | Name | Default Weight |
|----|------|---------------|
| 1 | Grundlagenermittlung | 2% |
| 2 | Vorplanung | 7% |
| 3 | Entwurfsplanung | 15% |
| 4 | Genehmigungsplanung | 3% |
| 5 | Ausführungsplanung | 25% |
| 6 | Vorbereitung der Vergabe | 10% |
| 7 | Mitwirkung bei der Vergabe | 4% |
| 8 | Objektüberwachung | 32% |
| 9 | Objektbetreuung | 2% |

### Requirements

- When project is created, auto-create all 9 phases (or subset based on template/scope)
- Phase progress bar on project dashboard
- Phase detail view with associated tasks, milestones, deliverables
- Mark phase as complete (validates all mandatory deliverables submitted)
- Phase weights configurable per project (override HOAI defaults)

---

## 2.3 Tasks

### `tasks` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| project_id | uuid | FK -> projects.id |
| phase_id | uuid | FK -> project_phases.id, nullable |
| parent_task_id | uuid | FK -> tasks.id, nullable (subtasks) |
| title | varchar(500) | not null |
| description | text | nullable (rich text) |
| status | enum | 'open','in_progress','review','done','cancelled' |
| priority | enum | 'low','medium','high','urgent' |
| assigned_to | uuid | FK -> users.id, nullable |
| due_date | date | nullable |
| estimated_hours | decimal(8,2) | nullable |
| sort_order | int | for manual ordering |
| created_by | uuid | FK -> users.id |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### `task_dependencies` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| task_id | uuid | FK -> tasks.id (dependent) |
| depends_on_id | uuid | FK -> tasks.id (dependency) |
| type | enum | 'finish_to_start','start_to_start','finish_to_finish','start_to_finish' |

### Requirements

- Task list view with sorting and filtering (status, priority, assignee, phase)
- Task detail view with description editor, comments, file attachments
- Subtask support (one level of nesting)
- Bulk status change (select multiple, change status)
- Drag-and-drop reordering in list view
- Task assignment with notification to assignee
- Due date reminders (notification 1 day before, on due date, overdue)
- Status workflow transitions validated (e.g., can't go from 'open' to 'done' directly)
- Task activity log (who changed what, when)
- Quick-add task (inline create in list view)

---

## 2.4 Milestones

### `milestones` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| project_id | uuid | FK -> projects.id |
| phase_id | uuid | FK -> project_phases.id, nullable |
| name | varchar(255) | not null |
| description | text | nullable |
| due_date | date | not null |
| status | enum | 'pending','submitted','approved','rejected' |
| submitted_by | uuid | FK -> users.id, nullable |
| submitted_at | timestamp | nullable |
| reviewed_by | uuid | FK -> users.id, nullable |
| reviewed_at | timestamp | nullable |
| review_notes | text | nullable |
| created_at | timestamp | default now() |

### Approval Workflow

1. Milestone created with `pending` status
2. Project lead submits milestone (`submitted`) with attached deliverables
3. Reviewer (manager/admin) reviews:
   - **Approve**: status -> `approved`, timestamp recorded
   - **Reject**: status -> `rejected`, reviewer notes required, back to team
4. Rejected milestones can be resubmitted

### Requirements

- Milestone list on project dashboard (timeline view)
- Milestone card with status badge, due date, linked deliverables
- Approval action buttons for authorized users
- Milestone notifications: submitted, approved, rejected, overdue
- Milestone history (submission/review log)

---

## 2.5 Deliverables

### `deliverables` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| project_id | uuid | FK -> projects.id |
| phase_id | uuid | FK -> project_phases.id, nullable |
| milestone_id | uuid | FK -> milestones.id, nullable |
| name | varchar(255) | not null |
| description | text | nullable |
| type | enum | 'document','drawing','model','report','other' |
| status | enum | 'pending','in_progress','submitted','accepted','revision_needed' |
| due_date | date | nullable |
| created_at | timestamp | default now() |

### `deliverable_files` Table (versioned attachments)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| deliverable_id | uuid | FK -> deliverables.id |
| file_id | uuid | FK -> files.id |
| version | int | auto-increment per deliverable |
| uploaded_by | uuid | FK -> users.id |
| notes | text | nullable |
| created_at | timestamp | default now() |

### Requirements

- Deliverable list per project/phase/milestone
- File upload with drag-and-drop
- Version history: upload new version, see all previous versions
- Download specific version
- Status management with transition validation
- Deliverable templates (standard deliverables per phase)

---

## 2.6 Gantt Chart

### Requirements

- Interactive Gantt chart view for project timeline
- Display tasks, milestones, and phases as bars/diamonds
- Dependency arrows between tasks (respecting dependency types)
- Drag to move tasks (update start/end dates)
- Drag to resize tasks (update duration)
- Zoom levels: day, week, month, quarter
- Critical path highlighting
- Today line indicator
- Resource assignment labels on bars
- Group by: phase, assignee, priority
- Auto-scheduling: when a dependency moves, dependents shift accordingly
- Export to PDF/PNG
- Library consideration: use a proven React Gantt library or build custom with canvas

---

## 2.7 Kanban Board

### Requirements

- Kanban view of tasks grouped by status columns
- Columns: Open, In Progress, Review, Done (matching task status enum)
- Drag-and-drop cards between columns (updates task status)
- Card shows: title, assignee avatar, priority badge, due date
- Quick-add card at bottom of each column
- Filter by: assignee, priority, phase
- WIP (work in progress) limits per column (configurable)
- Swimlanes option: group rows by phase or assignee

---

## 2.8 Content Blocks Library

### `content_blocks` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| name | varchar(255) | not null |
| type | enum | 'text','checklist','table','image_text' |
| content | jsonb | structured content |
| category | varchar(100) | nullable, for organization |
| created_by | uuid | FK -> users.id |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### Requirements

- Library of reusable content blocks (company-scoped)
- Block types:
  - **Text**: Rich text (Tiptap) block for standard paragraphs
  - **Checklist**: Named checklist with items
  - **Table**: Structured data table
  - **Image+Text**: Image with caption/description
- Insert block into task description, deliverable, report, etc.
- Edit block in library updates all instances (or snapshot on insert, user choice)
- Search blocks by name/category

---

## 2.9 Activity Feed & Comments

### `activities` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| project_id | uuid | FK -> projects.id, nullable |
| user_id | uuid | FK -> users.id |
| action | varchar(50) | 'created','updated','deleted','commented','status_changed', etc. |
| subject_type | varchar(50) | 'project','task','milestone', etc. |
| subject_id | uuid | |
| metadata | jsonb | { old_value, new_value, field_name, etc. } |
| created_at | timestamp | default now() |

### Requirements

- Project-level activity feed showing all events
- Feed items: "Lars created task 'Foundation design'", "Anna changed status from 'open' to 'in_progress'"
- Filter by: event type, user, date range
- Infinite scroll pagination
- Comments on projects using the polymorphic comments system (Phase 1)
- @mention team members in comments (triggers notification)

---

## 2.10 Project UI Pages

### Routes

- `/app/projects` - Project list (cards or table view toggle)
- `/app/projects/new` - Create project (form or template picker)
- `/app/projects/[slug]` - Project detail with tabs:
  - Overview (dashboard cards, progress, upcoming milestones)
  - Tasks (list view with filters)
  - Kanban (board view)
  - Gantt (timeline view)
  - Milestones
  - Deliverables
  - Phases (HOAI LP overview)
  - Activity (feed + comments)
  - Settings (project settings, members, danger zone)
