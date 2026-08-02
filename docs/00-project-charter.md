# 00 — Project Charter

**Workflow ID:** BK1
**Document:** 00-project-charter.md
**Version:** 1.0
**Author role:** Senior AI Solution Architect
**Status:** Draft
**Last updated:** 2026-07-30

---

## How this fits

This charter is the top-level authorisation document for BK1. It is consumed by every downstream document in the suite — particularly `02-architecture-spec.md` (which refines the technical scope) and `09-governance-boundaries.md` (which implements the compliance obligations stated here). It references `requirements.md` §1–§3 for scope and stakeholder detail and `Executionplan.md` for build-sequencing context; it does not restate content from either.

---

## 1. Vision & problem statement

Custodians and asset servicers process corporate-action notifications (SWIFT MT564 / ISO 20022 seev.031) using a mix of vendor systems and manual spreadsheet cross-checks. The highest-risk failure mode is a **missed voluntary-election deadline** — an irreversible incident causing direct client monetary loss. BK1 automates the entitlement-calculation and deadline-escalation path for five event types (DVCA, DVSE, SPLF, RHTS, TEND/CHOS) using deterministic Code-node logic, bounded LLM drafting, and an append-only audit trail — demonstrating production-grade automation judgment suitable for an institutional asset-servicing context.

See `requirements.md` §1.1 for the full problem statement.

---

## 2. Success criteria

| Criterion | Target | Measurement |
|---|---|---|
| All 5 event-type formulas execute correctly | 100% pass on TC-001–TC-007 | Test-plan evidence (`05-test-plan-edge-matrix.md`) |
| Breach-detection coverage | TC-004 (1 day past deadline) passes without exception | Test evidence |
| Audit trail completeness | Every execution produces an append-only row with all 17 fields populated | AC-017 |
| LLM boundary enforcement | No financial figure in LLM output that was not passed as a locked input | AC-014 |
| Clean import on fresh n8n ≥ 1.40 | Zero manual configuration beyond credentials listed in `SETUP.md` | Portability test |
| MiFID II record-keeping | Audit trail records sufficient to reconstruct any calculation from the log alone | MIFID-ART25-002 |

---

## 3. Scope

**In scope:** As defined in `requirements.md` §1.2 (in scope items).

**Out of scope:** As defined in `requirements.md` §1.2 (out of scope items). Key exclusions: live SWIFT connectivity, tax withholding, multi-currency conversion, settlement-instruction generation.

---

## 4. High-level timeline

| Phase | Milestone | Ref |
|---|---|---|
| Requirements | `requirements.md` v1.0 complete | Done — 2026-07-30 |
| Architecture & design | `02-architecture-spec.md`, ADRs, data contract, security, AI model card | Week 1 of build sprint |
| Build — MVP | All 5 formula branches, 4-tier escalation, LLM chain, audit trail | `Executionplan.md` BK-series build week |
| Test | TC-001–TC-008 pass; edge cases including TC-004 (breach) | Following build week |
| Hardening | Monitoring, rollback, runbook | `Executionplan.md` hardening week |
| Demo / portfolio review | Interview-ready artefact package | Per `Executionplan.md` interview sequencing |

---

## 5. RACI

As defined in `requirements.md` §2. Reproduced here for charter completeness:

| Stakeholder | R | A | C | I |
|---|---|---|---|---|
| Corporate Actions Operations Team | R | | C | |
| Custody Client | | | | I |
| Asset Servicing Risk & Control | | A | C | |
| Technology / Workflow Engineer | R | | | |
| Compliance Officer | | A | C | |
| Data Governance Lead | | | A | I |
| {system_owner} | | A | | I |

---

## 6. Budget & resources

**Tooling:** n8n Community Edition (free), Google Sheets (existing Google Workspace), OpenAI API or equivalent (existing credential). No incremental licence cost for MVP.

**Effort estimate:** 1 senior engineer × 3–4 days build + 1 day test/hardening.

---

## 7. Key risks (summary)

Full RAID log in `12-risk-register-raid-log.md`. Top three:

1. **LLM hallucination on financial figures** — mitigated by passing entitlement values as locked prompt variables (FR-017); the LLM never computes.
2. **Record-date position substitution** — mitigated by structural field naming (`positionAsOfRecordDate` is the only field the formula Code nodes may read; NFR-005).
3. **Missed breach test case** — mitigated by TC-004 being a mandatory, not optional, test case (`05-test-plan-edge-matrix.md`).

---

## 8. Assumptions & constraints

As defined in `requirements.md` §10. No additional charter-level assumptions.

---

## 9. Approval

| Role | Name | Signature | Date |
|---|---|---|---|
| Executive sponsor / system owner | {system_owner} | | |
| Compliance Officer | {compliance_officer} | | |
| Data Governance Lead | {data_governance_lead} | | |
