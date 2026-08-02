# 07 — Rollback & Recovery

**Workflow ID:** BK1
**Document:** 07-rollback-recovery.md
**Version:** 1.0
**Author role:** Senior AI Solution Architect
**Status:** Draft
**Last updated:** 2026-07-30

---

## How this fits

This document consumes `06-runbook.md` (failure modes and escalation triggers) and `08-monitoring-slo-spec.md` (alert conditions that trigger rollback). It is consumed by `09-governance-boundaries.md` (SOX-IC-001: change-management controls on formula Code nodes). It defines RTO/RPO targets per SRE practice and provides the tested-recovery evidence log template.

---

## 1. RTO / RPO targets

| Scenario | RTO (Recovery Time Objective) | RPO (Recovery Point Objective) |
|---|---|---|
| n8n instance restart (planned or unplanned) | 15 minutes | 0 — no data loss (workflow is stateless; data in Google Sheets persists independently) |
| LLM API outage — fallback to template notification | < 2 minutes (automatic fallback) | 0 — entitlement calculation is unaffected |
| Google Sheets write failure (audit trail) | 24 hours (manual reconstruction from n8n execution log) | Per-execution — no audit row is lost if execution log is retained |
| Full workflow rollback to previous version | 30 minutes | 0 — workflow definition is versioned; Google Sheets data is unchanged by a rollback |
| BREACH event resolution (missed election) | N/A — irreversible by definition; remediation time is client-SLA dependent | N/A |

---

## 2. Rollback trigger conditions

A rollback to the previous workflow version is warranted when:

1. **Formula regression:** A new deployment produces incorrect entitlement figures on TC-001–TC-007 test cases.
2. **Audit trail schema break:** A new deployment produces audit rows with missing or misnamed columns.
3. **LLM prompt regression:** LLM output consistently fails DQ-011 (introduces unsanctioned numeric values) after a prompt version change.
4. **Security regression:** A new deployment exposes credentials in the workflow JSON (violates NFR-003 and `SETUP.md` rule 4).

Rollback does **not** apply to:
- LLM API outages (handled by fallback, not rollback — see §3).
- Google Sheets connectivity issues (handled by runbook FM-002/FM-004).

---

## 3. LLM fallback procedure (advisory mode)

When the LLM API is unavailable or DQ-011 validation fails, BK1 should fall back to a template-based notification. This is "advisory mode" — entitlement calculation is unaffected.

**Template notification (mandatory events):**
```
Subject: Corporate Action Notification — {eventType_label} for {isin}

Dear {clientId},

This is an automated notification regarding corporate action event {eventId}.

Event type: {eventType_label}
ISIN: {isin}
Entitlement: {entitlement_summary}
Payment/Settlement date: {paymentDate}

This notification was generated without AI drafting assistance due to a system condition.
Please contact your relationship manager if you have questions.
```

**Template notification (voluntary events):**
```
Subject: Action Required — {eventType_label} Election for {isin}

Dear {clientId},

Your holding of {positionAsOfRecordDate} units in {isin} is subject to a voluntary corporate action:

Event: {eventType_label} (Event ID: {eventId})
Election deadline: {electionDeadline}
Options available: {optionDetails_list}

Please submit your election before the deadline. If no election is received, the default option will apply.

This notification was generated without AI drafting assistance. Please contact your relationship manager immediately.
```

**Activation:** In the n8n workflow, the LLM Chain node's error-handling must be set to "Continue on fail" with the fallback template applied in a downstream Code node. This is an implementation detail for the hardening phase.

---

## 4. Rollback procedure

### Step 1: Identify the previous stable version
- All workflow versions are tracked in n8n's built-in version history (n8n Cloud) or via manual export prior to each deployment (self-hosted — required discipline).
- The stable version is identified by the last successful run of TC-001–TC-008.

### Step 2: Disable the current (faulty) workflow
- In n8n: Workflows → BK1 → toggle "Active" to OFF.
- This stops the Webhook from accepting new events immediately.
- Notify the sending party of the temporary outage.

### Step 3: Restore the previous workflow version
- n8n Cloud: Executions → Version History → select previous version → Restore.
- Self-hosted: Import the previously exported JSON via n8n → Import from file.

### Step 4: Re-run the test suite
- Execute TC-001–TC-008 against the restored version.
- Confirm all pass before reactivating.

### Step 5: Reactivate and notify
- Toggle "Active" to ON.
- Notify the sending party that the Webhook is live.
- Log the rollback event in the change management log (`13-change-management-plan.md`).

### Step 6: Reprocess any missed events
- Events received during the outage window must be manually reviewed.
- If the formula logic was faulty in the rolled-back deployment, recalculate affected entitlements manually per `06-runbook.md` §4.

---

## 5. Disaster recovery — full instance loss

If the n8n instance is unrecoverable (e.g. cloud provider outage, data loss):

1. Provision a new n8n instance (Community Edition ≥ 1.40).
2. Re-create credentials per `SETUP.md`.
3. Import the latest exported workflow JSON.
4. Reconnect credentials in the restored workflow.
5. Run TC-001–TC-008 before reactivating.

**Google Sheets data:** The position book and audit trail are hosted by Google Sheets independently of n8n — they are not affected by an n8n instance loss. No position or audit data is stored within n8n.

---

## 6. Tested-recovery evidence log

| Date | Recovery scenario | Steps executed | Result | Tested by |
|---|---|---|---|---|
| {date} | {scenario} | {steps} | {result} | {tester} |

> **⚠ SYNTHETIC DATA FLAG:** This log must be populated after the first recovery drill, not at documentation time. The first drill should be executed during the hardening phase (`Executionplan.md` hardening week).
