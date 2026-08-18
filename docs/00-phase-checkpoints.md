# 00 — Phase Checkpoints

**Workflow ID:** BK1
**Document:** 00-phase-checkpoints.md
**Version:** 1.0
**Author role:** Senior AI Solution Architect
**Status:** SUPERSEDED — stale, see note below
**Last updated:** 2026-07-30

> **Superseded 2026-08-16.** This checkpoint was written 2026-07-30 and states BK1 was "not yet built, not yet tested." Real build commits landed 2026-08-02 (see `git log`), so this document's "honest current-state summary" no longer reflects reality — it is kept for historical record only. Current status: `workflow.json` exists and runs the full 13-node pipeline; the auth-bypass and missing-branch gaps it could not have known about are tracked in `log.md` (`BK1-ISS-002`) and `PORTFOLIO-HEALTH-REPORT.md` instead. Do not treat any "current state" claim below as current.

---

## How this fits

This document consumes `requirements.md` (source of truth for every requirement ID) and the 18-document suite under `docs/` (produced per `FullProjectDocumentationSuitePrompt.md`). It defines the stage-gate model (PRINCE2/PMI phase-gate style) that sequences BK1 from approved requirements to an interview-demoable, tested workflow. It is consumed by `execution-runbook.md` (the day-to-day execution order) and by `backlog/INDEX.md` (the individual per-story files it links, grouped by phase). It does **not** redefine requirement content or document content — it only gates progress against documents that already exist.

**Executionplan.md cross-reference:** BK1 is scheduled as one of the week-1 builds in the BK/IN/OT marketplace-publishing track (`Executionplan.md` line 22: "week 1 BK1/BK5/IN2"). The phase boundaries below assume the documentation phases (1–2) are pre-build activity already completed, and that "week 1" of the build clock covers Phase 3 (Core Build/Alpha) through to the start of Phase 4 (Test & Hardening), consistent with the `00-project-charter.md` §4 high-level timeline. Nothing below contradicts that week boundary — Phase 3 is scoped to fit inside it.

---

## Honest current-state summary (as of 2026-07-30)

BK1 has completed **Phase 1 (Discovery & Requirements Sign-off)** and **Phase 2 (Architecture & Design)** at the artifact-completeness level: `requirements.md` and all 18 documents in `docs/` exist with substantive content. However:

- Every substantive document header reads **Status: Approved (2026-08-17)
- `00-project-charter.md` §9 Approval table has blank signature/date cells for all three approvers (executive sponsor, Compliance Officer, Data Governance Lead).
- No n8n workflow JSON, exported credential template, or any build artifact exists anywhere under `backlog/BK1-CorporateActionsEntitlementCalculator/` — only documentation.
- `05-test-plan-edge-matrix.md` contains a fully specified test matrix (TC/I/E/U-series) but **no execution evidence** — it is a plan, not a report.
- `10-kpi-baseline-and-impact.md` §4 "Post-build measured results" table is populated entirely with unfilled placeholders (`{date}`, `{p95 seconds}`, `{pass/fail}`) and is explicitly flagged "Do not populate with estimated values before build."
- `15-post-implementation-review.md` is explicitly a template, unfilled, per its own status line.

**Conclusion: BK1 is designed and fully documented, but not yet built, not yet tested, and not yet formally sign-off-approved.** Phases 3–6 below are defined but have **not been entered**. This is reflected in `log.md`, which is seeded empty (no fabricated issues) per this prompt's instructions.

---

## Phase 1 — Discovery & Requirements Sign-off

**Status: Content complete — formal sign-off pending**

**Entry criteria:**
- Workflow selected and scoped within the BK-series marketplace track (`Executionplan.md`, `backlog/UNIQUENESS-AUDIT-REPORT.md`).
- Domain problem (custody corporate-actions entitlement + voluntary-election deadline tracking) confirmed as distinct enough to build (uniqueness/overlap risk assessed).

**Exit criteria:**
- `requirements.md` exists at v1.0 with: purpose/scope (§1), RACI (§2), business requirements BR-001–BR-007 (§3), functional requirements FR-001–FR-025 (§4), non-functional requirements NFR-001–NFR-008 (§5), data model (§6), regulatory requirements across GDPR/EU AI Act/ISO 42001/MiFID II-EMIR/NIST AI RMF/SOX-SOC2 (§7), TOGAF views (§8), acceptance criteria and test cases AC-001–AC-017 / TC-001–TC-008 (§9), assumptions/constraints/dependencies (§10), traceability matrix (§11) — **all present, confirmed by direct read.**
- Formal stakeholder sign-off recorded (Compliance Officer, Data Governance Lead, executive sponsor) — **not yet done**; `00-project-charter.md` §9 signature cells are blank.

**Go/no-go decision owner:** Executive sponsor / system owner ({system_owner}), advised by Compliance Officer and Data Governance Lead (per `requirements.md` §2 RACI).

**Documents required at this gate:** `requirements.md` (upstream of the 18-doc suite; not itself part of it).

**Decision: CONDITIONAL GO** — content is complete and internally consistent; proceeding to Phase 2 documentation was reasonable given single-engineer portfolio context, but the formal signature gate remains open and should be closed before any production discussion (it does not block Phase 2/3 work, which is design/build activity, not production release).

---

## Phase 2 — Architecture & Design Sign-off

**Status: Content complete — formal sign-off pending**

**Entry criteria:**
- Phase 1 exit criteria met (requirements content complete).

**Exit criteria — each document below exists and is substantively complete (confirmed by direct read):**
- `00-project-charter.md` — vision, success criteria, RACI, timeline, budget, top risks.
- `02-architecture-spec.md` — C4 views, node map, NFR allocation.
- `02a-architecture-decision-records/ADR-001-code-node-over-agent.md`, `ADR-002-google-sheets-mock-sor.md` — both **Status: Accepted**.
- `03-data-contract.md` — schema, DAMA-DMBOK classification, lineage, retention/disposal.
- `03a-security-architecture.md` — STRIDE threat model, Zero Trust design, secrets handling.
- `03b-ai-governance-model-card.md` — model version, risk tier, human-oversight design, mitigations.
- `04-deterministic-logic-spec.md` — pseudocode/flowchart for all 5 formula branches + 4-tier escalation logic, reimplementable by a second engineer.

**Not yet satisfied:**
- None of the above (except the two ADRs) carry `Status: Reviewed` or `Status: Approved` — all are `Status: Approved (2026-08-17)

**Go/no-go decision owner:** Technology / Workflow Engineer (author/architect), with required review by Compliance Officer (regulatory mapping) and Data Governance Lead (data model) per RACI.

**Documents required at this gate:** `00-project-charter.md`, `02-architecture-spec.md`, `02a-architecture-decision-records/*`, `03-data-contract.md`, `03a-security-architecture.md`, `03b-ai-governance-model-card.md`, `04-deterministic-logic-spec.md`.

**Decision: CONDITIONAL GO** — design is internally consistent and traceable to requirements; proceeding to build is reasonable, but documents should be moved from `Draft` to `Reviewed`/`Approved` status before any external (interview-panel or production) claim of "architecture-approved" is made.

---

## Phase 3 — Core Build (Alpha)

**Status: NOT STARTED — no build artifact exists**

**Entry criteria:**
- Phase 2 exit criteria met (design artifacts complete).
- n8n Community Edition ≥ 1.40 instance available (self-hosted or Cloud) per `CON-001`.
- Google Sheets mock position book and audit-trail sheet provisioned per `03-data-contract.md` schema.
- Webhook secret header token and Google Sheets OAuth credential provisioned per `NFR-003`, `03a-security-architecture.md`, and `SETUP.md` conventions.

**Exit criteria:**
- n8n workflow built with all 8 node-map steps from `requirements.md` §8.3: Webhook → Validation Code → Google Sheets Lookup → Switch (eventType) → 5 formula Code branches → IF (daysToDeadline) → Basic LLM Chain → Gmail/Slack → Google Sheets Append.
- All five entitlement formulas (FR-006–FR-011) implemented as named-constant Code nodes (NFR-006).
- Four-tier escalation IF logic (FR-012–FR-016) implemented.
- Agent node **not used** anywhere (CON-002/FR-020) — verified by node-type inspection.
- Workflow exported as JSON and committed alongside documentation (new artifact — does not yet exist).
- Happy-path execution (one DVCA event, one client position) completes end-to-end without manual intervention (BR-006).

**Go/no-go decision owner:** Technology / Workflow Engineer, with architecture conformance check against `02-architecture-spec.md` and `04-deterministic-logic-spec.md`.

**Documents required at this gate:** the exit-criteria documents above are inputs; this phase's own output (the workflow JSON) is not yet a docs-suite artifact — first build evidence would land in `10-kpi-baseline-and-impact.md` §4 and a new export file.

**Decision: NOT YET EVALUATED — phase not entered.**

---

## Phase 4 — Test & Hardening

**Status: NOT STARTED — plan exists, no execution evidence**

**Entry criteria:**
- Phase 3 exit criteria met (working alpha build).

**Exit criteria:**
- Every test in `05-test-plan-edge-matrix.md` executed with a recorded pass/fail result: unit (TC-001–TC-008, including TC-001b/TC-002b), integration (I-001–I-004), end-to-end (E-001–E-003), UAT (U-001–U-002), and the malformed-input matrix (§6).
- TC-004 (BREACH, 1 day past deadline) passes without exception — mandatory per `00-project-charter.md` §7 risk item 3.
- `10-kpi-baseline-and-impact.md` §4 populated with real measured values (KPI-001–KPI-005), replacing all `{placeholder}` cells.
- `06-runbook.md`, `07-rollback-recovery.md`, `08-monitoring-slo-spec.md` validated against the real build (dry-run of at least one failure mode, e.g. FM-005 BREACH review or FM-006 LLM output DQ-011 failure).
- `07-rollback-recovery.md` §6 recovery-drill evidence log populated (currently unpopulated per `09-governance-boundaries.md` §5 open items).

**Go/no-go decision owner:** Technology / Workflow Engineer, with independent test-evidence review by Asset Servicing Risk & Control (for BREACH/audit scenarios) per RACI.

**Documents required at this gate:** `05-test-plan-edge-matrix.md` (with results), `10-kpi-baseline-and-impact.md` (with §4 populated), `06-runbook.md`, `07-rollback-recovery.md`, `08-monitoring-slo-spec.md`.

**Decision: NOT YET EVALUATED — phase not entered.** No fabricated pass/fail claims are made anywhere in this doc set; do not treat the existing test *plan* as test *evidence*.

---

## Phase 5 — Production-Readiness Gate

**Status: NOT STARTED**

**Entry criteria:**
- Phase 4 exit criteria met (tested, hardened build with real KPI evidence).

**Exit criteria:**
- `09-governance-boundaries.md` §5 open governance items resolved: DPIA trigger assessment (GDPR-Art35-001), Google Workspace EEA region verification (GDPR-Art44-001), first quarterly audit-trail attestation scheduled (SOX-AT-001), first LLM output quality sample review scheduled (ISO42001-CI-001).
- `13-change-management-plan.md` change-classification process demonstrated on at least one real change (e.g. a formula parameter adjustment) with approval evidence, satisfying SOX-IC-001.
- `14-stakeholder-communication-plan.md` communication cadence confirmed operable (at minimum, one dry-run notification to each stakeholder group).
- All documents in the 18-document suite promoted from `Status: Approved (2026-08-17)

**Go/no-go decision owner:** Executive sponsor / system owner, with mandatory sign-off from Compliance Officer and Asset Servicing Risk & Control.

**Documents required at this gate:** `09-governance-boundaries.md`, `13-change-management-plan.md`, `14-stakeholder-communication-plan.md`, plus every document promoted to `Reviewed`/`Approved` status.

**Decision: NOT YET EVALUATED — phase not entered.**

---

## Phase 6 — Release Readiness Gate

**Status: NOT STARTED**

**Entry criteria:**
- Phase 5 exit criteria met, OR (for portfolio-demo purposes only, not production) Phase 4 exit criteria met with an explicit "demo-only, not production-approved" caveat stated in the demo script — consistent with this portfolio's synthetic-data discipline (`SETUP.md`).

**Exit criteria:**
- `11-demo-script.md` walkthrough rehearsed end-to-end at least once against the real build (not just read through).
- `10-kpi-baseline-and-impact.md` §3 synthetic-data confidence caveats restated verbatim in any interview positioning (no unqualified KPI claims).
- `15-post-implementation-review.md` completed per its own trigger condition (§1: first production go-live, first portfolio demo, or six months from build completion — whichever comes first) — **must not be pre-filled**.
- `12-risk-register-raid-log.md` reviewed for currency (no stale risk items presented as live).
- Portfolio positioning note honored: per `Executionplan.md` line 269, BK1 sits in "Batch C" (overlap-flagged) — do not lead with BK1 in interview positioning; only present with its `requirements.md` §"Portfolio alignment notes" contrast statement ready.

**Go/no-go decision owner:** Senior AI Solution Architect (facilitator, per `15-post-implementation-review.md` §1 review participants), self-assessed for portfolio use; no external approver required for demo-only use.

**Documents required at this gate:** `11-demo-script.md`, `10-kpi-baseline-and-impact.md`, `15-post-implementation-review.md`, `12-risk-register-raid-log.md`.

**Decision: NOT YET EVALUATED — phase not entered.**

---

## Phase summary table

| Phase | Status | Blocking gap |
|---|---|---|
| 1. Discovery & Requirements Sign-off | Content complete; sign-off pending | Blank signatures in `00-project-charter.md` §9 |
| 2. Architecture & Design | Content complete; sign-off pending | All docs `Status: Approved (2026-08-17)
| 3. Core Build (Alpha) | Not started | No n8n workflow JSON exists |
| 4. Test & Hardening | Not started | No test execution evidence; KPI table unfilled |
| 5. Production-Readiness Gate | Not started | Depends on Phase 4 |
| 6. Release Readiness Gate | Not started | Depends on Phase 4/5; PIR must stay unfilled until real cycle |
