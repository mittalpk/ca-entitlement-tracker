# Issue/Incident Log — BK1 Corporate Actions Entitlement Calculator & Voluntary-Election Deadline Tracker

**Workflow ID:** BK1
**Document:** log.md
**Version:** 1.0
**Author role:** Senior AI Solution Architect
**Status:** Active — 2 real entries logged
**Last updated:** 2026-08-16

---

## How this fits

This is the running issue/incident log kept *during* the build (Phase 3 onward), doubling as raw material for interview STAR-format answers. It consumes `execution-runbook.md` (which phase/story an issue occurred against) and `00-phase-checkpoints.md` (which gate an issue affects). It is append-only in spirit: dated entries, no retroactive rewriting of what happened.

**Current status: 2 entries, both verifiable against `git log` in this project's `.git` history.** This log was previously seeded empty even after real build work had occurred (see `PORTFOLIO-HEALTH-REPORT.md` finding 2) — the two entries below backfill the real, git-verifiable fixes that were missed, and this file is now kept current as build work continues.

---

## How to use this log

1. Copy the template row below for each new issue, in date order (do not reorder or backdate existing entries).
2. Assign the next sequential `BK1-ISS-0xx` ID.
3. Fill in Situation/Task/Action/Result in STAR form as the issue is actually resolved — not in advance, not from a template guess.
4. Mark the interview-narrative flag honestly: `strong` (a good story with a clear technical decision and measurable result), `moderate` (usable but thin), or `not usable` (too trivial, or resolution not yet clear).
5. Link back to the story ID (`BK1-US-0xx`) or requirement ID (`FR-*`, `NFR-*`, `GDPR-*`, etc.) the issue affected.

---

## Template entry (copy this row structure — do not fill with invented content)

| Field | Value |
|---|---|
| Issue ID | `BK1-ISS-001` |
| Date | `{YYYY-MM-DD when actually encountered}` |
| Phase | `{Phase 3 / Phase 4 / etc. — from execution-runbook.md}` |
| Situation | `{What was true before the issue — e.g. "Building the RHTS formula branch, TC-003 test case."}` |
| Task | `{What needed to be solved — e.g. "daysToDeadline boundary at 0 was routing to URGENT instead of BREACH."}` |
| Action | `{What was actually done — e.g. "Changed IF-node condition from '> 0' to '<= 0' for BREACH branch and added an explicit boundary test."}` |
| Result | `{Outcome, measurably if possible — e.g. "Boundary value 0 now correctly routes to BREACH; added as a permanent regression case in 05-test-plan-edge-matrix.md."}` |
| Root cause | `{One-line technical root cause}` |
| Interview-narrative flag | `strong` / `moderate` / `not usable` — with a one-line reason |
| Linked story/requirement ID | `{e.g. BK1-US-016, FR-016}` |

---

## Log entries

| Field | Value |
|---|---|
| Issue ID | `BK1-ISS-001` |
| Date | `2026-08-02` |
| Phase | Phase 3 — Core Build (commit `27b860e`) |
| Situation | The IF Deadline Gate branch used `daysToDeadline > 0 && < 3` for the URGENT tier. |
| Task | Day 0 (the deadline itself) needs to route to BREACH, the highest-severity tier — not URGENT. |
| Action | Changed the URGENT condition's lower bound from `>= 0` to `>= 1`, so day 0 falls through to the BREACH branch instead. |
| Result | Day-0 boundary now correctly classifies as BREACH. Not yet added as a standing regression case in `05-test-plan-edge-matrix.md` — still open, see `execution-runbook.md`. |
| Root cause | Off-by-one in the tier boundary condition, copied from a template range that didn't account for BREACH being a zero-inclusive tier. |
| Interview-narrative flag | `strong` — clear technical decision, verifiable in `git show 27b860e -- workflow.json`, measurable before/after behavior. |
| Linked story/requirement ID | FR-016 (deadline tiering) |

| Field | Value |
|---|---|
| Issue ID | `BK1-ISS-002` |
| Date | `2026-08-16` |
| Phase | Phase 4 — Test & Hardening (portfolio health-report remediation) |
| Situation | The Validation Code Node's secret-header check only rejected a *wrong* `X-Webhook-Secret` value (`if (secretHeader && secretHeader !== EXPECTED_SECRET) throw`) — a request with no header at all skipped the check entirely and reached the workflow. The expected secret was also a literal string hardcoded in the Code node, not stored as a credential. |
| Task | Close the fail-open bypass and stop storing the secret in plaintext JSON, per `docs/03a-security-architecture.md`'s own "Header Auth credential-store" requirement. |
| Action | Moved authentication to the Webhook Trigger node's native `headerAuth` mechanism, referencing an n8n Header Auth credential (`credential-webhook-secret`) instead of a hardcoded literal — n8n now rejects any request with a missing or incorrect header with HTTP 401 before the workflow executes at all. Removed the now-redundant in-code secret check from the Validation Code Node. |
| Result | Auth is enforced fail-closed at the trigger level; the secret no longer appears anywhere in the exported workflow JSON. |
| Root cause | The original check used `&&` short-circuit logic intended for "optional but validated if present" semantics, on a field that was actually meant to be mandatory. |
| Interview-narrative flag | `strong` — real security fix with a clear before/after, found via an independent portfolio audit (`PORTFOLIO-HEALTH-REPORT.md`). |
| Linked story/requirement ID | NFR-SEC-001, SOX-SOC2-CC6-001 |

| Field | Value |
|---|---|
| Issue ID | `BK1-ISS-003` |
| Date | `2026-08-16` |
| Phase | Phase 4 — Test & Hardening (portfolio health-report remediation) |
| Situation | The `Basic LLM Chain` node carried an `openAiApi` credential directly on itself with no connected Language Model sub-node via n8n's `ai_languageModel` connector. n8n's LangChain nodes structurally require that wiring; as exported this node would very likely fail to load or execute in a real n8n instance. |
| Task | Wire a real Language Model sub-node so the workflow is actually executable. |
| Action | Added an `OpenAI Chat Model` node (`@n8n/n8n-nodes-langchain.lmChatOpenAi`) carrying the credential, connected to `Basic LLM Chain` via `ai_languageModel`. Removed the now-redundant bare credential from the chain node itself. |
| Result | The LLM Chain node now has a structurally valid model connection, matching the pattern used when building BK3 and BK6 the same day. |
| Root cause | The original export predates the current n8n LangChain node convention (or was hand-written without a live n8n instance to catch the missing connection). |
| Interview-narrative flag | `moderate` — a real fix, but found by audit rather than by a failed execution, so there's no "it broke, then I fixed it" runtime evidence yet. |
| Linked story/requirement ID | FR-020 (LLM notification drafting) |

| Field | Value |
|---|---|
| Issue ID | `BK1-ISS-004` |
| Date | `2026-08-16` |
| Phase | Phase 4 — Test & Hardening (portfolio health-report remediation, functional validation pass) |
| Situation | `Google Sheets Lookup` (operation: `lookup`) replaces the item's entire JSON with the matched row's columns — it does not merge with the incoming payload. The `Switch eventType` node immediately downstream reads `$json.eventType`, a webhook-payload field that no longer exists after the lookup; every one of the 5 formula nodes similarly needs webhook fields (`eventId`, `isin`, `mandatoryVoluntaryFlag`, `electionDeadline`) that would also be gone. |
| Task | Restore the webhook payload alongside the looked-up position/rate data before the Switch node routes on it. |
| Action | Inserted a `Merge Lookup with Payload` Code node between `Google Sheets Lookup` and `Switch eventType`, explicitly merging `$('Validation Code Node').item.json` with the lookup's `$json` output. |
| Result | Without this fix, no event would ever have matched a Switch branch — the workflow would have silently dropped every single request once connected to a real Google Sheet. Caught by functional testing before any live run, not by a live failure. |
| Root cause | Assumed n8n's Sheets node merges with upstream data by default; it replaces instead. |
| Interview-narrative flag | `strong` — a real, previously-undetected architectural bug that would have broken the entire workflow on first live use, caught by deliberate functional validation rather than luck. |
| Linked story/requirement ID | FR-010–FR-019 (all formula branches), FR-006 (event-type routing) |

| Field | Value |
|---|---|
| Issue ID | `BK1-ISS-005` |
| Date | `2026-08-17` |
| Phase | Phase 4 — Test & Hardening (runtime cloud execution #54 remediation) |
| Situation | Execution #54 failed at `Basic LLM Chain` node with `No prompt specified — Expected to find the prompt in an input field called 'chatInput'`. |
| Task | Reconfigure the node to explicitly define its prompt text from incoming corporate-action payload fields rather than defaulting to `chatInput`. |
| Action | Added `"promptType": "define"` parameter to `@n8n/n8n-nodes-langchain.chainLlm` node and mapped `"text"` parameter to explicitly format `eventId`, `eventType`, `accountNumber`, `entitlementCash`, `entitlementShares`, `escalationTier`, and `daysToDeadline`. |
| Result | Webhook-triggered executions resolve prompt text deterministically from item fields without throwing missing `chatInput` error. |
| Root cause | n8n LangChain Chain LLM node defaults to `promptType: "auto"` expecting `$json.chatInput` unless `"promptType": "define"` and `"text"` parameters are explicitly specified. |
| Interview-narrative flag | `strong` — real runtime execution bug caught during n8n Cloud webhook testing, remediated with explicit parameter scoping. |
| Linked story/requirement ID | FR-017, FR-020 (LLM notification drafting) |

| Field | Value |
|---|---|
| Issue ID | `BK1-ISS-006` |
| Date | `2026-08-17` |
| Phase | Phase 4 — Test & Hardening (runtime cloud execution #62 remediation) |
| Situation | Execution #62 failed at sub-node `OpenAI Chat Model` with `Bad request - please check your parameters: Unsupported value: 'temperature' does not support 0.2 with this model. Only the default (1) value is supported.` |
| Task | Remove temperature parameter override from `OpenAI Chat Model` node parameters. |
| Action | Updated `options` parameter object from `{"temperature": 0.2}` to `{}` in `node-lm-model-11b`. |
| Result | OpenAI API accepts execution calls using default model temperature without throwing parameter rejection 400 error. |
| Root cause | OpenAI API rejects explicit `temperature: 0.2` overrides on certain API versions/models, requiring default temperature (1.0). |
| Interview-narrative flag | `strong` — real runtime API compatibility issue identified and remediated during live cloud execution testing. |
| Linked story/requirement ID | FR-020 (LLM notification drafting) |

| Field | Value |
|---|---|
| Issue ID | `BK1-ISS-007` |
| Date | `2026-08-17` |
| Phase | Phase 4 — Test & Hardening (runtime cloud execution data loss remediation) |
| Situation | Gmail notification email subject rendered `[Corporate Action undefined] Notification for Event undefined`, and Google Sheets Audit Append appended data into columns R, S, T using Gmail output keys (`id`, `threadId`, `labels`) while columns A–Q remained empty. |
| Task | Update field mapping expressions in Gmail and Google Sheets Audit Append nodes to explicitly reference `$('IF Deadline Gate').item.json` and `$('Basic LLM Chain').item.json`. |
| Action | Updated `node-dispatch-11b` subject expression to `[Corporate Action ' + ($('IF Deadline Gate').item.json.escalationTier || 'NONE') + '] Notification for Event ' + $('IF Deadline Gate').item.json.eventId` and mapped all 17 audit columns to `$('IF Deadline Gate').item.json.<field>`. |
| Result | Email subject renders exact escalation tier and event ID, and Google Sheets Audit Append writes all 17 entitlement fields into columns A–Q. |
| Root cause | LangChain LLM node outputs `{ text: "..." }` and Gmail node outputs `{ id: "...", threadId: "..." }`. Relying on `$json` downstream caused `undefined` references to upstream payload fields. |
| Interview-narrative flag | `critical` — a real runtime data flow bug identified from live Gmail and Google Sheets inspection, resolved via explicit n8n node item references (`$('Node Name').item.json`). |
| Linked story/requirement ID | FR-020, FR-021, FR-022 (Email dispatch, Audit trail append) |
