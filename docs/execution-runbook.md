# Execution Runbook — BK1 Corporate Actions Entitlement Calculator & Voluntary-Election Deadline Tracker

**Workflow ID:** BK1
**Document:** execution-runbook.md
**Version:** 1.0
**Author role:** Senior AI Solution Architect
**Status:** Approved (2026-08-17)
**Last updated:** 2026-07-30

---

## How this fits

This is the **build-execution runbook** — distinct from `06-runbook.md` (the operational/incident runbook for a system already in production). It consumes `00-phase-checkpoints.md` (the stage-gate model) and `backlog/INDEX.md` (and the individual `BK1-US-0xx.md` story files it links) (the ordered backlog). It is the file a builder opens each morning to know exactly what to do next, and it is the file that determines what gets logged in `log.md` as work proceeds.

**Current position in this runbook: end of Phase 2, start of Phase 3.** Phases 1–2 are content-complete (see honest-state summary in `00-phase-checkpoints.md`); Phases 3–6 have not been entered. The step lists below for Phases 3–6 are therefore the **plan to execute**, not a record of execution.

**Executionplan.md alignment:** BK1 is scheduled as a week-1 build in the BK/IN/OT marketplace track (`Executionplan.md` line 22). Phase 3 below is scoped to fit inside that single build week; Phase 4 begins in the following week per `00-project-charter.md` §4.

---

## Phase 1 — Discovery & Requirements Sign-off (COMPLETE — content; sign-off open)

| Order | Story | Action | Document(s) produced/updated | Check progress against |
|---|---|---|---|---|
| 1 | BK1-US-001 | Draft functional/non-functional requirements | `requirements.md` §4–§5 | `00-phase-checkpoints.md` Phase 1 exit criteria |
| 2 | BK1-US-002 | Map regulatory obligations to requirement IDs | `requirements.md` §7 | same |
| 3 | BK1-US-003 | Define data model, classification, retention | `requirements.md` §6 | same |
| 4 | BK1-US-004 | Define acceptance criteria and test cases | `requirements.md` §9 | same |
| 5 | BK1-US-005 | **OPEN:** Obtain formal sign-off signatures | `00-project-charter.md` §9 | Phase 1 "CONDITIONAL GO" note |

**Next action for a builder:** Obtain the three blank signatures in `00-project-charter.md` §9, or explicitly accept the CONDITIONAL GO status and proceed (portfolio context — no real external sponsor exists to sign).

---

## Phase 2 — Architecture & Design (COMPLETE — content; sign-off open)

| Order | Story | Action | Document(s) produced/updated | Check progress against |
|---|---|---|---|---|
| 1 | BK1-US-006 | Draft C4 architecture spec + node map | `02-architecture-spec.md` | Phase 2 exit criteria |
| 2 | BK1-US-007 | Record ADR-001 (Code vs. Agent node), ADR-002 (Sheets mock SoR) | `02a-architecture-decision-records/ADR-001-*.md`, `ADR-002-*.md` | same |
| 3 | BK1-US-008 | Draft data contract | `03-data-contract.md` | same |
| 4 | BK1-US-009 | Draft STRIDE/Zero Trust security architecture | `03a-security-architecture.md` | same |
| 5 | BK1-US-010 | Draft AI governance model card | `03b-ai-governance-model-card.md` | same |
| 6 | BK1-US-011 | Draft deterministic logic spec (pseudocode) | `04-deterministic-logic-spec.md` | same |
| 7 | BK1-US-012 | **OPEN:** Promote all Phase 2 docs to Reviewed/Approved | all of the above | Phase 2 "CONDITIONAL GO" note |

**Next action for a builder:** Either promote document statuses with a named reviewer, or proceed to Phase 3 under the same CONDITIONAL GO acceptance as Phase 1.

---

## Phase 3 — Core Build (Alpha) (NOT STARTED)

**Entry check:** Confirm n8n ≥ 1.40 instance, Google Sheets mock position book + audit trail, Webhook secret token, and Gmail/Slack credentials are provisioned per `SETUP.md` before starting story 1 below.

| Order | Story | Action | Document(s) produced/updated | Check progress against |
|---|---|---|---|---|
| 1 | BK1-US-013 | Build Webhook + Validation Code node | (new) workflow JSON | Phase 3 exit criteria, `05-test-plan-edge-matrix.md` §6 |
| 2 | BK1-US-014 | Build Google Sheets Lookup node (record-date only) | workflow JSON | AC-003, AC-004 |
| 3 | BK1-US-015 | Build Switch + 5 formula Code branches (DVCA/DVSE/SPLF/RHTS/TEND-CHOS) | workflow JSON | TC-001–TC-007 |
| 4 | BK1-US-016 | Build IF-node deadline gate (4-tier escalation) | workflow JSON | TC-003, TC-004, boundary table |
| 5 | BK1-US-017 | Build Basic LLM Chain node (no Agent node) | workflow JSON | AC-014, AC-015 |
| 6 | BK1-US-018 | Build Gmail/Slack dispatch (separate urgent/breach channel) | workflow JSON | AC-016 |
| 7 | BK1-US-019 | Build Google Sheets Append (audit trail, 17 fields) | workflow JSON | AC-017 |
| 8 | BK1-US-020 | Export workflow JSON; verify fresh-instance import | workflow JSON export file | NFR-008, E-003 |
| 9 | *(added 2026-08-16)* | Build `Merge Lookup with Payload` Code node between Sheets Lookup and Switch — restores the webhook payload n8n's lookup node silently drops | workflow JSON | `BK1-ISS-004` |
| 10 | *(added 2026-08-16)* | Build `OpenAI Chat Model` node, wire to Basic LLM Chain via `ai_languageModel` — a bare credential on the chain node is not sufficient | workflow JSON | `BK1-ISS-003` |
| 11 | *(added 2026-08-16)* | Move webhook auth from a manual in-code secret comparison to the Webhook node's native Header Auth credential — the manual version failed open on a missing header | workflow JSON | `BK1-ISS-002` |

**Next action for a builder:** Stories 1–8 plus the three 2026-08-16 additions above are done — `workflow.json` exists and passes functional (Node.js-level logic) testing, but **has never been imported into or run inside an actual n8n instance.** That's the actual next action: import, provision real credentials per `SETUP.md`, and run the Phase 4 test suite below for real — do not treat Phase 3 as fully closed until that happens. Log any blocking issue encountered in `log.md` using the next available `BK1-ISS-0xx` ID (currently at `BK1-ISS-004`).

---

## Phase 4 — Test & Hardening (NOT STARTED)

**Entry check:** Phase 3 exit criteria met (working alpha build, exported JSON).

| Order | Story | Action | Document(s) produced/updated | Check progress against |
|---|---|---|---|---|
| 1 | BK1-US-021 | Execute all unit tests TC-001–TC-008 (+TC-001b, TC-002b) | `05-test-plan-edge-matrix.md` (results recorded) | Phase 4 exit criteria |
| 2 | BK1-US-022 | Execute integration tests I-001–I-004 | same | same |
| 3 | BK1-US-023 | Execute E2E tests E-001–E-003 | same | same |
| 4 | BK1-US-024 | Execute UAT U-001–U-002 with real stakeholder roles | same | same |
| 5 | BK1-US-025 | Execute malformed-input matrix (§6) | same | same |
| 6 | BK1-US-026 | Measure KPI-001–KPI-005; populate §4 table | `10-kpi-baseline-and-impact.md` §4 | KPI-001–005 targets |
| 7 | BK1-US-027 | Execute one rollback/recovery drill | `07-rollback-recovery.md` §6 evidence log | NIST-MANAGE-001 |

**Next action for a builder:** Do not skip TC-004 (BREACH) — it is the single highest-value test case in this workflow given BR-002. Record every result, pass or fail, in `05-test-plan-edge-matrix.md` directly (add a "Result" column if not already present) and log any failure as a `BK1-ISS-0xx` entry in `log.md`.

---

## Phase 5 — Production-Readiness Gate (NOT STARTED)

**Entry check:** Phase 4 exit criteria met (real test evidence, real KPI values).

| Order | Story | Action | Document(s) produced/updated | Check progress against |
|---|---|---|---|---|
| 1 | BK1-US-028 | Complete DPIA trigger assessment + EEA region verification | `09-governance-boundaries.md` §5 | GDPR-Art35-001, GDPR-Art44-001 |
| 2 | BK1-US-029 | Run one real change through change-management process | `13-change-management-plan.md` | SOX-IC-001 |
| 3 | BK1-US-030 | Run first quarterly audit-trail attestation | `08-monitoring-slo-spec.md` SLO-003 | SOX-AT-001 |
| 4 | BK1-US-031 | Run first LLM output quality sample review | `03b-ai-governance-model-card.md` §7 | ISO42001-CI-001 |
| 5 | BK1-US-032 | Promote all 18 documents to Reviewed/Approved | all `docs/*.md` | Phase 5 exit criteria |

**Next action for a builder:** This phase is only required for an actual production deployment claim. For portfolio/demo-only use, this phase may be explicitly skipped with a documented caveat (see Phase 6 entry criteria) — do not silently skip without stating so.

---

## Phase 6 — Release Readiness Gate (NOT STARTED)

**Entry check:** Phase 5 complete, OR Phase 4 complete with an explicit "demo-only, not production-approved" caveat.

| Order | Story | Action | Document(s) produced/updated | Check progress against |
|---|---|---|---|---|
| 1 | BK1-US-033 | Rehearse `11-demo-script.md` end-to-end against real build | `11-demo-script.md` (rehearsal note) | Phase 6 exit criteria |
| 2 | BK1-US-034 | Annotate demo script with KPI synthetic-data caveats | `11-demo-script.md` | `10-kpi-baseline-and-impact.md` §3 |
| 3 | BK1-US-035 | Review RAID log for currency | `12-risk-register-raid-log.md` | — |
| 4 | BK1-US-036 | Confirm Batch-C positioning discipline before any pitch | (talking points, not a doc) | `Executionplan.md` lines 148, 269 |
| 5 | BK1-US-037 | Complete PIR **only** at its real trigger point | `15-post-implementation-review.md` | §1 trigger condition |

**Next action for a builder:** Nothing in this phase should be started before Phase 4 evidence exists. Do not pre-fill `15-post-implementation-review.md`.

---

## Where to check overall progress

- Phase-level gate status: `00-phase-checkpoints.md`.
- Story-level detail and Definition of Ready/Done: `backlog/INDEX.md` (and the individual `BK1-US-0xx.md` story files it links).
- Running issue/incident narrative: `log.md`.
