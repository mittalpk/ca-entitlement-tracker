# Setup & Deployment Guide

This guide provides instructions for deploying the **Corporate Actions Entitlement Calculator & Voluntary-Election Deadline Tracker** workflow in n8n, provisioning the mock Google Sheets System of Record (SoR), and running test webhooks.

---

## 1. Prerequisites

Before importing the workflow, ensure you have:

1. **n8n Instance:** n8n version **≥ 1.40** (Self-hosted Docker, Cloud, or Desktop).
2. **Google Cloud Account & Sheets Access:** OAuth 2.0 Client Credentials or Service Account configured with Google Sheets API access.
3. **OpenAI API Key (or alternative LLM provider):** Access to `gpt-4o-mini` or equivalent via n8n's LangChain integration.
4. **Gmail / Slack Credentials:** Standard OAuth 2.0 or Slack Bot Token for dispatching escalation notifications.

---

## 2. Google Sheets System of Record Setup

Create a new Google Spreadsheet named `Corporate_Actions_SoR` with two sheets (tabs):

### Tab 1: `PositionBook`

This tab acts as the mock holding ledger. Populate headers in row 1:

| Column A | Column B | Column C | Column D | Column E |
|---|---|---|---|---|
| `isin` | `accountNumber` | `clientName` | `positionAsOfRecordDate` | `lastUpdated` |

#### Sample Seed Data

```csv
isin,accountNumber,clientName,positionAsOfRecordDate,lastUpdated
US0378331005,ACC-1001,Alpha Custody Fund,10000,2026-07-30
US0378331005,ACC-1002,Beta Wealth Management,2500,2026-07-30
US5949181045,ACC-1003,Gamma Pension Trust,50000,2026-07-30
DE0007100000,ACC-1004,Delta Capital,0,2026-07-30
```

> **Critical Constraint:** Entitlements are calculated **strictly** against `positionAsOfRecordDate` to comply with custody control rules (BR-003).

---

### Tab 2: `AuditTrail`

This tab logs all calculated entitlements and deadline states. Populate headers in row 1:

| Col | Header | Description |
|---|---|---|
| A | `eventId` | Corporate Action Event ID |
| B | `isin` | Instrument Identifier |
| C | `eventType` | DVCA, DVSE, SPLF, RHTS, TEND, or CHOS |
| D | `mandatoryVoluntaryFlag` | MAND, VOLU, or CHOS |
| E | `recordDate` | ISO 8601 Record Date |
| F | `electionDeadline` | ISO 8601 Deadline (null if MAND) |
| G | `accountNumber` | Client Account Number |
| H | `clientName` | Client Entity Name |
| I | `positionAsOfRecordDate` | Quantity on record date |
| J | `entitlementCash` | Calculated cash entitlement (2 d.p., half-up) |
| K | `entitlementShares` | Calculated whole share entitlement |
| L | `fractionalCash` | Fractional share cash compensation |
| M | `newPosition` | Post-split calculated position quantity |
| N | `escalationTier` | NONE, INFORMATIONAL, REMINDER, URGENT, BREACH |
| O | `daysToDeadline` | Calculated remaining days |
| P | `llmNotificationDraft` | Generated client notification text |
| Q | `timestamp` | ISO 8601 Execution Timestamp |

---

## 3. n8n Workflow Import & Credentials

1. Download [`workflow.json`](./workflow.json).
2. Open your n8n workspace → **Workflows** → **Import from File** → Select `workflow.json`.
3. Configure required node credentials:
   - **Webhook Trigger node:** create a new **Header Auth** credential (n8n Credentials → New → Header Auth), set the header name to `X-Webhook-Secret` and the value to a secret of your choosing, then link it in the Webhook Trigger node's credential dropdown. **This is not a manual header check in code** (an earlier version was, and it had a fail-open bug — see `.Archive/log.md` `BK1-ISS-002`) — n8n now rejects any request with a missing or wrong header with HTTP 401 before the workflow runs at all.
   - **Google Sheets Lookup / Google Sheets Audit Append nodes:** Link your `Google Sheets OAuth2` credential. Update `documentId` to point to your `Corporate_Actions_SoR` sheet.
   - **OpenAI Chat Model node** (not the Basic LLM Chain node — the chain node has no credential slot of its own; the model connects to it via an `ai_languageModel` link): Link your `OpenAI API` credential (Model: `gpt-4o-mini`).
   - **Gmail / Slack Dispatch Node:** Link your Gmail OAuth2 or Slack API credential.
   - No credential is needed for the **Merge Lookup with Payload** node — it's a plain Code node.

---

## 4. Test Payloads (Webhook Verification)

> The examples below use `SECURE-TOKEN-2026` as a placeholder — replace it with whatever value you actually set in the Header Auth credential in step 3. There is no hardcoded secret in the workflow anymore (there used to be, and it had a fail-open bug — see `.Archive/log.md` `BK1-ISS-002`); the value only exists in your n8n credential store now.

Use `curl` or Postman to send HTTP POST requests to the Webhook URL:

### Test Case 1: Cash Dividend (DVCA - Mandatory)

```bash
curl -X POST "http://localhost:5678/webhook/ca-notification" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: SECURE-TOKEN-2026" \
  -d '{
    "eventId": "EV-2026-DVCA-001",
    "isin": "US0378331005",
    "eventType": "DVCA",
    "mandatoryVoluntaryFlag": "MAND",
    "recordDate": "2026-08-01",
    "grossRatePerShare": 0.50
  }'
```

---

### Test Case 2: Voluntary Choice Event (TEND - Urgent Tier, 2 Days to Deadline)

> **Corrected 2026-08-16:** the original fixed `electionDeadline` (`2026-08-04`) is now in the past relative to today, so this example silently stopped producing URGENT and started producing BREACH instead — a reader would get a real but mislabeled result. Use a relative date so this stays correct regardless of when you run it (`IF Deadline Gate`'s URGENT band is `1 <= daysToDeadline < 3`, see `workflow.json` node `node-deadline-gate-10`).

```bash
DEADLINE=$(date -u -d "+2 days 17:00" +%Y-%m-%dT%H:%M:%SZ)   # macOS: date -u -v+2d -v17H -v0M -v0S

curl -X POST "http://localhost:5678/webhook/ca-notification" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: SECURE-TOKEN-2026" \
  -d '{
    "eventId": "EV-2026-TEND-002",
    "isin": "US5949181045",
    "eventType": "TEND",
    "mandatoryVoluntaryFlag": "VOLU",
    "recordDate": "2026-08-01",
    "electionDeadline": "'"$DEADLINE"'",
    "offerPrice": 125.00
  }'
```

---

### Test Case 3: Voluntary Deadline Breach (RHTS - Past Deadline)

> **Corrected 2026-08-16:** same staleness issue — the original fixed deadline is now 15 days past, not 1. The BREACH conclusion still happened to hold (any `daysToDeadline <= 0` is BREACH), but the "1 Day Past" label was wrong, and a smaller drift could have flipped the tier entirely. Use a relative date here too.

```bash
DEADLINE=$(date -u -d "-1 days 12:00" +%Y-%m-%dT%H:%M:%SZ)   # macOS: date -u -v-1d -v12H -v0M -v0S

curl -X POST "http://localhost:5678/webhook/ca-notification" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: SECURE-TOKEN-2026" \
  -d '{
    "eventId": "EV-2026-RHTS-003",
    "isin": "US0378331005",
    "eventType": "RHTS",
    "mandatoryVoluntaryFlag": "VOLU",
    "recordDate": "2026-07-25",
    "electionDeadline": "'"$DEADLINE"'",
    "rightsRatio": 0.20
  }'
```

---

## 5. Verification Checklist

- [ ] Webhook responds with `200 OK` and structured summary for valid payloads.
- [ ] Invalid payloads return `400 Bad Request` with exact missing/invalid field error details.
- [ ] Calculations in `AuditTrail` sheet use exact half-up 2 d.p. rounding (`roundHalfUp`).
- [ ] LLM generated text contains accurate pre-computed figures and does not alter financial numbers.
- [ ] Breach event logs an incident entry and routes alert to the urgent escalation channel.
