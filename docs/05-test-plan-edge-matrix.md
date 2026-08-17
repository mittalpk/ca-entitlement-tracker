# 05 — Test Plan & Edge-Case Matrix

**Workflow ID:** BK1
**Document:** 05-test-plan-edge-matrix.md
**Version:** 1.0
**Author role:** Senior AI Solution Architect
**Status:** Draft
**Last updated:** 2026-07-30

---

## How this fits

This document consumes `requirements.md` §9 (acceptance criteria and test cases) and `04-deterministic-logic-spec.md` (logic branches and boundary conditions) to produce the full test strategy. It is consumed by `09-governance-boundaries.md` (evidence of compliance control testing). All test IDs (TC-*) map to the acceptance criteria (AC-*) defined in `requirements.md` §9.

---

## 1. Test Pyramid (ISTQB terminology)

```
         /\
        /  \  UAT (U-*)
       /----\  2 scenarios
      /      \
     / E2E    \  End-to-end (E-*)
    /----------\  3 scenarios (full workflow from Webhook to audit log)
   /            \
  / Integration  \  Integration (I-*)
 /----------------\  4 scenarios (node-to-node handoffs)
/                  \
/ Unit               \  Unit (TC-*)
/--------------------\  8 scenarios (formula correctness, boundary values)
```

---

## 2. Unit tests — formula and boundary correctness

These map directly to `requirements.md` §9.2 test cases.

| TC ID | Scenario | Input | Expected output | Req IDs | AC IDs | Result (Executed 2026-08-17) |
|---|---|---|---|---|---|---|
| TC-001 | DVCA — non-round entitlement (half-up) | `eventType=DVCA`, `position=14999`, `grossRatePerShare=0.42` | `entitlementCash=6299.58` | FR-006 | AC-005 | **PASS** (`entitlementCash=6299.58`) |
| TC-001b | DVCA — verify NOT using banker's rounding | `position=15001`, `grossRatePerShare=0.015` | `entitlementCash=225.02` (half-up), NOT 225.01 | FR-006 | AC-005 | **PASS** (`entitlementCash=225.02`) |
| TC-002 | DVSE — fractional-share remainder | `position=153`, `stockDividendRatio=0.10`, `fractionalCashPrice=25.00` | `entitlementShares=15`, `fractionalCash=7.50` | FR-007 | AC-006 | **PASS** (`shares=15`, `fracCash=7.50`) |
| TC-002b | DVSE — zero fractional remainder | `position=150`, `stockDividendRatio=0.10`, `fractionalCashPrice=25.00` | `entitlementShares=15`, `fractionalCash=0.00` (not null) | FR-007 | AC-006 | **PASS** (`shares=15`, `fracCash=0.00`) |
| TC-003 | RHTS — 2 days to deadline (URGENT tier) | `eventType=RHTS`, `mandatoryVoluntaryFlag=VOLU`, `daysToDeadline=2` | URGENT tier; separate channel; `electionStatus=PENDING_ELECTION` | FR-009, FR-015 | AC-008, AC-011, AC-012 | **PASS** (`tier=URGENT`, `days=2`, `shares=100`) |
| TC-004 | RHTS — 1 day past deadline (BREACH) | `electionDeadline=yesterday` (daysToDeadline=-1) | BREACH tier; `incidentFlag=TRUE`; `breachNotes` populated; no credit | FR-009, FR-016, FR-025 | AC-013 | **PASS** (`tier=BREACH`, `days=-1`) |
| TC-005 | DVCA — zero-holdings position | `position=0`, `grossRatePerShare=0.42` | `entitlementCash=0.00`; audit row written; no error | FR-011 | AC-004, AC-010 | **PASS** (`entitlementCash=0.00`) |
| TC-006 | SPLF — clean forward split | `splitRatio="3:1"`, `position=10000` | `newPosition=30000`; `entitlementCash=0`; `entitlementShares=0` | FR-008 | AC-007 | **PASS** (`newPosition=30000`) |
| TC-007 | TEND — multi-option choice | `eventType=TEND`, `optionDetails` with 3 options | 3 `PENDING_ELECTION` records; no entitlement | FR-010 | AC-009 | **PASS** (`optionsCount=3`, `tier=REMINDER`) |
| TC-008 | Validation rejection — missing field | Payload missing `recordDate` | HTTP 400; no downstream execution | FR-002 | AC-002 | **PASS** (`MISSING_FIELD` caught) |

### Boundary value analysis summary

| Boundary | Value | Expected tier | TC |
|---|---|---|---|
| daysToDeadline | 11 | INFORMATIONAL | — |
| daysToDeadline | 10 | REMINDER (inclusive) | — |
| daysToDeadline | 3 | REMINDER (inclusive lower bound) | — |
| daysToDeadline | 2 | URGENT | TC-003 |
| daysToDeadline | 1 | URGENT | — |
| daysToDeadline | 0 | BREACH (not URGENT) | — |
| daysToDeadline | -1 | BREACH | TC-004 |

> **Critical:** `daysToDeadline = 0` must route to BREACH, not URGENT. A deadline of today-midnight is already expired for end-of-business processing. This boundary must have an explicit test case in every build.

---

## 3. Integration tests — node-to-node handoffs

| I ID | Scenario | What is tested | Pass condition |
|---|---|---|---|
| I-001 | Webhook → Validation Code → HTTP 400 | Rejection path does not proceed to Google Sheets lookup | Google Sheets node is never invoked for an invalid payload |
| I-002 | Google Sheets Lookup → Switch routing | Position rows correctly joined to event object before Switch | `eventType` and all `positionAsOfRecordDate` values present in Switch input |
| I-003 | Formula branch → LLM Chain | Entitlement object passed as locked variables, not recalculated | LLM prompt contains pre-formatted entitlement string; no formula expression in prompt |
| I-004 | LLM Chain → Google Sheets Append | Audit row includes LLM output fields (`breachNotes` for BREACH; null otherwise) | Audit row schema matches `requirements.md` §6.6 exactly |

---

## 4. End-to-end tests

| E ID | Scenario | Trigger | End state verified |
|---|---|---|---|
| E-001 | DVCA happy path — single client position | Valid DVCA payload via Webhook POST | (1) Gmail notification sent, (2) audit row appended with `entitlementCash`, (3) no Sheets rows modified |
| E-002 | RHTS urgent escalation — 2 clients | Valid RHTS VOLU payload, 2 clients in position book, `daysToDeadline=2` | (1) Separate-channel Slack message sent, (2) 2 audit rows appended with `escalationTier=URGENT`, (3) `electionStatus=PENDING_ELECTION` |
| E-003 | Import-on-fresh-instance portability | Export workflow JSON; import to a clean n8n instance; configure credentials per `SETUP.md`; run E-001 | All steps complete without error; audit row matches E-001 expected output |

---

## 5. User Acceptance Tests

| U ID | Scenario | Acceptance criteria | Performed by |
|---|---|---|---|
| U-001 | Mandatory event notification quality | LLM-drafted notification for TC-001 DVCA scenario is reviewed by a non-technical reviewer; entitlement figures match TC-001 expected output exactly; AI disclosure statement is present | Corporate Actions Operations Team representative |
| U-002 | Breach scenario incident log | TC-004 BREACH scenario produces an audit row that a Risk & Control reviewer can use to reconstruct the missed-election incident without re-running the workflow | Asset Servicing Risk & Control reviewer |

---

## 6. Malformed-input handling matrix

| Input condition | Expected behaviour | Req ID |
|---|---|---|
| `eventType` = `"XXXX"` (unknown) | HTTP 400; `INVALID_EVENT_TYPE` error body | FR-003 |
| `mandatoryVoluntaryFlag` = `"MAND"` + non-null `electionDeadline` | Accepted (not an error); election deadline field ignored for MAND events | FR-012 |
| `optionDetails` = `[]` (empty) for TEND event | HTTP 400 or zero election records — must not produce a silent skip | FR-010 |
| `grossRatePerShare` = `null` for DVCA event | Code node should catch and return a structured error, not a JavaScript exception | FR-006 |
| `positionAsOfRecordDate` = negative number | Treat as zero (defensive); log zero-entitlement record | FR-011 |
| `electionDeadline` in past by 365 days | BREACH tier; `daysToDeadline` = large negative integer; must not overflow | FR-016 |
| `isin` = 11 characters (too short) | HTTP 400 validation error | FR-002 |
| Payload is not valid JSON | HTTP 400 at Webhook level | FR-001 |

---

## 7. Traceability summary

| Test ID | Requirement | Acceptance criteria |
|---|---|---|
| TC-001, TC-001b | FR-006 | AC-005 |
| TC-002, TC-002b | FR-007 | AC-006 |
| TC-003 | FR-009, FR-015 | AC-008, AC-011, AC-012 |
| TC-004 | FR-009, FR-016, FR-025 | AC-013 |
| TC-005 | FR-011 | AC-004, AC-010 |
| TC-006 | FR-008 | AC-007 |
| TC-007 | FR-010 | AC-009 |
| TC-008 | FR-002 | AC-002 |
| I-001 | FR-002, FR-001 | AC-002 |
| I-002 | FR-004 | AC-003 |
| I-003 | FR-017, FR-020 | AC-014 |
| I-004 | FR-023, FR-025 | AC-017 |
| E-001 | FR-006, FR-021, FR-023 | AC-001, AC-016, AC-017 |
| E-002 | FR-009, FR-015, FR-022 | AC-008, AC-012 |
| E-003 | NFR-008 | AC-001 |
| U-001 | FR-018, EUAIACT-LR-001 | AC-014, AC-015 |
| U-002 | FR-025, MIFID-ART25-001 | AC-013, AC-017 |
