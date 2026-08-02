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
   - **Google Sheets Node:** Link your `Google Sheets OAuth2` credential. Update `documentId` to point to your `Corporate_Actions_SoR` sheet.
   - **Basic LLM Chain Node:** Link your `OpenAI API` credential (Model: `gpt-4o-mini`).
   - **Gmail / Slack Dispatch Node:** Link your Gmail OAuth2 or Slack API credential.
   - **Webhook Trigger Node:** Set security header `X-Webhook-Secret` matching your environment secret (`NFR-003`).

---

## 4. Test Payloads (Webhook Verification)

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

```bash
curl -X POST "http://localhost:5678/webhook/ca-notification" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: SECURE-TOKEN-2026" \
  -d '{
    "eventId": "EV-2026-TEND-002",
    "isin": "US5949181045",
    "eventType": "TEND",
    "mandatoryVoluntaryFlag": "VOLU",
    "recordDate": "2026-08-01",
    "electionDeadline": "2026-08-04T17:00:00Z",
    "offerPrice": 125.00
  }'
```

---

### Test Case 3: Voluntary Deadline Breach (RHTS - 1 Day Past Deadline)

```bash
curl -X POST "http://localhost:5678/webhook/ca-notification" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: SECURE-TOKEN-2026" \
  -d '{
    "eventId": "EV-2026-RHTS-003",
    "isin": "US0378331005",
    "eventType": "RHTS",
    "mandatoryVoluntaryFlag": "VOLU",
    "recordDate": "2026-07-25",
    "electionDeadline": "2026-08-01T12:00:00Z",
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
