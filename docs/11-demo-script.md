# 11 — Demo & Interview Script

**Workflow ID:** BK1
**Document:** 11-demo-script.md
**Version:** 1.0
**Author role:** Senior AI Solution Architect
**Status:** Approved (2026-08-17)
**Last updated:** 2026-07-30

---

## How this fits

This document provides the structured interview/stakeholder walkthrough script for BK1. It consumes `00-project-charter.md` (context), `10-kpi-baseline-and-impact.md` (evidence), and cross-references `Executionplan.md` Demo Strategy rather than redefining it. It is consumed by the interview package (`Executionplan.md` interview consolidation week).

---

---

## 1. Opening framing (60 seconds)

> "BK1 automates the two most error-prone steps in manual corporate-action processing: calculating the correct entitlement for each client position — using the exact formula for each of the five event types in SWIFT MT564 — and tracking voluntary-election deadlines through four escalation tiers before the cutoff. A missed voluntary election in custody is frequently irreversible and is one of the most common real-money-loss incidents in asset servicing.

> **Portfolio Positioning Note (BK1-US-036):** BK1 is an institutional custody calculation engine. While other portfolio projects demonstrate AI summarization, BK1 demonstrates strict deterministic boundary separation — using named Code nodes for financial formulas and restricting the LLM purely to natural-language client notification formatting.

> What makes this technically interesting is the boundary I've drawn between deterministic Code-node logic and the LLM: the LLM never touches a financial figure. Every entitlement number is computed by a named formula in a Code node, and the LLM receives those numbers as locked variables to phrase in plain language for the client. I'll show you exactly how that separation is enforced in the workflow."

---

## 1a. Rehearsal Evidence & Timing (BK1-US-033)

* **Rehearsal Date:** 2026-08-17
* **Status:** Passed 100% end-to-end rehearsal against live `workflow.json` build.
* **Timed Duration:** 4 minutes 30 seconds (within the 8–10 minute presentation slot).
* **Execution Validation:** Postman POST -> Validation -> Sheets Merge -> Switch -> DVCA Formula -> Deadline Gate -> LLM Chain -> Audit Row verified live without manual intervention.

![n8n Final Workflow Execution Canvas](./assets/n8n-final-v2-workflow-canvas.png)

---

## 2. Live demo sequence (8–10 minutes)

| Step | Action | What to show | Talking point |
|---|---|---|---|
| 1 | Open n8n; show BK1 workflow canvas | Full 8-node workflow; sticky notes visible | "Eight nodes. The Switch routes five event types into five separate Code branches — one formula per branch, no shared logic." |
| 2 | Send TC-001 payload (DVCA, pos=14999, rate=0.42) via Postman/curl | Webhook receives; execution runs | "I'm simulating the SWIFT vendor feed with a Webhook. In production this would be a real MT564 message." |
| 3 | Show Switch node routing | DVCA branch selected | "The Switch node reads eventType and routes exclusively to the DVCA Code node. There is no path from DVCA to the RHTS formula." |
| 4 | Show DVCA Code node output | `entitlementCash = 6299.58` | "Half-up rounding to 2 decimal places. I'm deliberately not using JavaScript's Math.round() because it uses banker's rounding — see the constant block at the top of the node." |
| 5 | Show LLM Chain node | Prompt with locked variables; output text | "The prompt passes 6299.58 as a fixed string — the LLM cannot recalculate it. DQ-011 post-validation checks that no new number appears in the output." |
| 6 | Show Google Sheets audit row | 17-column row populated | "MiFID II Art. 25 record-keeping. The grossRatePerShare at time of processing is logged — so the calculation is reproducible from the audit trail alone, not just the output." |
| 7 | Send TC-004 payload (RHTS, past deadline) | BREACH tier fires; incident row written | "daysToDeadline = -1. This is the case most builds forget. The workflow routes to BREACH, sets incidentFlag=TRUE, and writes breachNotes. This is the moment where a custody ops team would initiate their missed-election remediation process." |
| 8 | Show TC-004 audit row | `incidentFlag=TRUE`, `breachNotes` populated | "The breach is documented in the audit trail within the same 30-second execution window that detected it." |

---

## 3. Standard synthetic-data disclaimer & KPI Caveats (BK1-US-034)

Deliver at step 2 before running the demo:

> "A quick note on setup: I'm using a Google Sheets mock for the position book — this is a deliberate design choice for portfolio demos. In a production deployment, the position lookup would hit the custodian's settlement system directly; the formula logic and the audit trail schema are identical. All the data you'll see is synthetic."

> **KPI-001–KPI-005 Presentation Caveats:**
> - *KPI-001 (Processing Latency):* Measured latency (p95 < 1s) is benchmarked against a synthetic 50-row position book in local test harness (`tests/kpi-benchmark.js`); production database backend latency will vary.
> - *KPI-002 to KPI-005:* 100% calculation accuracy and guardrail compliance are verified against the defined 10-case test matrix (`05-test-plan-edge-matrix.md`).

---

## 4. Anticipated interviewer questions & answers

| Question | Answer |
|---|---|
| "Why not use the Agent node — it's more powerful." | "Power is the problem, not the feature. The Agent node gives the LLM tool-calling capability. In a financial-calculation context, any autonomous action the LLM could take — even reading a data source to 'enrich' the notification — would constitute an unsupervised financial decision. The Basic LLM Chain node is a structural, not just a prompt-level, guarantee. See ADR-001." |
| "How do you handle a missed election?" | "TC-004 is the definitive test. daysToDeadline ≤ 0 routes to the BREACH branch: incidentFlag=TRUE, breachNotes drafted by the LLM, audit row written. From there, the runbook (FM-005) is the human process — the workflow surfaces the breach; it doesn't resolve it." |
| "How is this different from a generic notification bot?" | "Three things: (1) five named, testable entitlement formulas specific to corporate-action event types — not a generic categorisation; (2) record-date vs. live-position distinction enforced structurally in the field name; (3) the escalation tier system with a four-way deadline decision, including the breach case. A generic notification bot doesn't know what a record date is." |
| "Could the LLM hallucinate a figure?" | "It could try, but DQ-011 would catch it. The post-LLM validation step checks that no numeric value appears in the output that wasn't in the locked prompt inputs. If it fails, the notification is suppressed and the fallback template fires. Hallucination on text — poor phrasing — is possible but doesn't cause a financial error." |
| "What's the compliance basis?" | "MiFID II Art. 25 for record-keeping — the audit trail logs formula parameters, not just outputs, so any calculation is reproducible. EU AI Act Limited-risk classification for the LLM — it drafts text, doesn't decide. SOX-adjacent: formula Code node changes require a documented change-management approval." |

---

## 5. Closing

> "The key design principle I'd want you to take from BK1 is the structural AI boundary: the LLM is a word processor, not a calculator. Every entitlement figure flows from a named Code node formula into the LLM as a locked input — the LLM has no path back to the data. That's the pattern I've applied across all twelve workflows in this portfolio."
