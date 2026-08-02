# 06 — Operational Runbook

**Workflow ID:** BK1
**Document:** 06-runbook.md
**Version:** 1.0
**Author role:** Senior AI Solution Architect
**Status:** Draft
**Last updated:** 2026-07-30

---

## How this fits

This document is the ITIL v4-aligned operational runbook for BK1. It consumes `02-architecture-spec.md` (integration points and technology stack), `03a-security-architecture.md` (credential locations), and `08-monitoring-slo-spec.md` (alert definitions). It is consumed by `07-rollback-recovery.md` (which handles escalations beyond first-line remediation). It does not restate requirements content.

---

## 1. Service description

BK1 processes corporate-action notifications (DVCA, DVSE, SPLF, RHTS, TEND/CHOS) end-to-end: entitlement calculation, voluntary-election deadline escalation, LLM-drafted client notification, and audit-trail logging. Business hours: Mon–Fri 07:00–20:00 CET. Target availability: 99.5% (NFR-002). Full SLO definitions in `08-monitoring-slo-spec.md`.

---

## 2. On-call escalation path

| Tier | Condition | Responder | Response target |
|---|---|---|---|
| Tier 1 — Auto-recovery | n8n node timeout; LLM API transient error | Workflow retry (automatic) | < 2 minutes |
| Tier 2 — First-line ops | Webhook not reachable; Google Sheets quota error; repeated LLM failures | Technology / Workflow Engineer | < 30 minutes |
| Tier 3 — Risk escalation | BREACH event detected (`incidentFlag=TRUE`); audit trail write failure | Asset Servicing Risk & Control + Compliance Officer | < 15 minutes |
| Tier 4 — Executive | Data breach / GDPR incident; > 2 BREACH events in 1 hour | Corporate Actions Operations Lead | < 60 minutes |

---

## 3. Common failure modes and remediation

### FM-001: Webhook returns no response / timeout

**Symptoms:** Sending party reports no HTTP response from Webhook URL.

**Diagnosis:**
1. Check n8n instance status (n8n Cloud dashboard or self-hosted process monitor).
2. Verify Webhook URL is active (n8n → Workflows → BK1 → Webhook node → "Test URL" or "Production URL").
3. Check network/firewall — Webhook must be reachable on HTTPS from sender's IP range.

**Remediation:**
- If n8n instance is down: restart instance; notify Technology / Workflow Engineer.
- If Webhook URL changed (e.g. workflow was re-saved in test mode): switch to Production URL and communicate updated URL to sending party.
- If firewall blocking: coordinate with network team to allowlist sender IP range.

---

### FM-002: Google Sheets lookup returns zero rows (unexpected)

**Symptoms:** Workflow completes but produces a zero-entitlement record for an ISIN that should have positions.

**Diagnosis:**
1. Check the position book Google Sheet — confirm the ISIN exists in the `isin` column.
2. Confirm the column name is exactly `positionAsOfRecordDate` (case-sensitive match).
3. Confirm the n8n Google Sheets node is pointing to the correct spreadsheet ID and tab name.

**Remediation:**
- If ISIN missing from position book: data population error — coordinate with Data Governance Lead to add the correct position data.
- If column name mismatch: correct the Google Sheets column header; do not change the Code node field name.
- If wrong spreadsheet/tab: update the n8n node configuration; do not export the workflow until credentials are cleared.

---

### FM-003: LLM API error or timeout

**Symptoms:** n8n execution fails at Basic LLM Chain node; execution log shows API error or timeout.

**Diagnosis:**
1. Check LLM provider status page (e.g. status.openai.com).
2. Check n8n execution log for specific error code (rate limit, auth failure, timeout).
3. Verify API key credential in n8n credential store is valid and not expired.

**Remediation — transient (rate limit / timeout):**
- Retry: n8n's built-in retry (configure Retry on Fail in node settings).
- If persistent: switch to fallback template-based notification (see `07-rollback-recovery.md` §3).

**Remediation — credential error:**
- Regenerate API key in LLM provider console; update n8n credential store.
- Do NOT store the new key in the workflow JSON or sticky notes.

---

### FM-004: Audit trail write failure

**Symptoms:** Entitlement calculated and notification dispatched, but no audit row appears in Google Sheets.

**Diagnosis:**
1. Check n8n execution log for Google Sheets Append node error.
2. Verify OAuth2 credential has not expired (Google OAuth tokens expire; n8n auto-refreshes if configured).
3. Verify the audit trail tab exists with the correct name and column headers.

**Remediation:**
- If OAuth token expired and not auto-refreshed: reconnect Google Sheets credential in n8n.
- If tab/column mismatch: restore from the schema template in `requirements.md` §6.6.
- **Risk escalation:** Audit trail write failure is a control failure — notify Asset Servicing Risk & Control immediately. The execution's entitlement result must be manually reconstructed from the n8n execution log and inserted into the audit trail within 24 hours to maintain MIFID-ART25-001 compliance.

---

### FM-005: BREACH event detected (missed election deadline)

**Symptoms:** Audit trail contains a row with `incidentFlag=TRUE` and `escalationTier=BREACH`.

**Immediate actions:**
1. **Do not delete the audit row.** The breach record is the primary evidence document.
2. Notify Asset Servicing Risk & Control within 15 minutes (Tier 3 escalation).
3. Identify the client and event: `clientId`, `isin`, `electionDeadline` from the audit row.
4. Determine if the election window has truly closed with the counterparty (late elections are sometimes accepted within grace periods — verify with the event's agent/depository directly).
5. If the election is irrecoverable: open a formal incident record in the risk-management system; initiate client notification per the firm's missed-election remediation procedure.
6. Document all actions taken in the `breachNotes` field supplement (manual update to the audit row by an authorised reviewer).

---

### FM-006: LLM output contains an unexpected financial figure (DQ-011 violation)

**Symptoms:** Post-LLM validation (DQ-011) flags a number in the LLM output that was not in the locked prompt inputs.

**Immediate actions:**
1. **Do not dispatch the notification.** Hold at the Gmail/Slack node.
2. Log the incident in the n8n execution log note.
3. Fall back to template-based notification for this event.
4. Report to Compliance Officer and ISO42001-RISK-001 risk log.

---

## 4. Manual-override procedure

If BK1 automation is unavailable and a corporate-action event must be processed manually:

1. Retrieve the MT564 payload from the sending party.
2. Apply the formula from `requirements.md` §6.5 manually in a spreadsheet, using `positionAsOfRecordDate` values from the position book.
3. Manually append an audit row to the Google Sheets audit trail with all 17 fields populated, plus a `manualOverrideFlag=TRUE` column note.
4. Draft and send the client notification manually; include the AI-generated disclosure waiver (noting the notification was manually drafted).
5. Log the manual override as an incident in the risk-management system.
6. Restore automation as soon as technically feasible; reprocess the event through the workflow to generate a formal audit row (mark as `reprocessed`).

---

## 5. Routine operational checks (daily, business days)

| Check | Frequency | Method | Owner |
|---|---|---|---|
| n8n instance reachability | Daily 07:00 CET | Synthetic Webhook ping (see `08-monitoring-slo-spec.md`) | Technology / Workflow Engineer |
| Audit trail row count vs. events received | Daily | Manual spot-check or monitoring query | Asset Servicing Risk & Control |
| Voluntary events approaching URGENT tier (daysToDeadline ≤ 3) | Daily | Audit trail filter on `escalationTier=URGENT` or `REMINDER` | Corporate Actions Ops |
| LLM credential expiry check | Monthly | Review in n8n credential store | Technology / Workflow Engineer |
