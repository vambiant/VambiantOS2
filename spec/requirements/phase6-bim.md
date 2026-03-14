# Phase 6: BIM, Documents & Reports

**Timeline:** Weeks 26-31
**Goal:** IFC/BIM viewing and data extraction, room book management, permits, AI-assisted reports, and variant comparison.

---

## 6.1 IFC File Upload & 3D Viewing

### `bim_models` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| project_id | uuid | FK -> projects.id |
| name | varchar(255) | not null |
| description | text | nullable |
| file_id | uuid | FK -> files.id |
| ifc_version | varchar(20) | detected: IFC2x3, IFC4, IFC4.3 |
| status | enum | 'uploading','processing','ready','error' |
| element_count | int | nullable, populated after processing |
| metadata | jsonb | extracted IFC header info |
| uploaded_by | uuid | FK -> users.id |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### `bim_elements` Table (extracted from IFC)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| model_id | uuid | FK -> bim_models.id |
| ifc_guid | varchar(64) | IFC GlobalId |
| ifc_type | varchar(100) | e.g. IfcWall, IfcDoor, IfcSpace |
| name | varchar(500) | nullable |
| description | text | nullable |
| storey | varchar(100) | nullable (building storey name) |
| properties | jsonb | all IFC property sets |
| quantities | jsonb | IFC quantity sets (area, volume, etc.) |
| parent_guid | varchar(64) | nullable, spatial parent |
| created_at | timestamp | default now() |

### `bim_annotations` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| model_id | uuid | FK -> bim_models.id |
| element_guid | varchar(64) | nullable (annotation on element) |
| user_id | uuid | FK -> users.id |
| type | enum | 'note','issue','measurement','photo' |
| title | varchar(255) | not null |
| body | text | nullable |
| camera_position | jsonb | { eye, look, up } for viewer state |
| status | enum | 'open','resolved','closed' |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### xeokit Integration

- Use `@xeokit/xeokit-sdk` for WebGL-based IFC viewing
- Server-side IFC to XKT conversion (using `xeokit-convert` or `ifc-to-cityjson`)
- XKT files stored alongside original IFC
- Processing pipeline (Inngest background job):
  1. Upload IFC file to S3
  2. Trigger conversion job
  3. Parse IFC for element data (populate `bim_elements`)
  4. Generate XKT for fast browser viewing
  5. Update model status to 'ready'

### 3D Viewer Requirements

- Load and render XKT model in browser
- Navigation: orbit, pan, zoom, first-person walk
- Element tree panel (spatial hierarchy: Site > Building > Storey > Space/Element)
- Click element to select and highlight
- Properties panel: show all IFC properties of selected element
- Section planes (X, Y, Z axis clipping)
- Measurement tools (distance, area)
- Transparency/X-ray mode
- Storey isolation (show single floor)
- Element type filtering (show/hide walls, doors, windows, etc.)
- Saved viewpoints (camera + visibility state)
- Annotation placement on elements
- Screenshot capture from viewer
- Multiple model overlay (e.g., architecture + structure)
- Performance: handle models with 100k+ elements

---

## 6.2 Raumbuch (Room Book)

### `room_book_entries` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| project_id | uuid | FK -> projects.id |
| model_id | uuid | FK -> bim_models.id, nullable |
| element_guid | varchar(64) | FK -> bim_elements.ifc_guid, nullable (link to IfcSpace) |
| room_number | varchar(50) | not null |
| room_name | varchar(255) | not null |
| storey | varchar(100) | nullable |
| area_m2 | decimal(10,2) | nullable |
| height_m | decimal(6,2) | nullable |
| volume_m3 | decimal(10,2) | nullable |
| usage_type | varchar(100) | nullable (e.g. "Büro", "Flur", "WC") |
| occupancy | int | nullable (number of people) |
| status | enum | 'draft','reviewed','approved' |
| notes | text | nullable |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### `room_book_finishes` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| room_id | uuid | FK -> room_book_entries.id |
| surface | enum | 'floor','wall','ceiling' |
| material | varchar(255) | e.g. "Parkett Eiche", "Raufasertapete" |
| color | varchar(100) | nullable |
| area_m2 | decimal(10,2) | nullable |
| specification | text | nullable |
| sort_order | int | |

### `room_book_equipment` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| room_id | uuid | FK -> room_book_entries.id |
| name | varchar(255) | not null |
| category | varchar(100) | e.g. "Beleuchtung", "Sanitär", "Elektro" |
| quantity | int | default 1 |
| specification | text | nullable |
| sort_order | int | |

### Requirements

- Auto-generate room book from IFC model (extract IfcSpace elements)
- Manual room book creation (without BIM)
- Room list view: sortable table with storey, number, name, area, type
- Room detail view:
  - Basic info (number, name, area, height, volume, usage)
  - Finishes tab: floor, wall, ceiling materials per room
  - Equipment tab: fixtures, fittings, technical equipment
  - BIM link: click to highlight room in 3D viewer
  - Photos/attachments
- Bulk edit: change finish material for multiple rooms
- Room book templates: standard finish sets per room type
- Room book export:
  - Excel export (full room book as spreadsheet)
  - PDF export (formatted room-by-room sheets)
- Room book comparison: compare two versions/states
- Link room book entries to cost estimation (DIN 276 mapping)

---

## 6.3 Permit Planning (Baugenehmigung)

### `permits` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| project_id | uuid | FK -> projects.id |
| type | enum | 'bauantrag','bauvoranfrage','nutzungsaenderung','abbruch','denkmalschutz','other' |
| authority_org_id | uuid | FK -> organizations.id (Bauamt) |
| reference_number | varchar(100) | nullable (Aktenzeichen) |
| status | enum | 'preparing','submitted','in_review','approved','rejected','withdrawn','conditions' |
| submitted_date | date | nullable |
| expected_decision_date | date | nullable |
| decision_date | date | nullable |
| conditions | text | nullable (Auflagen/Nebenbestimmungen) |
| notes | text | nullable |
| created_by | uuid | FK -> users.id |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### `permit_documents` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| permit_id | uuid | FK -> permits.id |
| file_id | uuid | FK -> files.id |
| document_type | enum | 'application_form','site_plan','floor_plans','sections','elevations','structural_report','fire_protection','energy_certificate','other' |
| name | varchar(255) | not null |
| status | enum | 'draft','ready','submitted','returned' |
| submitted_at | timestamp | nullable |
| notes | text | nullable |

### `permit_timeline_events` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| permit_id | uuid | FK -> permits.id |
| date | date | not null |
| event_type | varchar(100) | e.g. "Eingereicht", "Nachforderung", "Genehmigt" |
| description | text | nullable |
| created_by | uuid | FK -> users.id |
| created_at | timestamp | default now() |

### Requirements

- Permit tracking per project
- Required document checklist (per permit type)
- Document upload with status tracking
- Timeline view of permit progress
- Deadline tracking and reminders
- Link to authority organization (from CRM)
- Permit status on project dashboard
- Common permit types for German construction:
  - Bauantrag (building permit application)
  - Bauvoranfrage (preliminary building inquiry)
  - Nutzungsänderung (change of use)
  - Abbruchgenehmigung (demolition permit)
  - Denkmalschutz (heritage protection)

---

## 6.4 Explanatory Reports (Erläuterungsbericht)

### `reports` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| project_id | uuid | FK -> projects.id |
| type | enum | 'erlaeuterungsbericht','bauvorlage','machbarkeitsstudie','gutachten','other' |
| title | varchar(255) | not null |
| version | int | default 1 |
| status | enum | 'draft','review','approved','published' |
| created_by | uuid | FK -> users.id |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### `report_sections` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| report_id | uuid | FK -> reports.id |
| parent_id | uuid | FK -> report_sections.id, nullable |
| number | varchar(20) | hierarchical (e.g. "1", "1.1", "1.1.1") |
| title | varchar(255) | not null |
| body | text | rich text (Tiptap) |
| sort_order | int | |
| ai_generated | boolean | default false |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### Report Templates

Standard Erläuterungsbericht sections:
1. Aufgabenstellung (Task Description)
2. Grundstück und Umgebung (Site and Surroundings)
3. Städtebauliche Einbindung (Urban Integration)
4. Entwurfskonzept (Design Concept)
5. Konstruktion und Materialien (Construction and Materials)
6. Technische Gebäudeausrüstung (Building Services)
7. Brandschutzkonzept (Fire Protection Concept)
8. Energiekonzept (Energy Concept)
9. Barrierefreiheit (Accessibility)
10. Außenanlagen (Landscaping)
11. Kosten und Termine (Costs and Schedule)

### AI-Assisted Generation

- Section drafting: given project data (type, scope, BIM data), generate initial draft
- Input context for AI:
  - Project metadata (type, scope, location, size)
  - BIM quantities (areas, volumes, element counts)
  - Cost estimation data
  - Room book data
- AI provider: configurable (OpenAI, Anthropic, or local)
- Human review required: AI-generated sections marked, must be approved
- Section-by-section generation (not whole report at once)
- Tone and style: formal German architectural/engineering language
- Regenerate option with adjusted instructions

### Requirements

- Report builder with section tree
- Tiptap rich text editor per section
- Drag-and-drop section reordering
- Insert images, tables, and references
- AI generation button per section
- Version management (create new version, compare)
- Approval workflow: draft -> review -> approved -> published
- Report PDF export:
  - Cover page with project info
  - Table of contents (auto-generated)
  - Section content with proper headings
  - Image integration
  - Page numbers and headers
  - Company branding

---

## 6.5 Variant Comparison

### `variants` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| project_id | uuid | FK -> projects.id |
| name | varchar(255) | not null (e.g. "Variante A - Massivbau") |
| description | text | nullable |
| status | enum | 'draft','evaluated','selected','discarded' |
| created_by | uuid | FK -> users.id |
| created_at | timestamp | default now() |

### `variant_criteria` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| project_id | uuid | FK -> projects.id |
| name | varchar(255) | not null (e.g. "Baukosten", "Bauzeit", "Nachhaltigkeit") |
| weight | decimal(5,2) | weighting factor (all weights sum to 100) |
| unit | varchar(50) | nullable (EUR, Monate, Punkte) |
| direction | enum | 'lower_better','higher_better' |
| sort_order | int | |

### `variant_scores` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| variant_id | uuid | FK -> variants.id |
| criterion_id | uuid | FK -> variant_criteria.id |
| raw_value | decimal(12,2) | the actual value |
| score | decimal(5,2) | normalized score (0-10) |
| notes | text | nullable |

### Requirements

- Define comparison criteria with weights
- Create variants with descriptions
- Score each variant against each criterion
- Scoring matrix view (variants as columns, criteria as rows)
- Auto-normalize scores based on direction (lower/higher is better)
- Weighted total score calculation
- Visual comparison:
  - Radar/spider chart (all criteria, all variants)
  - Bar chart (weighted scores)
  - Side-by-side detail cards
- Link variants to:
  - Cost estimations (different cost scenarios)
  - BIM models (different design options)
  - Images/renderings
- Variant recommendation (highest weighted score)
- Comparison report PDF export
- Decision documentation (why variant X was selected)

---

## 6.6 Document Management

### `folders` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| project_id | uuid | FK -> projects.id |
| parent_id | uuid | FK -> folders.id, nullable |
| name | varchar(255) | not null |
| sort_order | int | |
| created_by | uuid | FK -> users.id |
| created_at | timestamp | default now() |

### `document_tags` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| name | varchar(100) | not null |
| color | varchar(7) | hex color |

### `file_tags` Table (pivot)

| Column | Type | Notes |
|--------|------|-------|
| file_id | uuid | FK -> files.id |
| tag_id | uuid | FK -> document_tags.id |
| PK(file_id, tag_id) | | |

### Requirements

- Folder tree per project (create, rename, move, delete)
- Default folder structure per project template:
  - 01 Grundlagen
  - 02 Entwurf
  - 03 Genehmigung
  - 04 Ausführung
  - 05 Vergabe
  - 06 Bauüberwachung
  - 07 Abrechnung
  - 08 Protokolle
  - 09 Korrespondenz
- File upload to folders (drag-and-drop, multi-file)
- File metadata: name, type, size, uploaded by, date, tags
- File preview (PDF, images inline; DWG/IFC links to viewers)
- File versioning (upload new version, track history)
- Tag system for cross-cutting categorization
- Search files by name, tag, type, date, folder
- Bulk operations: move, tag, download as ZIP
- Recent files widget on project dashboard
- Storage usage tracking per company

---

## 6.7 UI Pages (Phase 6)

### Routes

- `/app/projects/[slug]/bim` - BIM model list
  - `/[id]` - 3D viewer with panels
  - `/upload` - Upload IFC file
- `/app/projects/[slug]/rooms` - Room book
  - `/[id]` - Room detail
  - `/import` - Import from BIM
- `/app/projects/[slug]/permits` - Permits list
  - `/[id]` - Permit detail + timeline
- `/app/projects/[slug]/reports` - Reports list
  - `/[id]` - Report editor
  - `/[id]/pdf` - PDF preview
- `/app/projects/[slug]/variants` - Variant comparison
  - `/setup` - Define criteria
  - `/compare` - Scoring matrix + charts
- `/app/projects/[slug]/documents` - Document management
  - Folder tree + file list view
