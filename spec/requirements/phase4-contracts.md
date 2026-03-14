# Phase 4: Contracts, Invoices & Communication

**Timeline:** Weeks 15-19
**Goal:** Contract management from accepted offers, invoice generation, change orders, meeting protocols, correspondence, and questionnaires.

---

## 4.1 Contracts

### `contracts` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| project_id | uuid | FK -> projects.id |
| offer_id | uuid | FK -> hoai_offers.id |
| client_org_id | uuid | FK -> organizations.id |
| contract_number | varchar(50) | company-scoped sequential |
| title | varchar(255) | not null |
| status | enum | 'draft','active','completed','terminated','disputed' |
| signed_date | date | nullable |
| start_date | date | nullable |
| end_date | date | nullable |
| total_value_cents | bigint | from offer grand total |
| invoiced_cents | bigint | running total of invoiced amounts |
| paid_cents | bigint | running total of received payments |
| payment_terms_days | int | default 30 |
| notes | text | nullable |
| signed_document_file_id | uuid | FK -> files.id, nullable |
| created_by | uuid | FK -> users.id |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### Requirements

- Create contract from accepted HOAI offer (auto-populate fields)
- Contract detail page:
  - Overview: key data, status, linked offer
  - Financial summary: total value, invoiced, paid, remaining
  - Phase progress: which HOAI phases are complete
  - Invoices tab: all invoices for this contract
  - Change orders tab: amendments to the contract
  - Documents tab: signed contract, amendments, correspondence
- Contract status transitions with audit trail
- Contract list page with filters (status, project, client)
- Contract PDF generation (from offer data + contract terms)
- Contract dashboard widget (active contracts, total value)

---

## 4.2 Invoices

### `invoices` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| project_id | uuid | FK -> projects.id |
| contract_id | uuid | FK -> contracts.id |
| client_org_id | uuid | FK -> organizations.id |
| invoice_number | varchar(50) | company-scoped sequential (format: RE-2026-001) |
| type | enum | 'partial','final','credit_note' |
| status | enum | 'draft','sent','paid','overdue','cancelled','credited' |
| issue_date | date | not null |
| due_date | date | computed from issue_date + payment_terms |
| subtotal_cents | bigint | sum of line items |
| vat_percent | decimal(5,2) | default 19.00 |
| vat_amount_cents | bigint | computed |
| total_cents | bigint | subtotal + VAT |
| paid_amount_cents | bigint | default 0 |
| paid_at | date | nullable |
| payment_reference | varchar(100) | nullable |
| notes | text | nullable, appears on invoice |
| internal_notes | text | nullable, not on PDF |
| sent_at | timestamp | nullable |
| reminded_at | timestamp | nullable (last reminder date) |
| created_by | uuid | FK -> users.id |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### `invoice_line_items` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| invoice_id | uuid | FK -> invoices.id |
| description | text | not null |
| phase_number | int | nullable (if billing by HOAI phase) |
| quantity | decimal(10,3) | default 1 |
| unit | varchar(20) | default 'psch' |
| unit_price_cents | bigint | not null |
| total_cents | bigint | quantity * unit_price |
| sort_order | int | |

### Partial Invoicing by HOAI Phase

- When creating a partial invoice, select which HOAI phase(s) to bill
- System calculates billable amount: phase weight % * contract total
- Deduct previously invoiced amounts for the same phase
- Running total tracking: how much of each phase has been invoiced
- Prevent over-billing (warn if invoice exceeds remaining phase amount)

### Invoice PDF Requirements (German Compliance)

Must include (Pflichtangaben gemäß §14 UStG):
- Seller: company name, address, tax ID (USt-IdNr. or Steuernummer)
- Buyer: client organization name and address
- Invoice number (unique, sequential)
- Invoice date
- Delivery/service date or period
- Line items with description, quantity, unit price, total
- Net amount, VAT rate, VAT amount, gross total
- Payment terms and bank details
- Company registration info (Handelsregisternummer if applicable)

### Requirements

- Invoice creation wizard:
  1. Select contract
  2. Choose type (partial/final)
  3. Select phases to bill (for partial)
  4. Review/edit line items
  5. Add notes
  6. Preview PDF
- Invoice list with filters (status, project, client, date range)
- Invoice detail view with PDF preview
- Mark as sent (records sent_at timestamp)
- Mark as paid (records payment date and reference)
- Send payment reminder (email)
- Overdue detection (daily job via Inngest)
- Credit note creation (linked to original invoice)
- Invoice dashboard: monthly revenue, outstanding, overdue amounts

---

## 4.3 Change Orders (Nachträge)

### `change_orders` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| contract_id | uuid | FK -> contracts.id |
| change_order_number | varchar(50) | sequential per contract (NT-001) |
| title | varchar(255) | not null |
| description | text | not null |
| reason | enum | 'scope_change','client_request','regulatory','unforeseen','other' |
| status | enum | 'draft','submitted','approved','rejected','withdrawn' |
| amount_cents | bigint | impact on contract value (can be negative) |
| submitted_at | timestamp | nullable |
| approved_by | uuid | FK -> users.id, nullable |
| approved_at | timestamp | nullable |
| notes | text | nullable |
| created_by | uuid | FK -> users.id |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### Requirements

- Create change order from contract detail page
- Change order form: title, description, reason, financial impact
- Approval workflow: draft -> submitted -> approved/rejected
- Approved change orders update contract total value
- Change order history on contract detail
- Change order PDF (for client approval signature)
- Impact summary: original contract value, total changes, current value

---

## 4.4 Meeting Protocols

### `meetings` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| project_id | uuid | FK -> projects.id |
| meeting_number | int | sequential per project |
| title | varchar(255) | not null |
| date | date | not null |
| start_time | time | nullable |
| end_time | time | nullable |
| location | varchar(255) | nullable |
| status | enum | 'draft','finalized','distributed' |
| minutes_body | text | rich text (Tiptap) |
| created_by | uuid | FK -> users.id |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### `meeting_participants` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| meeting_id | uuid | FK -> meetings.id |
| user_id | uuid | FK -> users.id, nullable (internal) |
| contact_id | uuid | FK -> contacts.id, nullable (external) |
| name | varchar(255) | display name |
| organization | varchar(255) | nullable |
| role | varchar(100) | nullable (e.g. "Protokollführer") |
| attended | boolean | default true |

### `meeting_action_items` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| meeting_id | uuid | FK -> meetings.id |
| description | text | not null |
| assigned_to_user_id | uuid | FK -> users.id, nullable |
| assigned_to_name | varchar(255) | for external assignees |
| due_date | date | nullable |
| status | enum | 'open','in_progress','done' |
| linked_task_id | uuid | FK -> tasks.id, nullable |
| created_at | timestamp | default now() |

### Requirements

- Meeting list per project (chronological, numbered)
- Create meeting: title, date, time, location
- Participant management: add from project members + external contacts
- Rich text minutes editor (Tiptap)
- Action items: add inline, assign to person, set due date
- Convert action item to project task (creates linked task)
- Carry forward open action items from previous meeting
- Meeting protocol PDF export:
  - Header: project name, meeting number, date, location
  - Participant list with attendance
  - Agenda / minutes body
  - Action items table
  - Signature block
- Finalize meeting (locks editing)
- Distribute meeting protocol (send PDF via email to participants)
- Meeting template (recurring meeting structure)

---

## 4.5 Correspondence Tracking

### `correspondence` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| project_id | uuid | FK -> projects.id, nullable |
| type | enum | 'letter_sent','letter_received','email_sent','email_received','fax','other' |
| reference_number | varchar(100) | nullable |
| subject | varchar(500) | not null |
| body | text | nullable |
| sender | varchar(255) | not null |
| recipient | varchar(255) | not null |
| organization_id | uuid | FK -> organizations.id, nullable |
| contact_id | uuid | FK -> contacts.id, nullable |
| date | date | not null |
| response_required | boolean | default false |
| response_deadline | date | nullable |
| responded_at | date | nullable |
| status | enum | 'open','responded','closed','no_action' |
| created_by | uuid | FK -> users.id |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### `correspondence_attachments` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| correspondence_id | uuid | FK -> correspondence.id |
| file_id | uuid | FK -> files.id |

### Correspondence Templates

### `correspondence_templates` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| name | varchar(255) | not null |
| type | enum | same as correspondence.type |
| subject_template | varchar(500) | with {{variable}} placeholders |
| body_template | text | with {{variable}} placeholders |
| created_at | timestamp | default now() |

### Requirements

- Correspondence log per project
- Create correspondence: type, subject, body, sender/recipient, date
- File attachments (upload or link existing documents)
- Response tracking: flag items requiring response, track deadlines
- Overdue response alerts
- Template system for common letter types:
  - Bauherren-Mitteilung (client notification)
  - Mängelrüge (deficiency notice)
  - Behinderungsanzeige (obstruction notice)
  - Nachtragsanmeldung (change order notice)
- Template variable substitution (project name, date, client name, etc.)
- Correspondence register PDF export (list of all correspondence)
- Filter and search correspondence (by type, project, organization, date)

---

## 4.6 Questionnaire Builder

### `questionnaires` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| company_id | uuid | FK -> companies.id |
| project_id | uuid | FK -> projects.id, nullable |
| title | varchar(255) | not null |
| description | text | nullable |
| schema | jsonb | form field definitions |
| status | enum | 'draft','published','closed' |
| created_by | uuid | FK -> users.id |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### `questionnaire_responses` Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| questionnaire_id | uuid | FK -> questionnaires.id |
| respondent_user_id | uuid | FK -> users.id, nullable |
| respondent_name | varchar(255) | nullable (for external) |
| respondent_email | varchar(255) | nullable |
| data | jsonb | response data matching schema |
| submitted_at | timestamp | nullable |
| created_at | timestamp | default now() |
| updated_at | timestamp | default now() |

### Schema Format (jsonb)

```json
{
  "fields": [
    {
      "id": "field_1",
      "type": "text",
      "label": "Projektname",
      "required": true,
      "placeholder": "..."
    },
    {
      "id": "field_2",
      "type": "select",
      "label": "Gebäudetyp",
      "options": ["Wohngebäude", "Bürogebäude", "Industriebau"],
      "required": true
    },
    {
      "id": "field_3",
      "type": "number",
      "label": "Grundstücksfläche (m²)",
      "min": 0
    },
    {
      "id": "field_4",
      "type": "textarea",
      "label": "Besondere Anforderungen",
      "required": false
    },
    {
      "id": "field_5",
      "type": "file",
      "label": "Grundriss hochladen",
      "accept": ".pdf,.dwg,.ifc"
    }
  ]
}
```

### Supported Field Types

- `text` - Single line text
- `textarea` - Multi-line text
- `number` - Numeric input (min/max/step)
- `select` - Dropdown single select
- `multiselect` - Multi-select checkboxes
- `radio` - Radio button group
- `checkbox` - Single checkbox (yes/no)
- `date` - Date picker
- `file` - File upload
- `heading` - Section heading (display only)
- `paragraph` - Descriptive text (display only)

### Requirements

- Drag-and-drop questionnaire builder
- Field configuration: label, type, required, validation rules, placeholder
- Conditional logic: show/hide field based on another field's value
- Preview mode (fill as respondent would see it)
- Share questionnaire via link (public or authenticated)
- Response collection and viewing
- Response summary (aggregate view for select/radio fields)
- Export responses: CSV, PDF per response
- Questionnaire templates (save as template, create from template)

---

## 4.7 UI Pages (Phase 4)

### Routes

- `/app/projects/[slug]/contracts` - Contract list
  - `/[id]` - Contract detail (overview, invoices, changes, documents)
- `/app/projects/[slug]/invoices` - Invoice list
  - `/new` - Create invoice wizard
  - `/[id]` - Invoice detail + PDF preview
- `/app/projects/[slug]/changes` - Change order list
  - `/[id]` - Change order detail
- `/app/projects/[slug]/meetings` - Meeting list
  - `/new` - Create meeting
  - `/[id]` - Meeting detail / protocol editor
  - `/[id]/pdf` - PDF preview
- `/app/projects/[slug]/correspondence` - Correspondence log
  - `/new` - Create entry
  - `/[id]` - Detail view
- `/app/projects/[slug]/questionnaires` - Questionnaire list
  - `/builder/[id]` - Questionnaire builder
  - `/fill/[id]` - Fill view (respondent)
  - `/responses/[id]` - View responses
