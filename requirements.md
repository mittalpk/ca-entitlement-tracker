# Corporate Actions Entitlement Calculator & Voluntary-Election Deadline Tracker

**Workflow name:** Corporate Actions Entitlement Calculator & Voluntary-Election Deadline Tracker  
**Domain:** Securities Services / Custody & Asset Servicing  
**Portfolio track:** `backlog/` — BK series (Banking/Custody)  
**Document standard:** ISO/IEC/IEEE 29148:2018 · IIBA BABOK v3 · TOGAF ADM  
**Document version:** 1.0  
**Status:** Draft  
**System owner:** Corporate Actions Operations Lead  
**Last updated:** 2026-07-30  

---

## 1. Purpose & Scope

### 1.1 Purpose

This document specifies the requirements for BK1 — an n8n automation workflow that:

1. Parses synthetic SWIFT MT564-shaped corporate-action notification messages.
2. Determines which client positions are entitled based on the record date.
3. Calculates entitlement amounts using deterministic, event-type-specific formulas (DVCA, DVSE, SPLF, RHTS, TEND/CHOS).
4. Tracks voluntary-election deadlines and routes escalations through four tiers (informational / reminder / urgent / breach).
5. Drafts plain-language client notifications via a bounded LLM call.
6. Logs all calculated entitlements and deadline-tracking states as an immutable audit trail.

### 1.2 Scope

**In scope:**
- Parsing a synthetic MT564-shaped JSON payload delivered via Webhook (simulating a SWIFT/vendor feed).
- Mapping the ISIN in the notification to affected client positions stored in a mock Google Sheets position book (system of record).
- Applying one of five deterministic entitlement formulas based on `eventType`.
- Computing `daysToDeadline` for voluntary/choice events and routing through the four escalation tiers.
- Invoking an LLM (Basic LLM Chain node — not the Agent node) to draft client-facing notification text from pre-computed, locked entitlement figures.
- Dispatching notifications via Gmail or Slack.
- Appending a structured entitlement-calculation log record to Google Sheets as the audit trail.

**Out of scope:**
- Live SWIFT network connectivity (simulated via Webhook).
- Tax withholding calculation (documented as a follow-on extension — not built in this version).
- Any real custodian's actual client book.
- Settlement-instruction generation (a separate downstream workflow).
- Multi-currency conversion (entitlement currency follows the event's stated currency).

### 1.3 Definitions

See §12 (Glossary).

---

## 2. Stakeholders & Roles (RACI)

| Stakeholder | Role | R | A | C | I |
|---|---|---|---|---|---|
| Corporate Actions Operations Team | Process owner; primary consumer of entitlement calculations and escalation alerts | R | | C | |
| Custody Client (end beneficiary) | Recipient of client-facing entitlement notification | | | | I |
| Asset Servicing Risk & Control | Audit-trail reviewer; incident-log owner for missed elections | | A | C | |
| Technology / Workflow Engineer | n8n workflow builder and maintainer | R | | | |
| Compliance Officer | Regulatory-mapping reviewer; sign-off on MiFID II record-keeping obligations | | A | C | |
| Data Governance Lead | Data model approval; data minimization sign-off | | | A | I |
| Corporate Actions Operations Lead | Accountable executive sponsor | | A | | I |

> **BABOK v3 note:** Stakeholder identification conducted via stakeholder-onion analysis. The above table covers primary stakeholders for MVP scope.

---

## 3. Business Requirements

| ID | Business Requirement | Priority | Source |
|---|---|---|---|
| BR-001 | The workflow must calculate the correct cash or securities entitlement for each entitled client position upon receipt of a corporate-action notification, using the event-type-specific formula defined in §6.4. | Must | Custody operations SLA |
| BR-002 | For voluntary events (RHTS, TEND, CHOS), the workflow must track the election deadline and escalate through defined tiers before the cutoff — a missed voluntary election is an irreversible operational-risk incident. | Must | Operational risk register |
| BR-003 | Entitlement must be calculated against the position **as of the record date**, never against a live/current position, to avoid settlement-in-transit miscalculation — one of the most frequent real-money-loss error categories in custody operations. | Must | Custody control framework |
| BR-004 | The LLM must draft client-facing notification text from pre-computed, locked entitlement figures — it must never recalculate, estimate, or alter any financial figure. | Must | AI governance policy |
| BR-005 | Every entitlement calculation and deadline-tracking state must be logged in an append-only audit trail sufficient to reconstruct the full processing history for a given event. | Must | MiFID II Art. 25; SOX internal-control requirement |
| BR-006 | The workflow must handle all five supported event types (DVCA, DVSE, SPLF, RHTS, TEND/CHOS) without manual intervention for the happy-path case. | Must | Automation ROI target |
| BR-007 | The workflow must produce zero entitlement (not an error or skip) for a position with zero holdings on the record date. | Must | Correctness requirement |

---

## 4. Functional Requirements

All requirements are uniquely identified, testable, and traceable per ISO/IEC/IEEE 29148:2018 §5.2.

### 4.1 Ingestion & Validation

| ID | Requirement | Acceptance link |
|---|---|---|
| FR-001 | The Webhook trigger node **shall** accept an HTTP POST payload conforming to the MT564-shaped JSON schema defined in §6.3. | AC-001 |
| FR-002 | The validation Code node **shall** reject (HTTP 400 with structured error body) any payload missing one or more of the required fields: `eventId`, `isin`, `eventType`, `mandatoryVoluntaryFlag`, `recordDate`. | AC-002 |
| FR-003 | The validation Code node **shall** classify `mandatoryVoluntaryFlag` as one of `MAND`, `VOLU`, or `CHOS` and reject unrecognised values. | AC-002 |

### 4.2 Position Lookup

| ID | Requirement | Acceptance link |
|---|---|---|
| FR-004 | The Google Sheets Lookup node **shall** retrieve all client position rows where `isin` matches the event's ISIN and `positionAsOfRecordDate` is the authoritative holding field (never a live position field). | AC-003 |
| FR-005 | If no matching positions are found for the ISIN, the workflow **shall** log a zero-entitlement record and exit without error. | AC-004 |

### 4.3 Entitlement Calculation

| ID | Requirement | Formula | Acceptance link |
|---|---|---|---|
| FR-006 | For `eventType = DVCA`, the workflow **shall** compute `entitlement_cash = positionAsOfRecordDate × grossRatePerShare`, rounded to 2 decimal places using half-up rounding. | `pos × rate` | AC-005 |
| FR-007 | For `eventType = DVSE`, the workflow **shall** compute `entitlement_shares = floor(positionAsOfRecordDate × stockDividendRatio)` and `fractional_cash = (positionAsOfRecordDate × stockDividendRatio − entitlement_shares) × fractionalCashPrice`. | `floor(pos × ratio)` | AC-006 |
| FR-008 | For `eventType = SPLF`, the workflow **shall** compute `new_position = positionAsOfRecordDate × (splitRatioNumerator / splitRatioDenominator)` as a pure position adjustment with zero cash entitlement. | `pos × (a/b)` | AC-007 |
| FR-009 | For `eventType = RHTS`, the workflow **shall** compute `rights_entitlement = positionAsOfRecordDate × rightsRatio` and hold as a pending-election record if `mandatoryVoluntaryFlag = VOLU`, not crediting automatically. | `pos × ratio` | AC-008 |
| FR-010 | For `eventType = TEND` or `CHOS`, the workflow **shall** generate one election-tracking record per available option in `optionDetails`, with status `PENDING_ELECTION`, without computing any automatic entitlement. | N/A | AC-009 |
| FR-011 | For a `positionAsOfRecordDate = 0`, the workflow **shall** produce an entitlement of zero and log the zero-entitlement record without error or skip. | N/A | AC-010 |

### 4.4 Voluntary-Event Deadline Tracking

| ID | Requirement | Acceptance link |
|---|---|---|
| FR-012 | For any event where `mandatoryVoluntaryFlag ∈ {VOLU, CHOS}`, the IF node **shall** compute `daysToDeadline = electionDeadline − today` (in whole days, truncated). | AC-011 |
| FR-013 | `daysToDeadline > 10` **shall** route to the **Informational** branch: log only, no priority escalation. | AC-011 |
| FR-014 | `3 ≤ daysToDeadline ≤ 10` **shall** route to the **Reminder** branch: standard-channel notification with reminder priority flag. | AC-011 |
| FR-015 | `0 < daysToDeadline < 3` **shall** route to the **Urgent Escalation** branch: high-priority notification on a separate channel (configurable). | AC-012 |
| FR-016 | `daysToDeadline ≤ 0` (deadline passed) **shall** route to the **Breach** branch: incident-log entry is created and flagged as potentially irreversible. | AC-013 |

### 4.5 LLM Notification Drafting

| ID | Requirement | Acceptance link |
|---|---|---|
| FR-017 | The Basic LLM Chain node **shall** receive the pre-computed entitlement figures as fixed, read-only variables in its prompt — it **shall not** perform or alter any financial calculation. | AC-014 |
| FR-018 | For mandatory events, the LLM **shall** draft a plain-language entitlement notification stating: client ID, ISIN, event type, entitlement amount/quantity, and payment/settlement date. | AC-014 |
| FR-019 | For voluntary events, the LLM **shall** draft: (a) a plain-language explanation of each available option, and (b) the default outcome if no election is received by the deadline — taken verbatim from `optionDetails[].description` as input. | AC-015 |
| FR-020 | The Agent node variant **shall not** be used; the Basic LLM Chain node is required so the LLM has no tool-calling capability and cannot invoke any external action. | AC-014 |

### 4.6 Notification Dispatch

| ID | Requirement | Acceptance link |
|---|---|---|
| FR-021 | The Gmail or Slack node **shall** dispatch the LLM-drafted notification to the configured recipient address/channel per event escalation tier. | AC-016 |
| FR-022 | Urgent and breach notifications **shall** be dispatched on a separate, configurable channel distinct from informational/reminder notifications. | AC-016 |

### 4.7 Audit Trail

| ID | Requirement | Acceptance link |
|---|---|---|
| FR-023 | The Google Sheets Append node **shall** write one structured record per processed position, containing: `eventId`, `isin`, `clientId`, `eventType`, `mandatoryVoluntaryFlag`, `positionAsOfRecordDate`, calculated entitlement fields, `daysToDeadline` (if applicable), `escalationTier`, `processingTimestampUTC`, `workflowRunId`. | AC-017 |
| FR-024 | The audit-trail sheet **shall** be append-only — no existing rows may be modified or deleted by this workflow. | AC-017 |
| FR-025 | For breach events (`daysToDeadline ≤ 0`), the audit record **shall** include an `incidentFlag = TRUE` field and a `breachNotes` free-text field populated by the LLM with a brief description of the missed deadline. | AC-013 |

---

## 5. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-001 | Performance | End-to-end processing (from Webhook receipt to audit-trail append) **shall** complete within 30 seconds for a batch of up to 50 client positions for a single event. |
| NFR-002 | Availability | The workflow **should** be available 99.5% of business hours (Mon–Fri, 07:00–20:00 CET). Downtime outside business hours is acceptable. |
| NFR-003 | Security | Webhook endpoint **shall** be protected by a secret header token. Google Sheets OAuth credentials **shall** be stored as n8n credentials, never in workflow nodes or sticky notes. |
| NFR-004 | Data minimisation | Only fields required for entitlement calculation and audit shall be stored in the Google Sheets position book — no extraneous client PII beyond `clientId` and position data. |
| NFR-005 | Reproducibility | Given the same input payload and position-book snapshot, the workflow **shall** produce byte-identical entitlement figures on repeated execution (deterministic, no random elements). |
| NFR-006 | Maintainability | All formula parameters (e.g. rounding rule, escalation-tier thresholds) **shall** be defined as named constants in the top section of the relevant Code node — not as inline literals scattered across the node body. |
| NFR-007 | Observability | Every execution **shall** emit a structured summary log (n8n execution log or appended Google Sheet row) sufficient to reconstruct processing without re-running the workflow. |
| NFR-008 | Portability | The workflow **shall** import cleanly into a fresh n8n instance (Community Edition ≥ 1.40) and run end-to-end using only the provided sample data and a connected Google Sheets mock — no additional dependencies. |

---

## 6. Data Requirements & Data Model

### 6.1 Data categories processed

| Data category | Classification | Retention | Erasure mechanism |
|---|---|---|---|
| Client position data (`clientId`, `isin`, `positionAsOfRecordDate`) | Confidential — financial | 7 years (MiFID II record-keeping) | Manual purge from Google Sheets on request; see GDPR §7.4 |
| Corporate-action event data (`eventId`, event terms) | Internal — financial | 7 years | Retained with position data |
| Entitlement calculation outputs | Confidential — financial | 7 years | Same as position data |
| LLM-drafted notification text | Internal | 90 days (comms archive) | Overwrite/delete after retention period |
| Audit trail rows | Internal — control | 7 years | Manual purge with audit-committee approval |

### 6.2 Data flow

```
SWIFT/Vendor feed (simulated)
  └─► Webhook (n8n) ──► Validation Code ──► Google Sheets Lookup (position book)
        └─► Switch (eventType) ──► [5 formula branches] ──► IF (daysToDeadline)
              └─► LLM Chain (draft text) ──► Gmail/Slack (dispatch)
                    └─► Google Sheets Append (audit trail)
```

### 6.3 Input data schema (MT564-shaped JSON)

```json
{
  "eventId":               "string — unique identifier (e.g. CA-2026-088841)",
  "isin":                  "string — 12-char ISIN",
  "eventType":             "enum: DVCA | DVSE | SPLF | RHTS | TEND | CHOS",
  "mandatoryVoluntaryFlag":"enum: MAND | VOLU | CHOS",
  "recordDate":            "ISO 8601 date (YYYY-MM-DD)",
  "exDate":                "ISO 8601 date",
  "paymentDate":           "ISO 8601 date",
  "electionDeadline":      "ISO 8601 date | null (null for MAND events)",
  "grossRatePerShare":     "number | null",
  "currency":              "ISO 4217 currency code",
  "splitRatio":            "string (e.g. '3:1') | null",
  "stockDividendRatio":    "number | null",
  "fractionalCashPrice":   "number | null",
  "rightsRatio":           "number | null",
  "optionDetails": [
    {
      "optionCode":  "string",
      "description": "string",
      "ratio":       "number | null",
      "price":       "number | null"
    }
  ]
}
```

### 6.4 Position book schema (Google Sheets — mock system of record)

| Column | Type | Description |
|---|---|---|
| `clientId` | string | Unique client identifier |
| `isin` | string | 12-char ISIN |
| `positionAsOfRecordDate` | number | Authoritative holding on record date — **never substituted with a live or current-date position field** |
| `accountCurrency` | ISO 4217 | Client account currency |

### 6.5 Entitlement formulas (deterministic — Code node only)

| Event type | Formula |
|---|---|
| DVCA (cash dividend) | `entitlement_cash = positionAsOfRecordDate × grossRatePerShare` (half-up, 2 d.p.) |
| DVSE (stock dividend) | `entitlement_shares = floor(pos × stockDividendRatio)`; `fractional_cash = (pos × stockDividendRatio − entitlement_shares) × fractionalCashPrice` |
| SPLF (forward split, ratio a:b) | `new_position = pos × (a / b)` — no cash entitlement; pure position adjustment |
| RHTS (rights issue) | `rights_entitlement = pos × rightsRatio`; VOLU flag → hold as PENDING_ELECTION, not auto-credit |
| TEND / CHOS | No automatic entitlement — generate one PENDING_ELECTION record per option in `optionDetails` |

### 6.6 Audit trail schema (Google Sheets — append-only)

| Column | Type | Description |
|---|---|---|
| `eventId` | string | From input payload |
| `isin` | string | |
| `clientId` | string | |
| `eventType` | string | |
| `mandatoryVoluntaryFlag` | string | |
| `positionAsOfRecordDate` | number | |
| `entitlementCash` | number \| null | |
| `entitlementShares` | number \| null | |
| `fractionalCash` | number \| null | |
| `newPosition` | number \| null | SPLF only |
| `electionStatus` | string \| null | RHTS MAND: AUTO_CREDIT; RHTS VOLU/CHOS and TEND/CHOS: PENDING_ELECTION; null otherwise (see `docs/04-deterministic-logic-spec.md` §4.4-4.5 — `BREACH` is never a value of this field, it is reported only via `escalationTier` below) |
| `daysToDeadline` | integer \| null | |
| `escalationTier` | string | INFORMATIONAL \| REMINDER \| URGENT \| BREACH |
| `incidentFlag` | boolean | TRUE only for BREACH tier |
| `breachNotes` | string \| null | LLM-drafted, BREACH tier only |
| `processingTimestampUTC` | ISO 8601 datetime | |
| `workflowRunId` | string | n8n execution ID |

---

## 7. Regulatory / Compliance Requirements

### 7.1 GDPR

| ID | Requirement | Article / Recital | Applicability |
|---|---|---|---|
| GDPR-Art6-001 | Processing of `clientId` and position data **shall** be grounded in a documented lawful basis — for institutional custody, this is contract performance (Art. 6(1)(b)) or legitimate interest (Art. 6(1)(f)). The lawful basis **shall** be recorded in the workflow's data-processing register entry. | Art. 6(1) | **Applicable** |
| GDPR-Art5-001 | Only the minimum data fields required to calculate entitlement and satisfy MiFID II record-keeping **shall** be stored. Fields not required (e.g. client name, address, DOB) **shall** not appear in the position book or audit trail. | Art. 5(1)(c) — data minimisation | **Applicable** |
| GDPR-Art5-002 | Data collected for entitlement calculation **shall** not be used for any other purpose (e.g. marketing analytics, cross-selling). | Art. 5(1)(b) — purpose limitation | **Applicable** |
| GDPR-Art35-001 | A DPIA trigger assessment **shall** be conducted before go-live. Given that the data involves financial positions, a DPIA is recommended even if not strictly mandatory. | Art. 35 | **Assess at go-live** |
| GDPR-Art17-001 | A documented erasure procedure **shall** exist: upon a valid data-subject erasure request, `clientId`-linked rows in the position book and audit trail **shall** be purged after the MiFID II 5-year retention period expires. | Art. 17 | **Applicable** |
| GDPR-Art44-001 | If the Google Sheets workspace is hosted outside the EEA (e.g. US-based Google LLC), a valid transfer mechanism **shall** be in place (Standard Contractual Clauses or adequacy decision). | Art. 44–49 | **Applicable — verify hosting region** |

### 7.2 EU AI Act

| ID | Requirement | Article / Annex | Applicability |
|---|---|---|---|
| EUAIACT-CLASS-001 | The LLM component (Basic LLM Chain node) **shall** be classified against Annex III and Art. 6 risk tiers. Assessment: the LLM drafts communication text only from pre-computed, locked financial figures and makes no autonomous financial decisions — provisional classification **Limited-risk**. | Art. 6; Annex III | **Applicable — Limited risk** |
| EUAIACT-LR-001 | As a limited-risk AI system generating text intended for human consumption, the output **shall** be disclosed as AI-generated in the notification. A sticky note on the LLM node **shall** document this obligation. | Art. 50 | **Applicable** |
| EUAIACT-HR-001 | If scope is later extended to allow the LLM to influence entitlement figures or investment decisions, the system **shall** be reclassified as high-risk (Annex III, §5) and Annex IV technical documentation, human-oversight design, and conformity-assessment **shall** be completed before deployment. | Art. 6; Annex III §5; Annex IV | **Conditional — not currently applicable** |
| EUAIACT-LOG-001 | Logs sufficient to reconstruct LLM inputs and outputs **shall** be retained for the duration of the system's operational life. | Art. 12 | **Applicable** |

### 7.3 ISO/IEC 42001 (AI Management System)

| ID | Requirement | Clause | Applicability |
|---|---|---|---|
| ISO42001-POL-001 | The organisation **shall** document an AI policy governing use of the LLM component, including its bounded role, approved model(s), and review cadence. | Cl. 5.2 | **Applicable** |
| ISO42001-RISK-001 | A risk assessment **shall** cover: hallucination risk on entitlement figures (mitigated by passing figures as locked inputs); prompt-injection risk via event description fields. | Cl. 6.1 | **Applicable** |
| ISO42001-LC-001 | The LLM model version in use **shall** be logged in the workflow configuration and reviewed at least annually for deprecation, capability drift, and changed terms. | Cl. 8.4 | **Applicable** |
| ISO42001-CI-001 | LLM output quality **should** be reviewed quarterly against a sample of generated notifications, with findings logged. | Cl. 10 | **Recommended** |

### 7.4 MiFID II / EMIR

| ID | Requirement | Article | Applicability |
|---|---|---|---|
| MIFID-ART25-001 | All entitlement calculations and client notifications **shall** be logged with sufficient detail to reconstruct the processing of any corporate-action event. Retention: 5 years minimum (Art. 25(2)). | MiFID II Art. 25 | **Applicable** |
| MIFID-ART25-002 | The audit trail **shall** record the exact formula version and parameter values used for each entitlement calculation (e.g. `grossRatePerShare` at time of processing) — not just the output — so that the calculation is reproducible from the record. | MiFID II Art. 25 | **Applicable** |
| MIFID-BEST-001 | For voluntary events, the workflow **shall** ensure the election deadline and available options are communicated to the client with sufficient time to act — an indirect best-execution support control. | MiFID II Art. 27 | **Applicable — indirect** |
| EMIR-001 | EMIR transaction-reporting obligations are **not applicable** to corporate-action entitlement workflows (no OTC derivative trades reported). | EMIR Art. 9 | **N/A — explicitly documented** |

### 7.5 NIST AI RMF

| ID | Function | Requirement | Applicability |
|---|---|---|---|
| NIST-GOV-001 | Govern | An AI governance policy **shall** define the acceptable use of the LLM component, including its bounded role and oversight mechanism. | **Applicable** |
| NIST-MAP-001 | Map | Context of use **shall** be documented: institutional custody operations; deterministic entitlement calculation is the core; LLM is a supporting communication tool only. | **Applicable** |
| NIST-MEAS-001 | Measure | LLM output quality **shall** be measured on a quarterly sample basis. | **Recommended** |
| NIST-MANAGE-001 | Manage | If LLM quality degrades, a documented escalation and fallback procedure **shall** exist (e.g. switch to template-based notification). | **Applicable** |

### 7.6 SOX / SOC 2

| ID | Requirement | Control | Applicability |
|---|---|---|---|
| SOX-IC-001 | The entitlement calculation logic **shall** be treated as a financial-reporting-adjacent internal control. Changes to formula Code nodes **shall** follow a documented change-management process with approval and test evidence. | SOX §302 / §404 | **Applicable** |
| SOX-AT-001 | The append-only audit trail (§4.7) **shall** be reviewed and attested by an independent control reviewer at least quarterly. | SOX §404 | **Applicable** |
| SOC2-SEC-001 | Access to the n8n workflow, Google Sheets position book, and audit trail **shall** be restricted to authorised personnel, reviewed at least annually. | SOC 2 CC6.1 | **Applicable** |
| SOC2-AV-001 | Workflow availability **shall** be monitored; downtime incidents during business hours **shall** be logged and reviewed. | SOC 2 A1.1 | **Applicable** |

---

## 8. TOGAF Architecture Views

### 8.1 Business Architecture View

**Business capability:** Corporate-action processing — entitlement calculation and voluntary-election management.

**As-is process:** Manual receipt of MT564 notifications → spreadsheet cross-check → manual entitlement calculation → email client notification → deadline diary entry.

**To-be process:** Automated Webhook ingestion → deterministic formula execution → automated client notification → append-only audit log with deadline-tracking states.

**Key business driver:** Missed voluntary elections are one of the most frequent real-money-loss incident categories in custody operations. Automating the deadline-escalation tiers reduces this risk without requiring full vendor-system integration.

### 8.2 Data Architecture View

**Primary data stores:**
- **Position book** (Google Sheets, mock SoR): read-only by this workflow.
- **Audit trail** (Google Sheets): append-only by this workflow.
- **LLM provider** (external API): receives only pre-computed entitlement figures and event metadata; no raw client PII transmitted beyond `clientId`.

**Data sovereignty:** Position book and audit trail **should** be hosted in the EEA (or transfer mechanism applied — see GDPR-Art44-001).

**Critical data integrity rule:** `positionAsOfRecordDate` is the sole authoritative position field for entitlement calculation. No path in the workflow may substitute a live or current-date position. This constraint **shall** be enforced by field naming convention and documented in a sticky note on the Google Sheets Lookup node.

### 8.3 Application Architecture View

**n8n workflow node map:**

| Step | Node type | Role |
|---|---|---|
| 1 | Webhook | Receives MT564-shaped JSON; entry point |
| 2 | Code | Validates fields; classifies event type |
| 3 | Google Sheets (Lookup) | Retrieves all client positions for the ISIN as of record date |
| 4 | Switch | Routes by `eventType` into 5 parallel branches |
| 5a | Code (×5) | Each branch implements exactly one entitlement formula (FR-006 to FR-011) |
| 5b | IF | Voluntary events only: computes `daysToDeadline`, routes to escalation tier |
| 6 | Basic LLM Chain | Drafts notification text from locked entitlement inputs |
| 7 | Gmail / Slack | Dispatches notification to configured recipient/channel |
| 8 | Google Sheets (Append) | Appends structured audit-trail record |

**AI governance node rule:** The **Agent node** variant is explicitly prohibited. The Basic LLM Chain node is required to prevent the LLM from having tool-calling capability or autonomous action scope. This constraint **shall** be documented in a sticky note on the LLM node.

### 8.4 Technology Architecture View

| Component | Technology | Version constraint |
|---|---|---|
| Workflow engine | n8n Community Edition | ≥ 1.40 |
| Position book / audit trail | Google Sheets | N/A (Google Workspace) |
| LLM provider | Configurable (OpenAI GPT-4o or equivalent) | Reviewed annually per ISO42001-LC-001 |
| Notification channel | Gmail (primary) / Slack (secondary) | N/A |
| Hosting | Self-hosted n8n instance or n8n Cloud | EEA region preferred |

---

## 9. Acceptance Criteria & Test Cases

### 9.1 Acceptance criteria

| ID | Criterion | Pass condition |
|---|---|---|
| AC-001 | Webhook ingestion | Workflow receives and processes a valid MT564-shaped JSON payload end-to-end without error |
| AC-002 | Validation rejection | Invalid payload (missing `eventId`) returns HTTP 400 with structured error; workflow does not proceed |
| AC-003 | Record-date position lookup | Lookup retrieves positions using `positionAsOfRecordDate` field; no live/current-position field is used anywhere in the entitlement path |
| AC-004 | Zero-holdings edge case | A position with `positionAsOfRecordDate = 0` produces an entitlement of zero, not an error or skip; audit record is written |
| AC-005 | DVCA formula correctness | Non-round entitlement produced correctly; half-up rounding applied |
| AC-006 | DVSE fractional-share branch | `entitlement_shares = floor(pos × ratio)` and `fractional_cash` both computed and logged; fractional remainder is never zeroed silently |
| AC-007 | SPLF forward split | `newPosition = pos × (a/b)`; `entitlementCash = 0`; `entitlementShares = 0`; `newPosition` field populated |
| AC-008 | RHTS rights issue (voluntary) | Produces a `PENDING_ELECTION` record, not an automatic credit; escalation tier computed from `daysToDeadline` |
| AC-009 | TEND/CHOS election tracking | One election-tracking record per option in `optionDetails`; no automatic entitlement produced |
| AC-010 | Zero-holdings correctness | See AC-004 |
| AC-011 | Escalation tier routing | `daysToDeadline = 15` → INFORMATIONAL; `daysToDeadline = 5` → REMINDER; `daysToDeadline = 2` → URGENT |
| AC-012 | Urgent escalation dispatch | Urgent notification dispatched to separate channel (distinct from informational/reminder) |
| AC-013 | Breach detection and incident log | `daysToDeadline = -1` routes to BREACH tier; `incidentFlag = TRUE` written; `breachNotes` field populated |
| AC-014 | LLM bounded role | LLM node receives entitlement figures as locked input variables; LLM output contains no figure not passed as input; Agent node is not used |
| AC-015 | Voluntary-event notification | LLM draft includes plain-language description of each option and the default outcome if no election received |
| AC-016 | Notification dispatch | Client notification dispatched successfully to configured Gmail address or Slack channel |
| AC-017 | Audit trail completeness | Every processed position produces exactly one audit-trail row; all required fields (§6.6) populated; no existing row modified |

### 9.2 Test cases (must all be exercised — not just the happy path)

| TC | Scenario | Input | Expected output |
|---|---|---|---|
| TC-001 | DVCA — non-round entitlement | `grossRatePerShare = 0.42`, `position = 14999` | `entitlement_cash = 6299.58` (half-up) |
| TC-002 | DVSE — fractional-share remainder | `stockDividendRatio = 0.10`, `position = 153`, `fractionalCashPrice = 25.00` | `entitlement_shares = 15`, `fractional_cash = 7.50` |
| TC-003 | RHTS — 2 days to deadline (urgent) | `daysToDeadline = 2` | URGENT escalation tier; separate channel; `PENDING_ELECTION` status |
| TC-004 | RHTS — 1 day past deadline (breach) | `electionDeadline = yesterday` | BREACH tier; `incidentFlag = TRUE`; `breachNotes` populated; no credit issued |
| TC-005 | DVCA — zero-holdings position | `position = 0`, `grossRatePerShare = 0.42` | `entitlement_cash = 0.00`; audit row written; no error |
| TC-006 | SPLF — clean split | `splitRatio = "3:1"`, `position = 10000` | `newPosition = 30000`; `entitlementCash = 0`; `entitlementShares = 0` |
| TC-007 | TEND — multi-option choice | `optionDetails` with 3 options | 3 election-tracking records, each `PENDING_ELECTION`; no entitlement computed |
| TC-008 | Validation rejection | Payload missing `recordDate` | HTTP 400; workflow halted at validation node; no downstream nodes executed |

---

## 10. Assumptions, Constraints, Dependencies

### 10.1 Assumptions

| ID | Assumption |
|---|---|
| ASM-001 | The position book (Google Sheets) is populated with accurate `positionAsOfRecordDate` values before the workflow is invoked — this workflow does not validate or reconcile the position source. |
| ASM-002 | The Webhook endpoint is exposed only on the internal network or behind an authenticated API gateway in production deployments. |
| ASM-003 | `electionDeadline` is always populated for `VOLU` and `CHOS` events; the workflow does not handle voluntary events with a null deadline. |
| ASM-004 | The LLM provider API is available and returns a valid response within the n8n node timeout. If unavailable, the workflow falls back to a template-based notification (implementation detail for hardening phase). |
| ASM-005 | Multi-currency conversion is not in scope; all entitlement figures are expressed in the event's stated currency. |

### 10.2 Constraints

| ID | Constraint |
|---|---|
| CON-001 | Must run on n8n Community Edition ≥ 1.40 without premium nodes. |
| CON-002 | The Agent node is prohibited in this workflow (see FR-020). |
| CON-003 | The position book and audit trail **shall** use Google Sheets for the MVP — no database dependency. |
| CON-004 | Formula parameters (rounding rules, escalation thresholds) **shall** be defined as named constants, not inline literals (see NFR-006). |

### 10.3 Dependencies

| ID | Dependency | Risk if unavailable |
|---|---|---|
| DEP-001 | Google Sheets API (OAuth) | Position lookup and audit trail writes fail; workflow cannot complete |
| DEP-002 | LLM provider API | Notification text cannot be drafted; fallback to template required (ASM-004) |
| DEP-003 | Gmail or Slack API | Notification dispatch fails; entitlement calculated but not delivered |
| DEP-004 | n8n instance (self-hosted or Cloud) | Entire workflow unavailable |

---

## 11. Traceability Matrix

| Requirement ID | Business need (BR) | Compliance clause | Test case(s) |
|---|---|---|---|
| FR-001 | BR-006 | — | TC-008 |
| FR-002 | BR-006 | — | TC-008 |
| FR-003 | BR-006 | — | TC-008 |
| FR-004 | BR-003 | MIFID-ART25-001 | TC-001 to TC-007 |
| FR-005 | BR-007 | — | TC-005 |
| FR-006 | BR-001 | MIFID-ART25-002 | TC-001 |
| FR-007 | BR-001 | MIFID-ART25-002 | TC-002 |
| FR-008 | BR-001 | MIFID-ART25-002 | TC-006 |
| FR-009 | BR-001, BR-002 | MIFID-ART25-002 | TC-003, TC-004 |
| FR-010 | BR-001, BR-002 | MIFID-ART25-002 | TC-007 |
| FR-011 | BR-007 | — | TC-005 |
| FR-012–FR-016 | BR-002 | MIFID-BEST-001 | TC-003, TC-004 |
| FR-017–FR-020 | BR-004 | EUAIACT-CLASS-001; EUAIACT-LR-001; NIST-MAP-001 | AC-014, AC-015 |
| FR-021–FR-022 | BR-006 | — | AC-016 |
| FR-023–FR-025 | BR-005 | MIFID-ART25-001; SOX-AT-001; GDPR-Art5-001 | AC-017; TC-004 |
| NFR-003 | — | SOC2-SEC-001; GDPR-Art44-001 | — |
| NFR-004 | — | GDPR-Art5-001 | — |
| NFR-005 | BR-003 | MIFID-ART25-002 | TC-001 to TC-006 |

---

## 12. Glossary

| Term | Definition |
|---|---|
| **CHOS** | Choice event — a corporate action offering the client a selection of options (e.g. cash or stock alternative). Mapped to `eventType = CHOS` in this workflow. |
| **DVCA** | Cash dividend corporate action. Entitlement: `position × grossRatePerShare`. |
| **DVSE** | Stock dividend corporate action. Entitlement: whole shares + fractional cash remainder. |
| **Election deadline** | The cutoff date by which a client must submit their option choice for a voluntary corporate action. Missed elections are frequently irreversible. |
| **Entitlement** | The cash amount or securities quantity owed to a client as a result of a corporate action, calculated against their record-date position. |
| **ex-date** | The date from which a security trades without the right to receive the upcoming corporate action distribution. |
| **ISIN** | International Securities Identification Number — 12-character code uniquely identifying a security. |
| **LLM** | Large Language Model — in this workflow, used exclusively to draft plain-language notification text from pre-computed entitlement figures. Never used to calculate or alter financial figures. |
| **MAND** | Mandatory corporate action — applies automatically to all entitled positions; no client election required. |
| **MT564** | SWIFT message type for Corporate Action Notification. This workflow uses a synthetic JSON representation of the MT564 data structure. |
| **positionAsOfRecordDate** | The authoritative client holding quantity on the corporate action record date. Sole input to entitlement formulas — never substituted with a live or current-date position. |
| **Record date** | The date on which a client must hold a position to be entitled to receive a corporate action distribution. |
| **RHTS** | Rights issue corporate action. Entitlement: `position × rightsRatio` — treated as a voluntary election for VOLU-flagged events. |
| **SPLF** | Forward split corporate action. Effect: position multiplied by split ratio; no cash or securities entitlement generated. |
| **SWIFT** | Society for Worldwide Interbank Financial Telecommunication — messaging standard for financial institutions. |
| **TEND** | Tender offer corporate action — a voluntary offer to purchase shares at a specified price. |
| **VOLU** | Voluntary corporate action — requires a client election before the deadline; no automatic entitlement. |

---

## Portfolio alignment notes

- Shares its deadline-countdown escalation tiering mechanic (`daysToDeadline` → INFORMATIONAL / REMINDER / URGENT / BREACH) with [IN3-ExcessOfLossReinsuranceNotificationTracker](../IN3-ExcessOfLossReinsuranceNotificationTracker/requirements.md) and [OT3-VendorCOIComplianceTracker](../OT3-VendorCOIComplianceTracker/requirements.md). Deliberate cross-domain reuse, not accidental repetition.
- Unlike AI-driven corporate-action summarizers (which have the LLM estimate financial impact), every entitlement figure here is produced by named Code-node formulas per event type — the LLM only phrases already-computed numbers. See `backlog/UNIQUENESS-AUDIT-REPORT.md` §3 BK1.
