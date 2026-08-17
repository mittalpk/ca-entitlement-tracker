# 15 — Post-Implementation Review

**Workflow ID:** BK1
**Document:** 15-post-implementation-review.md
**Version:** 1.0
**Author role:** Senior AI Solution Architect
**Status:** Template — to be completed after first production/demo cycle
**Last updated:** 2026-07-30

---

## How this fits

This is a lessons-learned template for BK1. It is **not to be filled in before the first production or demo cycle** — it is a structured placeholder. It consumes all preceding documents in the suite as inputs to the review. It feeds back into future iterations of the `requirements.md`, `Executionplan.md`, and `PromptLib/` prompt templates.

> **Status note:** This document will remain in `Template` status until the first production deployment or portfolio demo cycle is complete. Do not populate with estimated or invented outcomes.

---

## 1. Review scope

**Review trigger:** First of: (a) first production go-live, (b) first portfolio demo to an interviewer/stakeholder, (c) six months from build completion — whichever comes first.

**Review participants:**
- Technology / Workflow Engineer
- Compliance Officer
- Corporate Actions Operations Team representative
- Asset Servicing Risk & Control representative
- Senior AI Solution Architect (facilitator)

---

## 2. Achievement against success criteria

| Success criterion | Target | Actual result | Pass / Fail | Notes |
|---|---|---|---|---|
| All 5 formula branches pass TC-001–TC-007 | 100% | {result} | {P/F} | |
| BREACH detection (TC-004) | Pass | {result} | {P/F} | |
| Audit trail completeness | 100% | {result} | {P/F} | |
| LLM boundary enforcement | 100% | {result} | {P/F} | |
| Clean import on fresh n8n ≥ 1.40 | Pass | {result} | {P/F} | |
| MiFID II record-keeping | Audit trail reproducible | {result} | {P/F} | |

---

## 3. What worked well

*(To be completed post-cycle)*

---

## 4. What did not work / unexpected challenges

*(To be completed post-cycle)*

---

## 5. Deviations from the requirements document

| Requirement ID | Original requirement | What was actually implemented | Reason for deviation |
|---|---|---|---|
| *(To be populated if any deviations occurred)* | | | |

---

## 6. Lessons learned for the prompt library and portfolio templates

| Lesson | Applicable to | Action |
|---|---|---|
| *(To be completed post-cycle)* | | |

---

## 7. Recommended improvements for v2.0

*(To be completed post-cycle — do not speculate before the first cycle)*

---

## 8. Open items not completed in v1.0

| Item | Reason not completed | Owner | Target in v2.0 |
|---|---|---|---|
| Tax withholding calculation | Explicitly out of scope (`requirements.md` §1.2) | Corporate Actions Ops | v2.0 scope decision |
| Live SWIFT connectivity | Simulated via Webhook in MVP (ADR-002 pattern) | Technology / Workflow Engineer | v2.0 infrastructure decision |
| Multi-currency conversion | Out of scope (`requirements.md` §1.2) | Corporate Actions Ops | v2.0 scope decision |
| Automated retention/erasure from Google Sheets | Production gap (ADR-002) | Data Governance Lead | Pre-production requirement |

---

## 9. Sign-off

| Reviewer | Role | Signature | Date |
|---|---|---|---|
| | Technology / Workflow Engineer | | |
| | Compliance Officer | | |
| | Corporate Actions Ops Team | | |
| | Asset Servicing Risk & Control | | |
| | Senior AI Solution Architect | | |
