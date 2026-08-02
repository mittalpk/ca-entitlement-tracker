# 13 — Change Management Plan

**Workflow ID:** BK1
**Document:** 13-change-management-plan.md
**Version:** 1.0
**Author role:** Senior AI Solution Architect
**Status:** Draft
**Last updated:** 2026-07-30

---

## How this fits

This document is the ITIL v4-aligned change management plan for BK1. It consumes `09-governance-boundaries.md` (SOX-IC-001: formula changes require approval) and `07-rollback-recovery.md` (rollback procedure, which is the emergency change path). It is consumed by `12-risk-register-raid-log.md` (R-008: credential discipline). It does not restate workflow content.

---

## 1. Change classification

| Class | Definition | Examples | Approval required |
|---|---|---|---|
| Standard | Pre-approved, low-risk, repeatable change | Credential rotation; Slack channel name update; Google Sheets tab rename | Workflow Engineer (self-approved) |
| Normal | Non-trivial change requiring review | Formula constant update (e.g. rounding threshold); LLM prompt version update; new formula branch | Workflow Engineer + Compliance Officer sign-off |
| Emergency | Urgent change to restore service | Rollback to previous version; credential regeneration after compromise | Workflow Engineer + verbal Corporate Actions Operations Lead approval; documented within 24h |

---

## 2. Change process

### Standard change
1. Document change intent in this log (§4).
2. Make change in n8n.
3. Run TC-001–TC-008 smoke test.
4. Export workflow JSON with empty credentials.
5. Update log with result.

### Normal change
1. Open a change request in this log (§4) with: description, rationale, risk assessment, test plan.
2. Submit to Compliance Officer for review (formula changes) or Data Governance Lead (schema changes).
3. Implement in a test/inactive workflow version.
4. Run full test suite (`05-test-plan-edge-matrix.md` TC + I + E tests).
5. Obtain approval signatures in §4.
6. Promote to active workflow.
7. Export and store versioned JSON backup.

### Emergency change
1. Implement change immediately to restore service.
2. Notify Corporate Actions Operations Lead verbally.
3. Document in §4 within 24 hours with full rationale.
4. Run TC-001–TC-008 as soon as service is stable.
5. Formal retrospective within 5 business days.

---

## 3. Versioning scheme

| Artefact | Versioning | Method |
|---|---|---|
| Workflow definition | Semantic version: MAJOR.MINOR.PATCH | Embedded in workflow sticky note on canvas; n8n version history (Cloud) or exported JSON filename (self-hosted) |
| Requirements document | Version in document header | `requirements.md` version field |
| Prompt version | `v{n}` suffix | `03b-ai-governance-model-card.md` §4 |
| Formula Code node | Version comment at top of node | `// BK1 DVCA formula v1.0` |

**Breaking change definition:** Any change to a formula, rounding rule, escalation threshold, or audit trail schema is a MAJOR version increment and requires Normal change process.

---

## 4. Change log

| Change ID | Date | Class | Description | Approved by | Test result | Workflow version after |
|---|---|---|---|---|---|---|
| C-001 | 2026-07-30 | — | Initial v1.0 — new workflow | N/A (first version) | TC-001–TC-008 to be run at build | 1.0.0 |
| *(future changes here)* | | | | | | |

---

## 5. Release notes template

```markdown
## BK1 v{MAJOR}.{MINOR}.{PATCH} — Release Notes

**Date:** {date}
**Change class:** Standard / Normal / Emergency
**Changed by:** {name}
**Approved by:** {name}

### Summary of changes
{1–3 sentence description}

### Affected nodes
{list of changed n8n nodes}

### Test evidence
{TC IDs executed and result}

### Rollback procedure
If this release causes a regression: follow `07-rollback-recovery.md` §4 to restore v{previous version}.
```
