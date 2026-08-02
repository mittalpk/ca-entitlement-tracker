# ADR-001 — Use Basic LLM Chain Node Instead of Agent Node

**Workflow ID:** BK1
**ADR:** ADR-001
**Version:** 1.0
**Author role:** Senior AI Solution Architect
**Status:** Accepted
**Last updated:** 2026-07-30

---

## How this fits

This ADR is referenced by `02-architecture-spec.md` §5 and `03b-ai-governance-model-card.md`. It records the rationale for the LLM node selection, which directly satisfies `requirements.md` FR-020, EUAIACT-CLASS-001, NIST-MAP-001, and ISO42001-RISK-001. It is consumed by the AI governance model card and governance boundaries document.

---

## Context

The n8n platform offers two AI node variants for invoking a language model:

1. **Agent node** — grants the LLM tool-calling capability. The LLM can invoke connected tools (HTTP requests, code execution, data retrieval) autonomously based on its own reasoning. It operates in a ReAct loop and may take multiple steps.

2. **Basic LLM Chain node** — sends a single prompt to the LLM and returns the text response. No tool-calling capability. No autonomous action. The LLM receives exactly what is passed in the prompt and returns exactly one text output.

BK1 requires an LLM to draft plain-language client notifications from pre-computed entitlement figures (`requirements.md` §5: LLM's bounded role). The entitlement figures are calculated deterministically by Code nodes before the LLM is ever invoked.

The core risk in any corporate-action workflow is an **LLM altering, recalculating, or rounding financial figures** — this would constitute an unsupervised financial decision, violating `requirements.md` BR-004 and triggering EU AI Act high-risk reclassification (EUAIACT-HR-001).

---

## Decision

Use the **Basic LLM Chain node** exclusively. The Agent node is prohibited in BK1.

---

## Consequences

**Positive:**
- The LLM has zero capability to call tools, invoke external systems, or take autonomous actions — its scope is hard-bounded at the node level, not just by prompt instruction.
- EU AI Act risk classification remains **Limited-risk** (EUAIACT-CLASS-001). The LLM is a text-generation assistant, not an autonomous financial decision-maker.
- ISO 42001 Cl. 6.1 risk assessment for hallucination is fully mitigated: the LLM cannot alter input values because it receives them as read-only prompt variables, and it has no path to write back to any data store.
- NIST AI RMF Map function: context of use is unambiguous — text drafting only.
- The workflow is demonstrably safer and simpler to audit, consistent with `requirements.md` NFR-007 (observability): LLM inputs and outputs are fully captured in the n8n execution log.

**Negative / trade-offs:**
- Cannot use multi-step agentic reasoning to, for example, look up current market data to enrich the notification. This is acceptable — enrichment is out of scope (`requirements.md` §1.2).
- If a future requirement adds LLM-driven data retrieval, this ADR must be revisited and EUAIACT-HR-001 must be assessed.

**Sticky note obligation:** A sticky note on the LLM node in the n8n canvas MUST read: *"Basic LLM Chain only — Agent node is prohibited. The LLM receives entitlement figures as locked prompt variables and may not recalculate, estimate, or alter any financial figure. See ADR-001."*

---

## Alternatives considered

| Alternative | Rejected reason |
|---|---|
| Agent node with tool restrictions by prompt | Prompt-only restrictions are not structural guarantees. A sufficiently adversarial input (`optionDetails[].description` field) could inject instructions that override prompt-level restrictions. Structural node choice is the correct control. |
| Agent node with no tools connected | Still runs a ReAct loop with internal reasoning steps that are not fully auditable in the n8n execution log. Fails NFR-007 (observability) and EUAIACT-LOG-001. |

---

## Related requirements

- `requirements.md` FR-017, FR-018, FR-019, FR-020
- `requirements.md` EUAIACT-CLASS-001, EUAIACT-LR-001, EUAIACT-HR-001, EUAIACT-LOG-001
- `requirements.md` ISO42001-RISK-001
- `requirements.md` NIST-MAP-001
