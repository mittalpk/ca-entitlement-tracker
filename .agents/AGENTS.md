# Agent Customization Rules & Guidelines

## Workflow & Code Audit Integrity Rules

1. **Complete Execution Pipeline Traceability:**
   - Always ensure every node defined in user stories and architecture node maps (e.g. Webhook -> Validation -> Lookup -> Formulas -> Deadline Gate -> LLM Chain -> Notification Dispatch -> Audit Append) is explicitly present and connected in the generated workflow JSON without omitting intermediate dispatch or logging steps.

2. **Strict Boundary Condition Alignment:**
   - Match boundary value logic (`<= 0`, `>= 1`, `3..10`, `> 10`) in Code/IF nodes *verbatim* against the deterministic logic specification (`04-deterministic-logic-spec.md`) and acceptance criteria (`AC-*`). Never introduce off-by-one boundary mismatches (e.g. mapping day 0 to URGENT instead of BREACH).

3. **Mandatory Ingestion Security:**
   - Every Webhook Trigger node must use n8n's native Header Auth authentication (`"authentication": "headerAuth"` plus an `httpHeaderAuth` credential reference) so n8n rejects a missing or wrong `X-Webhook-Secret` with HTTP 401 before the workflow executes at all. Do NOT re-implement the check as a manual string comparison inside a Code node (`if (secretHeader && secretHeader !== EXPECTED)`) — that exact pattern fails OPEN on a missing header (the `&&` short-circuits and the check is skipped entirely) and was a real, shipped bug in BK1 until fixed 2026-08-16 (`BK1-CorporateActionsEntitlementCalculator/.Archive/log.md` `BK1-ISS-002`; see `backlog/PORTFOLIO-HEALTH-REPORT.md`). Never hardcode the secret value as a literal in a Code node either — it belongs in the credential store, not the exported workflow JSON.

4. **Explicit Audit Data Contract Schema:**
   - Always provide explicit field key-value mapping parameters for database, Sheets, or audit trail append nodes matching the exact data contract fields, rather than relying on default parameter fallbacks.

6. **Sheets/Database Lookup Data Loss:**
   - n8n's Google Sheets node (and most "lookup"/"read" database nodes) REPLACES the item's JSON with the matched row's columns — it does NOT merge with the incoming payload. Any node downstream of a lookup that needs fields from *before* the lookup (e.g. a webhook-validated payload) will silently get `undefined` for those fields unless you explicitly restore them. Insert a Code node immediately after every lookup that does `{ ...($('<Validation Node Name>').item.json), ...$json }` (or a narrower explicit merge if the shapes conflict) before any node that needs both sources. Found in BK1 and BK3 on 2026-08-16 (`BK1-ISS-004`, `BK3-ISS-002`) — in BK1 it would have broken 100% of live requests, since the very next node (a Switch) routed on a field the lookup had erased.
