# Agent Customization Rules & Guidelines

## Workflow & Code Audit Integrity Rules

1. **Complete Execution Pipeline Traceability:**
   - Always ensure every node defined in user stories and architecture node maps (e.g. Webhook -> Validation -> Lookup -> Formulas -> Deadline Gate -> LLM Chain -> Notification Dispatch -> Audit Append) is explicitly present and connected in the generated workflow JSON without omitting intermediate dispatch or logging steps.

2. **Strict Boundary Condition Alignment:**
   - Match boundary value logic (`<= 0`, `>= 1`, `3..10`, `> 10`) in Code/IF nodes *verbatim* against the deterministic logic specification (`04-deterministic-logic-spec.md`) and acceptance criteria (`AC-*`). Never introduce off-by-one boundary mismatches (e.g. mapping day 0 to URGENT instead of BREACH).

3. **Mandatory Ingestion Security:**
   - Every Webhook validation node must explicitly verify secret header tokens (`X-Webhook-Secret` / `$request.headers['x-webhook-secret']`) against environment secrets as mandated in security specifications before processing payload data.

4. **Explicit Audit Data Contract Schema:**
   - Always provide explicit field key-value mapping parameters for database, Sheets, or audit trail append nodes matching the exact data contract fields, rather than relying on default parameter fallbacks.
