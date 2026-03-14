# Phase 3: Cost Planning & Fee Calculation

**Timeline:** Weeks 10-14
**Goal:** DIN 276 cost management, BKI benchmarking, HOAI fee engine, offers, and CRM.

---

## 3.1 DIN 276 Cost Group Hierarchy

### `cost_groups` Table (Reference Data)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| code | varchar(10) | DIN 276 code, e.g. '300', '330', '331' |
| name | varchar(255) | e.g. "Bauwerk - Baukonstruktionen" |
| level | int | 1, 2, or 3 |
| parent_code | varchar(10) | nullable, FK to self |

### `project_cost_items` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| project_id | uuid | FK -> projects.id |
| estimation_id | uuid | FK -> cost_estimations.id |
| cost_group_code | varchar(10) | FK -> cost_groups.code |
| description | text | nullable |
| quantity | decimal(12,3) | nullable |
| unit | varchar(20) | nullable (m2, m3, Stk, psch) |
| unit_cost_cents | bigint | nullable |
| total_cost_cents | bigint | computed or manual |
| source | enum | 'manual','bki','imported' |
| notes | text | nullable |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### DIN 276 Level 1 Groups (seed data)

| Code | Name |
|------|------|
| 100 | Grundstück |
| 200 | Vorbereitende Maßnahmen |
| 300 | Bauwerk - Baukonstruktionen |
| 400 | Bauwerk - Technische Anlagen |
| 500 | Außenanlagen und Freiflächen |
| 600 | Ausstattung und Kunstwerke |
| 700 | Baunebenkosten |

### Requirements

- Full DIN 276 hierarchy seeded (all 3 levels, ~200 entries)
- Tree view UI with expand/collapse
- Editable cost items per group per estimation
- Subtotals at each level (sum of children)
- Grand total (Gesamtkosten) at project level
- Color-coded bars showing cost distribution
- Copy cost structure from another project

---

## 3.2 BKI Reference Data

### `bki_building_types` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| code | varchar(20) | BKI type code |
| name | varchar(255) | e.g. "Mehrfamilienhäuser, mittlerer Standard" |
| category | varchar(100) | e.g. "Wohngebäude", "Bürogebäude" |
| cost_per_m2_cents | bigint | reference cost per m2 BGF |
| cost_per_m3_cents | bigint | reference cost per m3 BRI |
| year | int | reference year |
| standard | enum | 'low','medium','high' |

### `bki_regional_factors` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| bundesland | varchar(50) | e.g. "Bayern", "NRW" |
| kreis | varchar(100) | nullable, for district-level |
| factor | decimal(5,3) | e.g. 1.05, 0.92 |
| year | int | reference year |

### Requirements

- BKI data seeded from reference tables (updateable yearly)
- Building type picker when starting a cost estimation
- Auto-fill cost groups from BKI reference (user can override)
- Regional factor selector (Bundesland/Kreis)
- Adjusted costs = BKI reference * regional factor * area
- BKI cost index year adjustment (Baupreisindex)
- Comparison view: project costs vs. BKI benchmark

---

## 3.3 Cost Estimation Workflows

### `cost_estimations` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| project_id | uuid | FK -> projects.id |
| type | enum | 'kostenrahmen','kostenschaetzung','kostenberechnung','kostenanschlag','kostenfeststellung' |
| version | int | auto-increment per project+type |
| name | varchar(255) | nullable |
| status | enum | 'draft','review','approved','superseded' |
| total_cents | bigint | computed sum |
| area_bgf_m2 | decimal(10,2) | Brutto-Grundfläche |
| area_bri_m3 | decimal(10,2) | Brutto-Rauminhalt |
| area_nuf_m2 | decimal(10,2) | Nutzungsfläche |
| bki_building_type_id | uuid | FK, nullable |
| bki_regional_factor_id | uuid | FK, nullable |
| notes | text | nullable |
| approved_by | uuid | FK -> users.id, nullable |
| approved_at | timestamp | nullable |
| created_by | uuid | FK -> users.id |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### Estimation Types

1. **Kostenrahmen** (Cost Framework)
   - Earliest stage, rough order of magnitude
   - Based on BKI benchmarks * area
   - DIN 276 Level 1 only

2. **Kostenschätzung** (Cost Estimate)
   - LP 2 deliverable
   - DIN 276 Level 1, with some Level 2
   - Based on BKI + project-specific adjustments

3. **Kostenberechnung** (Cost Calculation)
   - LP 3 deliverable
   - DIN 276 Level 2-3 detail
   - Based on element quantities + unit prices

4. **Kostenanschlag** (Cost Tender)
   - LP 7 deliverable
   - Based on actual tender results
   - Links to AVA bid data (Phase 5)

5. **Kostenfeststellung** (Final Cost Determination)
   - LP 8 deliverable
   - Based on actual invoiced amounts
   - Links to contractor invoices

### Requirements

- Create new estimation of any type
- Each type has increasing detail requirements
- Version management: create new version, compare versions
- Version comparison: side-by-side, with delta highlighting
- Approval workflow: submit for review, approve/reject
- Lock approved estimations (no edits)
- Copy estimation to create next type (e.g., Schätzung -> Berechnung)
- PDF export per estimation type (DIN 276 formatted)
- Dashboard chart: cost evolution across estimation types

---

## 3.4 HOAI Fee Calculation Engine

### Domain Logic (`packages/domain/src/hoai/`)

#### Fee Tables

The HOAI 2021 fee tables define minimum and maximum fees for each Honorarzone based on anrechenbare Kosten (eligible costs).

- **Leistungsbild**: Gebäude und Innenräume, Freianlagen, Tragwerksplanung, TGA, etc.
- **Honorarzonen**: I (very low), II (low), III (medium), IV (high), V (very high)
- **Tafelwerte**: tabulated values at defined cost breakpoints
- **Interpolation**: linear interpolation between breakpoints

#### Calculation Steps

1. Determine **anrechenbare Kosten** (eligible costs from DIN 276 groups)
2. Look up base fee from HOAI fee table for the Honorarzone
3. Apply **interpolation** between table breakpoints if needed
4. Multiply by **Leistungsphasen weights** (only contracted phases)
5. Add **Zuschläge** (surcharges): Umbauzuschlag, Wiederholungsfaktor
6. Add **Besondere Leistungen** (special services, individually priced)
7. Add **Nebenkostenpauschale** (ancillary costs, typically 3-5% flat rate or actual)
8. Apply **Mehrwertsteuer** (19% VAT)

#### Functions to Implement

```typescript
// Core calculation
calculateHoaiFee(params: {
  eligibleCosts: number;
  honorarzone: 1 | 2 | 3 | 4 | 5;
  leistungsbild: LeistungsbildType;
  phases: { phase: number; weight: number }[];
  surcharges?: { type: string; percent: number }[];
  specialServices?: { name: string; amount: number }[];
  ancillaryCostPercent?: number;
  vatPercent?: number;
}): HoaiFeeResult

// Interpolation between zone boundaries
interpolateHonorar(
  eligibleCosts: number,
  zone: number,
  position: 'min' | 'max' | number // 0-1 within zone
): number

// Table lookup
lookupFeeTableValue(
  leistungsbild: LeistungsbildType,
  eligibleCosts: number,
  zone: number
): { min: number; max: number }
```

### Requirements

- Pure functions, no side effects, 100% unit tested
- HOAI 2021 fee table data as constants
- Support all Leistungsbilder:
  - Gebäude und Innenräume (§34)
  - Freianlagen (§39)
  - Ingenieurbauwerke (§43)
  - Verkehrsanlagen (§47)
  - Tragwerksplanung (§51)
  - Technische Ausrüstung (§55)
- Handle edge cases: costs below table minimum, above maximum
- Rounding rules per HOAI specification

---

## 3.5 HOAI Offers

### `hoai_offers` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| project_id | uuid | FK -> projects.id |
| company_id | uuid | FK -> companies.id |
| client_org_id | uuid | FK -> organizations.id |
| offer_number | varchar(50) | company-scoped sequential |
| version | int | versioning |
| status | enum | 'draft','sent','accepted','rejected','expired' |
| title | varchar(255) | not null |
| leistungsbild | enum | HOAI Leistungsbild type |
| honorarzone | int | 1-5 |
| zone_position | decimal(3,2) | 0.00-1.00 within zone |
| eligible_costs_cents | bigint | anrechenbare Kosten |
| total_fee_cents | bigint | computed total |
| vat_percent | decimal(5,2) | default 19.00 |
| vat_amount_cents | bigint | computed |
| grand_total_cents | bigint | fee + VAT |
| ancillary_cost_type | enum | 'percent','actual' |
| ancillary_cost_percent | decimal(5,2) | nullable |
| ancillary_cost_cents | bigint | nullable |
| valid_until | date | nullable |
| notes | text | nullable |
| created_by | uuid | FK -> users.id |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### `hoai_offer_phases` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| offer_id | uuid | FK -> hoai_offers.id |
| phase_number | int | 1-9 |
| weight_percent | decimal(5,2) | HOAI default or custom |
| included | boolean | whether this phase is in scope |
| fee_cents | bigint | computed from weight * base fee |

### `hoai_offer_groups` Table (for grouping positions)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| offer_id | uuid | FK -> hoai_offers.id |
| name | varchar(255) | e.g. "Grundleistungen", "Besondere Leistungen" |
| sort_order | int | |

### `hoai_offer_positions` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| offer_id | uuid | FK -> hoai_offers.id |
| group_id | uuid | FK -> hoai_offer_groups.id |
| position_number | varchar(20) | e.g. "1.1", "2.3" |
| description | text | not null |
| amount_cents | bigint | not null |
| type | enum | 'grundleistung','besondere_leistung','nebenkosten' |
| sort_order | int | |

### Requirements

- Offer builder wizard:
  1. Select client organization
  2. Set eligible costs and Honorarzone
  3. Select Leistungsphasen (toggle each LP on/off)
  4. Add Besondere Leistungen (free-form or from catalog)
  5. Set Nebenkosten type and rate
  6. Review and adjust
- Auto-calculate all fees using domain engine
- Manual override option (with warning indicator)
- Version management: create new version from existing
- Status workflow: draft -> sent -> accepted/rejected/expired
- PDF export:
  - Company letterhead
  - Client address block
  - Offer summary
  - Phase breakdown table
  - Position details
  - Terms and conditions
  - Signature block
- Email offer directly from system (or download PDF)
- Offer comparison (across versions)

---

## 3.6 CRM: Organizations & Contacts

### `organizations` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| name | varchar(255) | not null |
| type | enum | 'client','contractor','partner','authority','other' |
| industry | varchar(100) | nullable |
| address_line1 | varchar(255) | nullable |
| address_line2 | varchar(255) | nullable |
| zip | varchar(20) | nullable |
| city | varchar(100) | nullable |
| country | varchar(2) | default 'DE' |
| phone | varchar(50) | nullable |
| email | varchar(255) | nullable |
| website | text | nullable |
| tax_id | varchar(50) | nullable |
| notes | text | nullable |
| created_by | uuid | FK -> users.id |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### `contacts` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| organization_id | uuid | FK -> organizations.id, nullable |
| first_name | varchar(100) | not null |
| last_name | varchar(100) | not null |
| title | varchar(50) | nullable (Dr., Prof., etc.) |
| position | varchar(100) | nullable (job title) |
| email | varchar(255) | nullable |
| phone | varchar(50) | nullable |
| mobile | varchar(50) | nullable |
| notes | text | nullable |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### `crm_activities` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| organization_id | uuid | FK -> organizations.id, nullable |
| contact_id | uuid | FK -> contacts.id, nullable |
| user_id | uuid | FK -> users.id |
| type | enum | 'call','email','meeting','note','task' |
| subject | varchar(255) | not null |
| body | text | nullable |
| date | timestamp | not null |
| created_at | timestamp | default now() |

### Requirements

- Organization list with type filter tabs (All, Clients, Contractors, Partners)
- Organization detail page: info, contacts, linked projects, activity timeline
- Contact list (global and per-organization)
- Contact detail page: info, organization, activity
- Activity logging: quick-add call/email/meeting note
- Search across organizations and contacts (name, city, type)
- Link organization to project as client
- Import organizations from CSV
- Merge duplicate organizations

---

## 3.7 UI Pages (Phase 3)

### Routes

- `/app/projects/[slug]/costs` - Cost management tab
  - `/estimations` - List of estimations
  - `/estimations/[id]` - Estimation detail (DIN 276 tree)
  - `/estimations/[id]/compare/[otherId]` - Version comparison
- `/app/projects/[slug]/offers` - HOAI offers
  - `/new` - Offer builder wizard
  - `/[id]` - Offer detail
  - `/[id]/pdf` - PDF preview
- `/app/crm` - CRM section
  - `/organizations` - Organization list
  - `/organizations/[id]` - Organization detail
  - `/contacts` - Contact list
  - `/contacts/[id]` - Contact detail
