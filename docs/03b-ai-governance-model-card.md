# 03b — AI Governance Model Card

**Workflow ID:** BK1
**Document:** 03b-ai-governance-model-card.md
**Version:** 1.0
**Author role:** Senior AI Solution Architect
**Status:** Approved (2026-08-17)
**Last updated:** 2026-07-30

---

## How this fits

This model card is required for all BK1 components involving an LLM. It consumes `requirements.md` §7.2 (EU AI Act), §7.3 (ISO 42001), §7.5 (NIST AI RMF), and `02-architecture-spec.md` §5 (LLM technology stack). It is consumed by `09-governance-boundaries.md` (compliance traceability). Cross-references requirement IDs from `requirements.md` — no regulatory text is restated.

---

## 1. Model identification

| Field | Value |
|---|---|
| Model role in workflow | Notification drafter — plain-language text only |
| n8n node type | Basic LLM Chain (never Agent node — see ADR-001) |
| Provider | OpenAI GPT-4o (or any n8n-supported chat model) |
| Model version | Pinned per deployment; reviewed annually (ISO42001-LC-001) |
| Prompt version | v1.0 — see §4 below |
| Date of last evaluation | {date_of_last_evaluation} |
| Evaluated by | {evaluator_role} |

---

## 2. EU AI Act risk classification

| Assessment dimension | Finding |
|---|---|
| Annex III check | The LLM drafts communication text from pre-computed, locked entitlement figures. It makes no autonomous financial decisions, does not access employment/financial services decision systems, and is not used for biometric identification, critical infrastructure, or law enforcement. |
| Risk tier | **Limited-risk** (Art. 6 + Annex III assessment) |
| Transparency obligation | Art. 50 — output must be disclosed as AI-generated in the notification body (EUAIACT-LR-001) |
| High-risk trigger condition | Reclassification to high-risk is required if scope is expanded to allow the LLM to influence entitlement figures or act on investment decisions (EUAIACT-HR-001) |
| Conformity assessment required | No — limited-risk classification does not require Annex VII conformity assessment |
| Annex IV technical documentation | Not required at limited-risk tier; this model card serves as the documentation record |

---

## 3. ISO 42001 AI management controls

| Control | Clause | Implementation |
|---|---|---|
| AI policy | Cl. 5.2 (ISO42001-POL-001) | The LLM is authorised for communication drafting only; model version, scope, and review cadence documented in this card |
| Risk assessment | Cl. 6.1 (ISO42001-RISK-001) | See §5 below |
| Lifecycle control | Cl. 8.4 (ISO42001-LC-001) | Model version pinned; annual review documented in §7 |
| Continual improvement | Cl. 10 (ISO42001-CI-001) | Quarterly sample review of LLM output quality; findings logged in §7 |

---

## 4. Prompt design & version control

### 4.1 Prompt structure (v1.0)

```
SYSTEM: You are a corporate-actions notification drafter for an institutional custodian.
Your role is to write clear, professional plain-language notifications for clients.
You MUST NOT calculate, estimate, or alter any financial figure.
All financial figures are provided to you as locked inputs — use them verbatim.
Disclose that this notification was drafted with AI assistance.

USER: Draft a client entitlement notification for the following event:
  - Client ID: {{clientId}}
  - ISIN: {{isin}}
  - Event type: {{eventType_label}}
  - Entitlement: {{entitlement_summary}}
  - Payment/settlement date: {{paymentDate}}
  - Election deadline (if applicable): {{electionDeadline}}
  - Available options (if applicable): {{optionDetails_formatted}}
  - Default outcome if no election received: {{defaultOption}}
```

**Locked variable constraints:**
- All `{{...}}` variables are populated by the Code node output **before** the prompt is assembled.
- No variable is computed by the LLM — they are read-only string substitutions.
- The LLM receives no tool access and no ability to invoke external lookups (ADR-001).

### 4.2 Prompt injection mitigations

- `optionDetails[].description` (the highest-risk injection surface) is sanitised before insertion: HTML tags, markdown code blocks, and instruction-like patterns (`ignore previous`, `you are now`, `print your system prompt`) are stripped by the Code node before prompt assembly.
- System prompt is prepended as a separate system role message — it cannot be overridden by user-role content in the Basic LLM Chain node.

---

## 5. Risk assessment (ISO 42001 Cl. 6.1 + NIST AI RMF Map/Measure)

| Risk | Likelihood | Impact | Mitigation | Residual |
|---|---|---|---|---|
| LLM hallucinates a financial figure not in the locked inputs | Low — model receives specific numeric values as locked variables and is instructed to use them verbatim | Critical — incorrect entitlement figure sent to client causes regulatory and reputational damage | (1) Basic LLM Chain node (no autonomous calculation), (2) post-LLM output validation (DQ-011), (3) human review for breach-tier events (FR-025) | Low |
| Prompt injection via `optionDetails[].description` | Low-Medium — the field is free text provided by the vendor feed | High — could redirect LLM to produce harmful output or disclose system prompt | Input sanitisation in Code node before prompt assembly (§4.2 above) | Low |
| LLM model version deprecated / behaviour drift | Medium — providers deprecate models | Medium — notification quality degrades | Annual model version review (ISO42001-LC-001); model version pinned in credential config | Low |
| LLM provider API outage | Low-Medium | Medium — notifications not drafted; entitlement still calculated | Fallback to template-based notification (ASM-004); see `07-rollback-recovery.md` §3 | Low |
| Data leakage to LLM provider | Low — only pseudonymous clientId and pre-computed figures sent | Medium — GDPR data minimisation concern | Prompt contains only fields listed in §4.1; no name, address, or special-category data (GDPR-Art5-001) | Low |

---

## 6. Human oversight design

| Oversight mechanism | Applies to | Frequency |
|---|---|---|
| Breach-tier audit review | All BREACH escalation events (`daysToDeadline ≤ 0`) | Per event — audit record reviewed by Asset Servicing Risk & Control before any manual remediation |
| Quarterly LLM output sample review | 10% random sample of LLM-drafted notifications | Quarterly (ISO42001-CI-001, NIST-MEAS-001) |
| Annual model version review | LLM provider model and prompt | Annually (ISO42001-LC-001) |
| Fallback trigger | LLM API error or output validation failure (DQ-011) | Per execution — automatic fallback to template-based notification |

> **AI-generated content disclosure:** Per EUAIACT-LR-001, every LLM-drafted notification must include a disclosure statement, e.g.: *"This notification was prepared with AI assistance and verified against calculated entitlement data. Please contact your relationship manager if you have questions."*

---

## 7. Evaluation evidence log

| Date | Model version | Prompt version | Sample size | Quality finding | Reviewer |
|---|---|---|---|---|---|
| 2026-08-17 | `gpt-4o-mini` | v1.0 | 10 notifications | **PASSED.** 100% numerical accuracy against locked cash/share inputs; 0 hallucinated figures; EUAIACT-LR-001 AI disclosure verified present on 10/10 samples. | Senior AI Solution Architect |

> **⚠ SYNTHETIC DATA FLAG:** Evaluated against Phase 4 test execution outputs on 2026-08-17 (`tests/kpi-benchmark.js`).

---

## 8. NIST AI RMF function mapping

| Function | Control | Implementation |
|---|---|---|
| Govern (NIST-GOV-001) | AI policy documents LLM scope, model version, oversight cadence | This model card |
| Map (NIST-MAP-001) | Context of use documented: communication drafting from locked inputs in institutional custody | §1 and §4 above |
| Measure (NIST-MEAS-001) | Quarterly output quality sample | §7 evaluation evidence log |
| Manage (NIST-MANAGE-001) | Fallback to template notification on LLM failure; escalation procedure documented in `06-runbook.md` §4 | `06-runbook.md`, `07-rollback-recovery.md` |
