# 10 — KPI Baseline & Impact

**Workflow ID:** BK1
**Document:** 10-kpi-baseline-and-impact.md
**Version:** 1.0
**Author role:** Senior AI Solution Architect
**Status:** Draft
**Last updated:** 2026-07-30

---

## How this fits

This document consumes `00-project-charter.md` §2 (success criteria) and links to `Executionplan.md` KPI sections rather than redefining targets already established there. It provides the baseline measurement protocol, confidence caveats for synthetic data, and the post-build results log. It is consumed by `11-demo-script.md` (evidence for interview KPI claims).

> **Cross-reference:** KPI targets are defined in `Executionplan.md`. This document provides measurement methodology and evidence — it does not restate the targets.

---

## 1. KPI definitions

| KPI ID | KPI | Unit | Baseline (as-is) | Target | Source |
|---|---|---|---|---|---|
| KPI-001 | End-to-end processing time (Webhook to audit row) | Seconds (p95) | Manual: 15–45 minutes per event (human processing) | ≤ 30 seconds (NFR-001) | `Executionplan.md` |
| KPI-002 | Voluntary-election missed-deadline rate | % of VOLU/CHOS events with `daysToDeadline ≤ 0` at time of first escalation | Unknown (no automated tracking baseline) | Breach incidents surfaced ≤ 15 min of deadline expiry | `Executionplan.md` |
| KPI-003 | Audit trail completeness | % of executions with complete 17-column audit row | 0% (manual processing has no structured audit trail) | 100% (SLO-003) | `Executionplan.md` |
| KPI-004 | LLM financial-figure accuracy | % of LLM-drafted notifications where all numeric values match locked inputs exactly | N/A (no LLM in baseline) | 100% (DQ-011 pass rate) | `Executionplan.md` |
| KPI-005 | Formula correctness (regression) | % of TC-001–TC-006 passing on every build | N/A (no automated test in baseline) | 100% (SLO-004) | `Executionplan.md` |

---

## 2. Baseline measurement protocol

### KPI-001 (processing time)
- **Synthetic baseline:** Time 10 runs of the full E2E workflow (E-001 scenario) with a position book of 50 rows.
- **Measurement:** n8n execution duration (visible in Executions tab).
- **Report:** p50 and p95 of the 10 runs.

### KPI-002 (missed-deadline rate)
- **Measurement:** Run TC-003 (daysToDeadline=2) and TC-004 (daysToDeadline=-1). Verify URGENT and BREACH escalation tiers are produced within one workflow execution (< 30s per KPI-001).
- **Baseline note:** Manual process has no structured tracking — baseline is "undefined / unknown." The automation improvement is from "no automated tracking" to "100% structured escalation."

### KPI-003 (audit completeness)
- **Measurement:** Run E-001 (1 position) and E-002 (2 positions). Count audit trail rows after each run. Verify row count equals position count.

### KPI-004 (LLM accuracy)
- **Measurement:** After E-001 run, compare LLM notification text against TC-001 expected entitlement figure (`6299.58`). Verify figure appears verbatim in notification. Run DQ-011 check (no unexpected numerics in output).

### KPI-005 (formula regression)
- **Measurement:** TC-001 through TC-006 executed sequentially. All must pass. Nightly regression (SLI-004).

---

## 3. Confidence caveats for synthetic data

> **⚠ SYNTHETIC DATA FLAG:** All KPI measurements in this portfolio are conducted against synthetic data (mock position book, simulated Webhook payloads). The following caveats must be stated during any demo or interview:

1. **Processing time (KPI-001):** The 30-second target is measured against synthetic Google Sheets data with ≤50 rows. Production performance with a real position book (potentially thousands of rows per ISIN) and a database backend will differ. The target is appropriate for MVP scope.
2. **Formula correctness (KPI-005):** Test cases use constructed inputs with known correct outputs. Real custody operations may encounter edge cases not covered by TC-001–TC-008 (e.g. fractional split ratios, events with unusual option structures). The test matrix covers the primary documented event types.
3. **LLM output accuracy (KPI-004):** Measured at a single point in time with the current model version. Model behaviour may change across provider updates — hence ISO42001-LC-001 annual review requirement.

---

## 4. Post-build measured results

| KPI ID | Measurement date | Measured value | Pass / Fail | Notes |
|---|---|---|---|---|
| KPI-001 | {date} | {p95 seconds} | {pass/fail} | |
| KPI-002 | {date} | {BREACH detected within Xs} | {pass/fail} | |
| KPI-003 | {date} | {% complete} | {pass/fail} | |
| KPI-004 | {date} | {% matching} | {pass/fail} | |
| KPI-005 | {date} | {TC pass count / 6} | {pass/fail} | |

> **⚠ SYNTHETIC DATA FLAG:** This table must be completed after the first build. Do not populate with estimated values before build.
