# 09 — Governance Boundaries & Compliance Traceability Closure

**Workflow ID:** BK1
**Document:** 09-governance-boundaries.md
**Version:** 1.0
**Author role:** Senior AI Solution Architect
**Status:** Draft
**Last updated:** 2026-07-30

---

## How this fits

This document is the traceability-closure document for BK1. It consumes all other documents in the suite and resolves every compliance requirement ID from `requirements.md` §7 to a specific control implemented somewhere in this documentation set. It is the final checkpoint before the portfolio is submitted for compliance review. It does not restate regulatory text — it cross-references by requirement ID.

---

## 1. Deterministic vs. AI decision authority

| Decision | Authority | Node | Overrideable by LLM? |
|---|---|---|---|
| Entitlement cash amount (DVCA) | Deterministic Code node | DVCA formula branch | **No — structurally impossible (ADR-001)** |
| Entitlement shares & fractional cash (DVSE) | Deterministic Code node | DVSE formula branch | No |
| New position after split (SPLF) | Deterministic Code node | SPLF formula branch | No |
| Rights entitlement / pending-election status (RHTS) | Deterministic Code node | RHTS formula branch | No |
| Election-tracking record generation (TEND/CHOS) | Deterministic Code node | TEND/CHOS formula branch | No |
| Escalation tier classification (INFORMATIONAL/REMINDER/URGENT/BREACH) | Deterministic IF node | Deadline Gate | No |
| `incidentFlag` value | Deterministic Code node | Audit record assembly | No |
| Notification text content | LLM (Basic LLM Chain) | LLM Notification Drafter | Yes — but constrained to text only; all figures are locked inputs |
| `breachNotes` text | LLM (Basic LLM Chain) | LLM Notification Drafter | Yes — text only; does not alter breach determination |

---

## 2. Human-approval gate inventory

| Gate | Trigger | Approver | Documented in |
|---|---|---|---|
| BREACH event review | `incidentFlag=TRUE` in audit trail | Asset Servicing Risk & Control | `06-runbook.md` §3 FM-005 |
| LLM output DQ-011 failure | Unexpected numeric figure in LLM output | Technology / Workflow Engineer → Compliance Officer | `06-runbook.md` §3 FM-006 |
| Formula Code node change | Any edit to a formula Code node | Workflow Engineer + Compliance Officer approval | `13-change-management-plan.md` |
| Annual model card review | ISO42001-LC-001 review cycle | Technology / Workflow Engineer + Compliance Officer | `03b-ai-governance-model-card.md` §7 |
| Quarterly audit trail attestation | SOX-AT-001 | Asset Servicing Risk & Control (independent reviewer) | `08-monitoring-slo-spec.md` SLO-003 |

---

## 3. Compliance traceability closure

Every compliance requirement ID from `requirements.md` §7 is resolved below. This table constitutes the traceability closure.

### 3.1 GDPR

| Req ID | Control | Implemented in |
|---|---|---|
| GDPR-Art6-001 | Lawful basis documented; processing grounded in contract performance | `03-data-contract.md` §2 |
| GDPR-Art5-001 | Data minimisation enforced by Google Sheets schema (only required fields) | `03-data-contract.md` §8 |
| GDPR-Art5-002 | Purpose limitation: data used only for entitlement calculation and MiFID II record-keeping | `03-data-contract.md` §2 |
| GDPR-Art35-001 | DPIA trigger assessment to be conducted at go-live | `00-project-charter.md` §7 (risk item) |
| GDPR-Art17-001 | Erasure procedure documented: clientId-linked rows purged after 7-year retention | `03-data-contract.md` §6 |
| GDPR-Art44-001 | Google SCC transfer mechanism; EEA data region verification required | `03-data-contract.md` §7; `03a-security-architecture.md` §2 |

### 3.2 EU AI Act

| Req ID | Control | Implemented in |
|---|---|---|
| EUAIACT-CLASS-001 | Risk tier classification: Limited-risk (text drafting from locked inputs) | `03b-ai-governance-model-card.md` §2 |
| EUAIACT-LR-001 | AI-generated content disclosure in every LLM-drafted notification | `03b-ai-governance-model-card.md` §6; `03b` §4.1 prompt template |
| EUAIACT-HR-001 | High-risk reclassification trigger documented; conditional — not currently applicable | `03b-ai-governance-model-card.md` §2; ADR-001 |
| EUAIACT-LOG-001 | LLM inputs and outputs captured in n8n execution log | `08-monitoring-slo-spec.md` §6 |

### 3.3 ISO/IEC 42001

| Req ID | Control | Implemented in |
|---|---|---|
| ISO42001-POL-001 | AI policy: bounded role, approved model, review cadence | `03b-ai-governance-model-card.md` §1 and §3 |
| ISO42001-RISK-001 | Risk assessment: hallucination (mitigated by locked inputs), prompt injection (mitigated by sanitisation) | `03b-ai-governance-model-card.md` §5 |
| ISO42001-LC-001 | Annual model version review; version pinned | `03b-ai-governance-model-card.md` §1, §7 |
| ISO42001-CI-001 | Quarterly output quality review; evidence log | `03b-ai-governance-model-card.md` §7 |

### 3.4 MiFID II / EMIR

| Req ID | Control | Implemented in |
|---|---|---|
| MIFID-ART25-001 | Audit trail captures all processing detail; 7-year retention | `03-data-contract.md` §6; `08-monitoring-slo-spec.md` §6 |
| MIFID-ART25-002 | Audit trail records formula parameters (e.g. `grossRatePerShare`) at time of processing, not just output | `requirements.md` §6.6 audit trail schema; `04-deterministic-logic-spec.md` §6 |
| MIFID-BEST-001 | Voluntary election deadline communicated with sufficient notice; URGENT tier at <3 days | `requirements.md` FR-015; `04-deterministic-logic-spec.md` §5 |
| EMIR-001 | N/A — explicitly documented; no OTC derivative trades in scope | `requirements.md` §7.4 EMIR-001 |

### 3.5 NIST AI RMF

| Req ID | Control | Implemented in |
|---|---|---|
| NIST-GOV-001 | AI governance policy documented in model card | `03b-ai-governance-model-card.md` §3 |
| NIST-MAP-001 | Context of use documented: communication drafting only | `03b-ai-governance-model-card.md` §1, §4 |
| NIST-MEAS-001 | Quarterly output quality measurement | `03b-ai-governance-model-card.md` §7 |
| NIST-MANAGE-001 | Fallback procedure documented; escalation path defined | `07-rollback-recovery.md` §3; `06-runbook.md` §3 FM-003 |

### 3.6 SOX / SOC 2

| Req ID | Control | Implemented in |
|---|---|---|
| SOX-IC-001 | Formula Code node changes require approval; change management process | `13-change-management-plan.md` §2 |
| SOX-AT-001 | Quarterly audit trail attestation by independent reviewer | `08-monitoring-slo-spec.md` SLO-003 error budget policy |
| SOC2-SEC-001 | Access control: n8n, Sheets, audit trail restricted to authorised personnel | `03a-security-architecture.md` §6 |
| SOC2-AV-001 | Availability monitoring; downtime logged | `08-monitoring-slo-spec.md` SLO-001, AL-001 |

---

## 4. Audit-log schema compliance check

The audit trail schema in `requirements.md` §6.6 (17 columns) satisfies the following requirements:

| Column | Satisfies |
|---|---|
| `eventId`, `isin`, `clientId`, `eventType` | MIFID-ART25-001 — event identification |
| `positionAsOfRecordDate` | MIFID-ART25-002 — formula input at time of processing |
| `entitlementCash`, `entitlementShares`, etc. | MIFID-ART25-002 — formula output |
| `escalationTier`, `daysToDeadline` | MIFID-BEST-001 — election deadline tracking |
| `incidentFlag`, `breachNotes` | FR-025 — breach incident record |
| `processingTimestampUTC` | MIFID-ART25-001 — event timestamp |
| `workflowRunId` | NFR-007 — execution correlation |

---

## 5. Open governance items (to be resolved at go-live)

| Item | Owner | Target date |
|---|---|---|
| DPIA trigger assessment (GDPR-Art35-001) | Data Governance Lead | Before first production deployment |
| Google Workspace EEA region verification (GDPR-Art44-001) | Technology / Workflow Engineer | Before first production deployment |
| First quarterly audit trail attestation (SOX-AT-001) | Asset Servicing Risk & Control | 90 days after go-live |
| First LLM output quality sample review (ISO42001-CI-001) | Technology / Workflow Engineer | 90 days after go-live |
| Recovery drill execution and evidence log population (`07-rollback-recovery.md` §6) | Technology / Workflow Engineer | During hardening phase |
