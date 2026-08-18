# 08 — Monitoring & SLO Specification

**Workflow ID:** BK1
**Document:** 08-monitoring-slo-spec.md
**Version:** 1.0
**Author role:** Senior AI Solution Architect
**Status:** Approved (2026-08-17)
**Last updated:** 2026-07-30

---

## How this fits

This document is the SRE-practice monitoring and SLO specification for BK1. It consumes `requirements.md` NFR-001 (performance), NFR-002 (availability), and NFR-007 (observability) and is consumed by `06-runbook.md` (alert response procedures) and `09-governance-boundaries.md` (SOC2-AV-001 traceability). SLI/SLO terminology follows the Google SRE book.

---

## 1. SLI definitions

| SLI ID | Metric | Measurement method |
|---|---|---|
| SLI-001 | Workflow availability | % of synthetic Webhook pings that receive a valid HTTP response within 5s, during business hours (Mon–Fri 07:00–20:00 CET) |
| SLI-002 | End-to-end processing latency | Time from Webhook receipt to Google Sheets Append completion, per execution, for up to 50 positions |
| SLI-003 | Audit trail completeness | % of executions where the count of audit rows appended equals the count of client positions processed |
| SLI-004 | Formula correctness (regression) | % of executions where TC-001–TC-006 spot-check formula outputs match expected values (automated regression, run nightly) |
| SLI-005 | LLM availability | % of LLM API calls that return a valid response within 15s |

---

## 2. SLO targets & error budgets

| SLO ID | SLI | Target | Error budget (monthly) | Measurement window |
|---|---|---|---|---|
| SLO-001 | SLI-001 availability | 99.5% during business hours | 0.5% × business hours = ~1.95 hours/month | Rolling 30 days |
| SLO-002 | SLI-002 latency | p95 ≤ 30s (NFR-001) | No explicit budget; alert at p95 > 30s | Per execution |
| SLO-003 | SLI-003 audit completeness | 100% | Zero tolerance — any miss is a control failure (FR-024, MIFID-ART25-001) | Per execution |
| SLO-004 | SLI-004 formula correctness | 100% | Zero tolerance — any regression is a BREACH of SOX-IC-001 | Nightly regression |
| SLO-005 | SLI-005 LLM availability | 95% (lower bar — LLM failure triggers fallback, not outage) | 5% | Rolling 30 days |

---

## 3. Error budget policy

| Condition | Action |
|---|---|
| SLO-001 budget < 50% remaining | Alert Technology / Workflow Engineer; investigate availability root cause |
| SLO-001 budget exhausted | Freeze deployments; escalate to `07-rollback-recovery.md` §4 |
| SLO-003 miss (any) | Immediate Tier 3 escalation (Asset Servicing Risk & Control); reconstruct missing audit row from n8n execution log within 24h |
| SLO-004 miss (any) | Immediate rollback per `07-rollback-recovery.md` §4; no further events processed until regression resolved |
| SLO-005 budget < 20% | Switch to LLM fallback template mode for remainder of window (`07-rollback-recovery.md` §3) |

---

## 4. Alerting thresholds & routing

| Alert ID | Condition | Severity | Channel | Responder |
|---|---|---|---|---|
| AL-001 | SLI-001: 3 consecutive synthetic pings fail | P1 — Critical | Slack #ca-ops-alerts | Technology / Workflow Engineer |
| AL-002 | SLI-002: single execution p95 > 30s | P2 — Warning | Slack #ca-ops-alerts | Technology / Workflow Engineer |
| AL-003 | SLI-003: audit row count < position count for any execution | P1 — Critical | Slack #ca-ops-alerts + email to Risk & Control | Asset Servicing Risk & Control |
| AL-004 | SLI-004: nightly regression test fails any TC-001–TC-006 | P1 — Critical | PagerDuty / Slack | Technology / Workflow Engineer; Compliance Officer |
| AL-005 | `incidentFlag=TRUE` in audit trail (BREACH event) | P1 — Critical | Slack #ca-breach-alerts + email | Asset Servicing Risk & Control; Corporate Actions Ops |
| AL-006 | SLI-005: 5 consecutive LLM API failures | P2 — Warning | Slack #ca-ops-alerts | Technology / Workflow Engineer (activate fallback) |

> **⚠ SYNTHETIC DATA FLAG:** Alert channels (`Slack #ca-ops-alerts`, `PagerDuty`) are placeholders. In MVP demo context, the n8n execution log and the BREACH notification Slack message serve as the monitoring evidence. Production alerting requires an external monitoring service.

---

## 5. Dashboard specification

| Panel | Metric | Visualisation | Data source |
|---|---|---|---|
| Availability (7d rolling) | SLI-001 | % gauge + time series | Synthetic ping execution log |
| Processing latency (p50/p95) | SLI-002 | Time series | n8n execution duration log |
| Audit completeness (daily) | SLI-003 | Pass/fail per execution | Google Sheets audit trail row count vs. expected |
| Escalation tier distribution | Count by tier (INFORMATIONAL/REMINDER/URGENT/BREACH) | Bar chart | Google Sheets audit trail `escalationTier` column |
| BREACH incidents (rolling 30d) | Count of `incidentFlag=TRUE` rows | Stat card + list | Google Sheets audit trail |
| LLM availability | SLI-005 | % gauge | n8n execution log (LLM node success/fail count) |

---

## 6. Observability outputs (NFR-007)

Every BK1 execution produces the following observable artefacts:

1. **n8n execution log:** Full node-by-node input/output trace; retained per n8n log retention setting (default 1000 executions).
2. **Google Sheets audit row:** Structured 17-column record per processed position; permanent (until retention-period purge).
3. **Gmail/Slack notification:** Dispatched notification text; retained per email/Slack retention policy.
4. **BREACH audit row:** `incidentFlag=TRUE` + `breachNotes` for any missed election; treated as a permanent incident record.

These four artefacts are sufficient to reconstruct any execution without re-running the workflow, satisfying MIFID-ART25-001 and SOX-AT-001.
