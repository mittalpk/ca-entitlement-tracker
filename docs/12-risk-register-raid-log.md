# 12 — Risk Register & RAID Log

**Workflow ID:** BK1
**Document:** 12-risk-register-raid-log.md
**Version:** 1.0
**Author role:** Senior AI Solution Architect
**Status:** Draft
**Last updated:** 2026-07-30

---

## How this fits

This document is the PMBOK-lite RAID (Risks / Assumptions / Issues / Dependencies) log for BK1. It consumes `00-project-charter.md` §7 (top risks), `requirements.md` §10 (assumptions, constraints, dependencies), and `backlog/UNIQUENESS-AUDIT-REPORT.md` §3 BK1 (overlap risk — supersedes the earlier, evidence-free `UNIQUENESS-CHECK.md` per `backlog/README.md`). It is consumed by `09-governance-boundaries.md` (open governance items) and `13-change-management-plan.md` (risk-driven change triggers).

---

## 1. Risk register

| Risk ID | Risk description | Likelihood | Impact | Risk rating | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
| R-001 | LLM hallucinates a financial figure not in locked inputs | Low | Critical | High | Basic LLM Chain node (ADR-001); DQ-011 post-validation; fallback template | Technology / Workflow Engineer | Open — mitigated |
| R-002 | Record-date position substituted with live position (coding error in formula node) | Low | Critical | High | `positionAsOfRecordDate` field naming convention; NFR-005 reproducibility; nightly regression TC-001–TC-006 | Workflow Engineer | Open — mitigated |
| R-003 | BREACH test case (TC-004) not exercised before production | Low-Medium | High | High | TC-004 is a mandatory test (not optional); `05-test-plan-edge-matrix.md` §2 | Workflow Engineer | Open — controlled |
| R-004 | Prompt injection via optionDetails[].description | Low | High | Medium | Input sanitisation in Code node before prompt assembly; `03b-ai-governance-model-card.md` §4.2 | Workflow Engineer | Open — mitigated |
| R-005 | Google Sheets audit trail write race condition under parallel executions | Low (MVP: single-event processing) | Medium | Low | Acceptable for MVP; production requires database with row-locking (ADR-002 production gap) | Data Governance Lead | Open — accepted for MVP |
| R-006 | LLM provider model deprecated mid-year | Medium | Medium | Medium | Model version pinned; annual review (ISO42001-LC-001); fallback template available | Workflow Engineer | Open — controlled |
| R-007 | Portfolio uniqueness overlap risk (public template similarity) | Low | Medium | Medium | Uniqueness differentiated by: 5 named event-type formulas, record-date structural constraint, 4-tier escalation with breach case. See `backlog/UNIQUENESS-AUDIT-REPORT.md` §3 BK1 | {system_owner} | Open — documented |
| R-008 | Credential exported in workflow JSON (security risk) | Low | High | High | `SETUP.md` rule 4; credential placeholder discipline enforced before every export | Workflow Engineer | Open — process control |

---

## 2. Assumptions log

All assumptions from `requirements.md` §10.1 are carried over by reference. Additional assumptions:

| Assumption ID | Assumption | Impact if wrong | Owner |
|---|---|---|---|
| ASM-001 | Position book populated with accurate `positionAsOfRecordDate` before workflow runs | Incorrect entitlement calculated; not detectable by workflow | Data Governance Lead |
| ASM-002 | Webhook exposed only on internal network / authenticated gateway | Spoofing attack possible (R-008) | Technology / Workflow Engineer |
| ASM-003 | `electionDeadline` non-null for VOLU/CHOS events | Null-pointer error in IF node | Workflow Engineer |
| ASM-004 | LLM API available during business hours | Falls back to template notification | Workflow Engineer |
| ASM-005 | Multi-currency conversion out of scope | Entitlement figures in event currency only | Corporate Actions Ops |
| ASM-006 | Google Sheets OAuth2 auto-refresh is enabled | Audit trail write fails silently if token expired (FM-004) | Workflow Engineer |

---

## 3. Issues log

| Issue ID | Description | Raised date | Severity | Resolution | Status |
|---|---|---|---|---|---|
| *(To be populated during build)* | | | | | |

---

## 4. Dependencies log

All dependencies from `requirements.md` §10.3 are carried over by reference:

| Dep ID | Dependency | Risk if unavailable | Mitigation |
|---|---|---|---|
| DEP-001 | Google Sheets API (OAuth2) | Position lookup and audit trail fail | OAuth2 auto-refresh; monitoring AL-001 |
| DEP-002 | LLM provider API | Notification drafting fails | Fallback template (`07-rollback-recovery.md` §3) |
| DEP-003 | Gmail / Slack API | Notification dispatch fails | Runbook FM-003; manual dispatch override |
| DEP-004 | n8n instance | Entire workflow unavailable | Recovery procedure `07-rollback-recovery.md` §5 |
| DEP-005 | Google Workspace (EEA region) | GDPR-Art44-001 transfer mechanism required | Verify region; apply SCCs if needed (`03-data-contract.md` §7) |
