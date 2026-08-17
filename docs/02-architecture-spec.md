# 02 — Solution Architecture Specification

**Workflow ID:** BK1
**Document:** 02-architecture-spec.md
**Version:** 1.0
**Author role:** Senior AI Solution Architect
**Status:** Draft
**Last updated:** 2026-07-30

---

## How this fits

This document consumes `requirements.md` §8 (TOGAF architecture views) and `00-project-charter.md` (scope and success criteria) to produce a full solution architecture. It is consumed by `03-data-contract.md` (data flows), `03a-security-architecture.md` (trust boundaries), and `04-deterministic-logic-spec.md` (node-level logic). It does not reproduce requirements content — it references by ID.

---

## 1. Architecture principles

| Principle | Source | Application to BK1 |
|---|---|---|
| Separation of deterministic and AI logic | `requirements.md` BR-004 | LLM is confined to Basic LLM Chain; formula Code nodes have no LLM dependency |
| Append-only audit trail | `requirements.md` FR-024 | Google Sheets Append node; no UPDATE or DELETE path exists in the workflow |
| Credential isolation | `SETUP.md`; NFR-003 | All secrets stored in n8n credential store; no literal in node JSON |
| Twelve-Factor config | Twelve-Factor App §III | Escalation thresholds and formula constants defined as named constants at Code-node top — not embedded in logic |
| Zero external dependency at demo time | `requirements.md` NFR-008 | Synthetic data; mock Google Sheets; no live SWIFT feed |

---

## 2. C4 — Context diagram

```mermaid
C4Context
  title BK1 — System Context

  Person(corpActOps, "Corporate Actions Ops", "Receives escalation alerts and audit reports")
  Person(custodyClient, "Custody Client", "Receives entitlement notification")

  System(bk1, "BK1 Entitlement Calculator", "n8n workflow: parses CA notifications, calculates entitlements, tracks election deadlines, dispatches notifications, logs audit trail")

  System_Ext(swiftFeed, "SWIFT / Vendor CA Feed", "MT564 corporate-action notifications (simulated via Webhook in MVP)")
  System_Ext(positionSoR, "Position Book (Google Sheets)", "Mock system of record — client holdings as of record date")
  System_Ext(auditSheet, "Audit Trail (Google Sheets)", "Append-only entitlement and escalation log")
  System_Ext(llmProvider, "LLM Provider (OpenAI / equivalent)", "Drafts client notification text from locked entitlement inputs")
  System_Ext(gmail, "Gmail / Slack", "Notification dispatch channel")

  Rel(swiftFeed, bk1, "Sends MT564-shaped JSON via Webhook POST")
  Rel(bk1, positionSoR, "Reads client positions (ISIN lookup, record-date field only)")
  Rel(bk1, llmProvider, "Sends locked entitlement figures; receives draft text")
  Rel(bk1, gmail, "Dispatches client notification and internal escalation")
  Rel(bk1, auditSheet, "Appends one record per processed position")
  Rel(bk1, corpActOps, "Sends escalation alerts (Reminder / Urgent / Breach tiers)")
  Rel(bk1, custodyClient, "Sends entitlement notification")
```

---

## 3. C4 — Container diagram

> **Corrected 2026-08-16:** this diagram previously showed `sheetsLookup -> switchNode: "Event + position rows"` — implying the Sheets lookup passes the original webhook event through to the router. It doesn't: n8n's Google Sheets node in lookup mode *replaces* the item JSON with the matched row, dropping the webhook payload entirely. That false assumption was the exact root cause of a real bug (`BK1-ISS-004` in `.Archive/log.md`) that would have broken 100% of live requests — the Switch node routes on `eventType`, a field only the pre-lookup payload had. A `Merge Lookup with Payload` node was added between the lookup and the router to restore it; `llmChain` was also split into a chain node plus a separate `OpenAI Chat Model` node, since n8n's LangChain nodes require an explicit `ai_languageModel` connection rather than a bare credential on the chain node itself (`BK1-ISS-003`). Both are reflected below.

```mermaid
C4Container
  title BK1 — Container View

  Container(webhook, "Webhook Trigger", "n8n Webhook node", "Entry point; receives HTTP POST MT564-shaped payload; Header Auth credential rejects missing/wrong X-Webhook-Secret with HTTP 401 before this node's output is even produced")
  Container(validCode, "Validation & Classification", "n8n Code node", "Validates required fields; classifies eventType and mandatoryVoluntaryFlag; returns HTTP 400 on invalid input")
  Container(sheetsLookup, "Position Lookup", "n8n Google Sheets node", "Retrieves all client positions for the ISIN using positionAsOfRecordDate field exclusively; REPLACES the item JSON with the matched row (n8n lookup-mode behavior) — does not carry the webhook payload forward")
  Container(mergeNode, "Merge Lookup with Payload", "n8n Code node", "Restores the validated webhook payload (pulled explicitly from the Validation node by name) alongside the looked-up position row, before anything downstream needs both")
  Container(switchNode, "Event Router", "n8n Switch node", "Routes by eventType into one of 5 formula branches")
  Container(formulaBranches, "Formula Branches (×5)", "n8n Code nodes", "DVCA / DVSE / SPLF / RHTS / TEND-CHOS — each implements exactly one deterministic formula")
  Container(ifNode, "Deadline Gate", "n8n IF node", "For VOLU/CHOS only: computes daysToDeadline; routes to escalation tier")
  Container(llmChain, "LLM Notification Drafter", "n8n Basic LLM Chain node", "Receives locked entitlement figures; drafts plain-language client notification text; delegates the actual model call to llmModel via ai_languageModel")
  Container(llmModel, "OpenAI Chat Model", "n8n Language Model node", "Holds the OpenAI credential and model selection; connected to llmChain via the ai_languageModel connector, not a bare credential on the chain node")
  Container(dispatch, "Notification Dispatch", "n8n Gmail / Slack node", "Sends notification; urgent/breach on separate channel")
  Container(auditAppend, "Audit Trail Writer", "n8n Google Sheets Append node", "Appends one structured record per position; append-only — no updates")

  ContainerDb(posSheet, "Position Book", "Google Sheets tab", "Mock SoR — ISIN → client positions as of record date")
  ContainerDb(auditLog, "Audit Log", "Google Sheets tab", "17-column append-only entitlement + escalation log")
  ContainerDb(llmApi, "LLM API", "External REST API", "OpenAI GPT-4o-mini or equivalent")

  Rel(webhook, validCode, "JSON payload")
  Rel(validCode, sheetsLookup, "Validated event object")
  Rel(sheetsLookup, mergeNode, "Position row only (webhook payload already dropped by n8n)")
  Rel(mergeNode, switchNode, "Merged: validated event + position row")
  Rel(switchNode, formulaBranches, "Routes by eventType")
  Rel(formulaBranches, ifNode, "Calculated entitlement object")
  Rel(ifNode, llmChain, "Entitlement + escalation tier")
  Rel(llmModel, llmChain, "ai_languageModel connection")
  Rel(llmChain, dispatch, "Draft notification text")
  Rel(llmChain, auditAppend, "Full record including LLM output")
  Rel(sheetsLookup, posSheet, "ISIN lookup")
  Rel(auditAppend, auditLog, "Append row")
  Rel(llmModel, llmApi, "Prompt + locked variables")
```

---

## 4. C4 — Component diagram (Formula Branches)

```mermaid
C4Component
  title BK1 — Formula Branch Components

  Component(dvca, "DVCA Branch", "Code node", "entitlement_cash = positionAsOfRecordDate × grossRatePerShare (half-up, 2 d.p.)")
  Component(dvse, "DVSE Branch", "Code node", "entitlement_shares = floor(pos × stockDividendRatio); fractional_cash = remainder × fractionalCashPrice")
  Component(splf, "SPLF Branch", "Code node", "new_position = pos × (a/b); entitlementCash = 0; entitlementShares = 0")
  Component(rhts, "RHTS Branch", "Code node", "rights_entitlement = pos × rightsRatio; if VOLU → PENDING_ELECTION, not auto-credit")
  Component(tendChos, "TEND/CHOS Branch", "Code node", "Generates one PENDING_ELECTION record per option in optionDetails; no automatic entitlement")

  Component(constBlock, "Constants Block", "Top of each Code node", "ROUNDING_DP=2; TIER_URGENT_DAYS=3; TIER_REMINDER_DAYS=10 — never inline literals")
```

---

## 5. Technology stack

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| Workflow engine | n8n Community Edition | ≥ 1.40 | See ADR-002 |
| Entitlement computation | n8n Code node (JavaScript) | Built-in | Deterministic, auditable, no external dependency |
| AI / NLG | Basic LLM Chain node | Built-in | See ADR-001 — Agent node explicitly prohibited |
| Position SoR (mock) | Google Sheets | Google Workspace | See ADR-002 |
| Audit trail | Google Sheets | Google Workspace | Append-only; no DB dependency for MVP |
| Notification | Gmail / Slack | n8n nodes | Configurable; no hard-coded channel |
| LLM provider | OpenAI GPT-4o (or equivalent) | Any n8n-supported | Provider-agnostic; credential is swappable |
| Hosting | n8n Cloud / self-hosted | — | EEA region preferred (GDPR-Art44-001) |

---

## 6. Integration points

| Integration | Direction | Protocol | Auth | Synthetic? |
|---|---|---|---|---|
| SWIFT/vendor CA feed | Inbound | HTTP POST / Webhook | Secret header token (NFR-003) | **Yes — simulated** |
| Google Sheets position book | Outbound read | Sheets API v4 | OAuth2 credential | **Yes — mock data** |
| Google Sheets audit trail | Outbound write | Sheets API v4 | OAuth2 credential | **Yes — mock data** |
| LLM provider | Outbound | REST / OpenAI API | API key credential | No (real API call) |
| Gmail / Slack | Outbound | SMTP / Slack API | OAuth2 / bot token credential | **Yes — test recipients** |

---

## 7. NFR allocation

| NFR ID | NFR | Architectural mechanism |
|---|---|---|
| NFR-001 | 30s end-to-end for ≤50 positions | Switch + parallel Code branches; no blocking synchronous loops |
| NFR-002 | 99.5% business-hours availability | n8n uptime monitoring (see `08-monitoring-slo-spec.md`) |
| NFR-003 | Credential isolation | n8n credential store; secret header on Webhook |
| NFR-004 | Data minimisation | Sheets schema limited to fields in `requirements.md` §6.4/§6.6 |
| NFR-005 | Reproducibility | No random or time-sensitive logic in formula nodes; `positionAsOfRecordDate` only |
| NFR-006 | Named constants | `CONST_*` block at top of every Code node |
| NFR-007 | Observability | Audit trail append + n8n execution log (see `08-monitoring-slo-spec.md`) |
| NFR-008 | Portability | All credentials as n8n credential store references; sample data bundled |

---

## 8. Architecture decisions

Key decisions are recorded as ADRs:

- **ADR-001** — Basic LLM Chain over Agent node (`02a-architecture-decision-records/ADR-001-code-node-over-agent.md`)
- **ADR-002** — Google Sheets as mock system of record (`02a-architecture-decision-records/ADR-002-google-sheets-mock-sor.md`)
