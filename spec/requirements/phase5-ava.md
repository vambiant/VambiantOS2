# Phase 5: AVA System

**Timeline:** Weeks 20-25
**Goal:** Complete Ausschreibung, Vergabe, Abrechnung (Tendering, Awarding, Settlement) system with GAEB integration.

---

## 5.1 Leistungsverzeichnis (LV) Structure

### `lv_projects` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| project_id | uuid | FK -> projects.id |
| name | varchar(255) | not null |
| description | text | nullable |
| status | enum | 'draft','published','awarded','in_progress','completed' |
| currency | varchar(3) | default 'EUR' |
| created_by | uuid | FK -> users.id |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### `lv_groups` Table (Hierarchical: Los > Titel > Untertitel)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| lv_project_id | uuid | FK -> lv_projects.id |
| parent_id | uuid | FK -> lv_groups.id, nullable |
| level | enum | 'los','titel','untertitel' |
| number | varchar(20) | hierarchical (e.g. "01", "01.001") |
| name | varchar(500) | not null |
| description | text | nullable |
| sort_order | int | |
| created_at | timestamp | default now() |

### `lv_positions` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| lv_project_id | uuid | FK -> lv_projects.id |
| group_id | uuid | FK -> lv_groups.id |
| position_number | varchar(20) | e.g. "01.001.0010" |
| type | enum | 'normal','bedarfs','alternativ','eventual','zulage','pauschal' |
| short_text | varchar(500) | not null (Kurztext) |
| long_text | text | nullable (Langtext, detailed specification) |
| quantity | decimal(12,3) | not null |
| unit | varchar(20) | not null (Stk, m, m2, m3, kg, t, psch, h, etc.) |
| unit_price_cents | bigint | nullable (filled during bidding) |
| total_cents | bigint | computed: quantity * unit_price |
| cost_group_code | varchar(10) | FK -> cost_groups.code, nullable (DIN 276 link) |
| sort_order | int | |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### Position Types

| Type | German | Description |
|------|--------|-------------|
| `normal` | Normalposition | Standard billable position |
| `bedarfs` | Bedarfsposition | Optional, only if needed (not in total) |
| `alternativ` | Alternativposition | Alternative to another position (not in total) |
| `eventual` | Eventualposition | Contingency (not in total unless activated) |
| `zulage` | Zulagenposition | Surcharge on another position |
| `pauschal` | Pauschalposition | Lump sum position |

### Requirements

- LV project container per project (can have multiple LVs per project)
- Hierarchical tree editor:
  - Los (lot) as top level
  - Titel (title/section) under Los
  - Untertitel (subsection) under Titel (optional)
  - Positionen (items) at leaf level
- Tree navigation with expand/collapse
- Inline editing of position details
- Position detail panel (slide-out or side panel):
  - Short text (Kurztext)
  - Long text (Langtext) with rich text editor
  - Quantity and unit
  - Position type selector
  - DIN 276 cost group assignment
- Drag-and-drop reordering within groups
- Auto-numbering (OZ - Ordnungszahl) following GAEB conventions
- Subtotals at each group level
- Grand total (excluding Bedarfs/Alternativ/Eventual positions)
- Copy group/position within LV or from another LV
- Position library: save frequently used positions for reuse
- Search positions by text or number
- Bulk operations: delete multiple, move to different group

---

## 5.2 GAEB Import/Export

### GAEB Formats

| Format | Name | Purpose |
|--------|------|---------|
| DA81 | Leistungsbeschreibung | LV structure without prices (for tendering) |
| DA83 | Angebotsaufforderung | LV sent to bidders |
| DA84 | Angebotsdaten | Bid response with prices filled in |
| DA85 | Auftragsdaten | Award/contract data |
| DA86 | Abrechnungsdaten | Settlement/billing data |

### GAEB XML Schema (P83/P84)

Modern GAEB exchange uses XML format. Key elements:
- `GAEBInfo` - metadata (version, date, parties)
- `Award` - project/lot info
- `BoQ` (Bill of Quantities) - the LV structure
  - `BoQBody` > `BoQCtgy` (categories/groups)
    - `BoQBody` > `Itemlist` > `Item` (positions)

### Import Requirements

- **DA81 Import**: Parse LV structure (groups + positions without prices)
  - Map GAEB hierarchy to lv_groups and lv_positions
  - Preserve OZ numbering
  - Import Kurztext and Langtext
  - Handle all position types
- **DA84 Import**: Parse bid responses
  - Match positions by OZ
  - Import unit prices
  - Validate structure matches published LV
  - Handle bid variants

### Export Requirements

- **DA83 Export**: Generate LV for bidding
  - Full LV structure with Kurztext and Langtext
  - No prices (blank for bidder to fill)
  - GAEB XML P83 compliant
  - Include metadata (project, lot, deadline)
- **DA81 Export**: LV structure export
- **DA84 Export**: Bid data export (for internal records)

### Technical Approach

- Use or build GAEB XML parser (`packages/domain/src/gaeb/`)
- Validate against GAEB XML schema
- Character encoding: UTF-8 (modern) with ISO-8859-1 fallback
- Handle GAEB 90 (legacy text format) import as bonus
- Unit testing with sample GAEB files

---

## 5.3 Bidding (Angebotsphase)

### `bid_rounds` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| lv_project_id | uuid | FK -> lv_projects.id |
| round_number | int | 1, 2, etc. |
| status | enum | 'open','closed','evaluated' |
| deadline | timestamp | submission deadline |
| notes | text | nullable |
| created_at | timestamp | default now() |

### `bidders` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| bid_round_id | uuid | FK -> bid_rounds.id |
| organization_id | uuid | FK -> organizations.id |
| contact_id | uuid | FK -> contacts.id, nullable |
| status | enum | 'invited','declined','submitted','evaluated','awarded','rejected' |
| invited_at | timestamp | default now() |
| submitted_at | timestamp | nullable |
| notes | text | nullable |

### `bid_prices` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| bidder_id | uuid | FK -> bidders.id |
| position_id | uuid | FK -> lv_positions.id |
| unit_price_cents | bigint | not null |
| total_cents | bigint | computed: position quantity * unit_price |
| notes | text | nullable |

### Requirements

- Create bid round for an LV project
- Invite bidders (select from CRM organizations)
- Export GAEB DA83 for each bidder (or bulk)
- Manual bid entry: spreadsheet-like UI
  - Columns: OZ, Kurztext, Menge, Einheit, EP (Einheitspreis), GP (Gesamtpreis)
  - Tab navigation between EP cells
  - Auto-calculate GP from quantity * EP
  - Color-coded validation (missing prices, unusually high/low)
- Import bid from GAEB DA84
- Bid summary per bidder: total, completion %, anomalies

---

## 5.4 Preisspiegel (Price Mirror)

### Requirements

- Comparison matrix view:
  - Rows: LV positions (grouped by Titel)
  - Columns: bidders
  - Cells: unit price (EP) and total price (GP)
- Highlighting:
  - Lowest price per position: green
  - Highest price per position: red
  - Missing prices: yellow
  - Significantly deviating prices: orange (>20% from median)
- Summary row per group (subtotals per bidder)
- Grand total row per bidder
- Ranking: bidders sorted by total price
- Statistical analysis per position: median, average, standard deviation
- Filter: show only specific groups/Lose
- Preisspiegel PDF export:
  - Landscape format
  - Position details + all bidder prices
  - Highlighting preserved
  - Summary page with ranking
- Preisspiegel Excel export (for further analysis)

---

## 5.5 Award Decision (Vergabe)

### `awards` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| lv_project_id | uuid | FK -> lv_projects.id |
| group_id | uuid | FK -> lv_groups.id (Los/Titel level) |
| bidder_id | uuid | FK -> bidders.id |
| status | enum | 'proposed','approved','contracted','cancelled' |
| award_amount_cents | bigint | not null |
| justification | text | nullable |
| proposed_by | uuid | FK -> users.id |
| approved_by | uuid | FK -> users.id, nullable |
| approved_at | timestamp | nullable |
| created_at | timestamp | default now() |

### Requirements

- Propose award per Los/Titel (select winning bidder)
- Award justification (why this bidder, not just cheapest)
- Award approval workflow (propose -> approve)
- Generate award letter (Zuschlagsschreiben)
- Generate rejection letters (Absageschreiben) for other bidders
- Award summary: which contractor gets which lot, total awarded value
- Link award to contract creation (Phase 4)
- Vergabevorschlag (award proposal) PDF
- Track contractor per awarded lot/section

---

## 5.6 Aufmaß & Abrechnung (Measurements & Settlement)

### `aufmass_sheets` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| lv_project_id | uuid | FK -> lv_projects.id |
| award_id | uuid | FK -> awards.id |
| sheet_number | int | sequential |
| name | varchar(255) | nullable |
| date | date | not null |
| status | enum | 'draft','submitted','checked','approved' |
| submitted_by | uuid | FK -> users.id, nullable |
| checked_by | uuid | FK -> users.id, nullable |
| approved_by | uuid | FK -> users.id, nullable |
| notes | text | nullable |
| created_at | timestamp | default now() |

### `aufmass_entries` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| sheet_id | uuid | FK -> aufmass_sheets.id |
| position_id | uuid | FK -> lv_positions.id |
| description | text | measurement description (e.g. "Wand Achse A, EG") |
| formula | varchar(500) | calculation formula (e.g. "3.50 * 2.80 * 2") |
| quantity | decimal(12,3) | computed result of formula |
| sort_order | int | |
| created_at | timestamp | default now() |

### Cumulative Accounting (Kumulierte Abrechnung)

### `settlement_periods` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| lv_project_id | uuid | FK -> lv_projects.id |
| award_id | uuid | FK -> awards.id |
| period_number | int | sequential (Abschlagsrechnung number) |
| date | date | not null |
| status | enum | 'draft','submitted','checked','approved','paid' |
| notes | text | nullable |
| created_at | timestamp | default now() |

### `settlement_items` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| period_id | uuid | FK -> settlement_periods.id |
| position_id | uuid | FK -> lv_positions.id |
| cumulative_quantity | decimal(12,3) | total measured to date |
| previous_quantity | decimal(12,3) | measured in previous periods |
| current_quantity | decimal(12,3) | computed: cumulative - previous |
| unit_price_cents | bigint | from award |
| cumulative_amount_cents | bigint | cumulative_qty * unit_price |
| previous_amount_cents | bigint | previous_qty * unit_price |
| current_amount_cents | bigint | current_qty * unit_price |

### Requirements

#### Aufmaß

- Create Aufmaß sheets per contractor/lot
- Entry per position: describe what was measured, enter formula
- Formula parser: support basic arithmetic (length * width * height * count)
- Multiple entries per position (different locations/rooms)
- Sum entries per position for total measured quantity
- Aufmaß approval workflow: draft -> submitted -> checked -> approved
- Link Aufmaß to settlement period
- Aufmaß PDF export (standard German format)

#### Cumulative Accounting

- Create settlement period (Abschlagsrechnung)
- Auto-populate positions from award
- Enter cumulative quantities from approved Aufmaß
- System calculates:
  - Previous period quantities (from last settlement)
  - Current period quantities (cumulative - previous)
  - Amounts: quantity * awarded unit price
  - Period total: sum of current amounts
  - Cumulative total: sum of cumulative amounts
- Deductions: Sicherheitseinbehalt (retention, typically 5%)
- Skonto (cash discount) tracking
- Payment certificate generation (Zahlungsfreigabe)
- Settlement overview: progress per position (% of LV quantity)
- Final settlement (Schlussrechnung): last period, all quantities finalized

---

## 5.7 AVA Dashboard

### Requirements

- LV project overview cards:
  - Status, total value, positions count
  - Progress bar (measured vs. contracted quantities)
- Bid round status summary
- Active awards with contractor info
- Outstanding settlement periods
- Cost tracking: awarded vs. settled vs. paid
- Overdue items (unpaid settlements, open Aufmaß)

---

## 5.8 UI Pages (Phase 5)

### Routes

- `/app/projects/[slug]/ava` - AVA overview dashboard
- `/app/projects/[slug]/ava/lv` - LV list
  - `/[id]` - LV editor (tree + position detail)
  - `/[id]/import` - GAEB import
  - `/[id]/export` - GAEB export options
- `/app/projects/[slug]/ava/bidding` - Bid rounds
  - `/[roundId]` - Bid round detail
  - `/[roundId]/entry/[bidderId]` - Bid entry spreadsheet
  - `/[roundId]/preisspiegel` - Price mirror comparison
- `/app/projects/[slug]/ava/awards` - Awards list
  - `/[id]` - Award detail
- `/app/projects/[slug]/ava/aufmass` - Aufmaß sheets
  - `/[id]` - Aufmaß sheet editor
- `/app/projects/[slug]/ava/settlement` - Settlement periods
  - `/[id]` - Settlement detail (cumulative view)
