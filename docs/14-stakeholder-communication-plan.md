# 14 — Stakeholder Communication Plan

**Workflow ID:** BK1
**Document:** 14-stakeholder-communication-plan.md
**Version:** 1.0
**Author role:** Senior AI Solution Architect
**Status:** Draft
**Last updated:** 2026-07-30

---

## How this fits

This document defines the PMBOK-aligned stakeholder communication plan for BK1 across all lifecycle phases: build, pilot, production, and incident. It consumes `requirements.md` §2 (RACI) and `00-project-charter.md` §4 (timeline phases). It is consumed by `09-governance-boundaries.md` (governance boundaries — who is informed of compliance events). It does not restate stakeholder roles.

---

## 1. Communication matrix

### Build phase

| Audience | What | When | Channel | Owner |
|---|---|---|---|---|
| Corporate Actions Operations Lead | Progress against charter milestones; any scope changes | Weekly | Email summary | Senior AI Solution Architect |
| Compliance Officer | Requirements doc review; compliance mapping sign-off | At `requirements.md` v1.0 completion | Email + meeting | Senior AI Solution Architect |
| Data Governance Lead | Data model approval; data minimisation attestation | At `03-data-contract.md` draft completion | Email + meeting | Senior AI Solution Architect |
| Technology / Workflow Engineer | Build briefing; test plan | At build sprint start | Slack or meeting | Senior AI Solution Architect |

### Pilot phase

| Audience | What | When | Channel | Owner |
|---|---|---|---|---|
| Corporate Actions Ops Team | UAT test scenarios (U-001, U-002); workflow demo | At UAT readiness | Demo session (Zoom/in-person) | Senior AI Solution Architect + Workflow Engineer |
| Asset Servicing Risk & Control | Breach-scenario demonstration (TC-004); audit trail review | At UAT | Demo session + Google Sheets walkthrough | Senior AI Solution Architect |
| Compliance Officer | Compliance evidence review (09-governance-boundaries.md) | Post-UAT | Email + meeting | Senior AI Solution Architect |

### Production

| Audience | What | When | Channel | Owner |
|---|---|---|---|---|
| Corporate Actions Ops Team | Go-live announcement; Webhook URL; escalation channel | At go-live | Email | Corporate Actions Operations Lead |
| Custody Clients | Entitlement notifications | Per corporate-action event | Gmail / Slack (automated by workflow) | Automated |
| Asset Servicing Risk & Control | Incident reports (BREACH events); audit trail reviews | Event-driven | Slack / Email | Workflow Engineer |
| Compliance Officer | MiFID II record-keeping attestations; change approvals | Monthly | Email | Workflow Engineer |
| Custody Operations Team | Deployment schedules; operational runbook updates | Per change | Email | Workflow Engineer |

---

## 4. Operational & Event-Driven Communications

| Trigger | Recipient | Content | Cadence | Channel | Owner |
|---|---|---|---|---|---|
| BREACH event (daysToDeadline ≤ 0) | Risk & Control; Compliance Officer | Breach alert details; affected position; action required | < 15 minutes | Urgent Slack channel | Workflow Engineer |
| Corporate Actions Ops Team | Go-live announcement; Webhook URL; escalation channel | At go-live | Email | Corporate Actions Operations Lead |
| Corporate Actions Operations Lead | Monthly KPI report (SLO-001–005) | Monthly | Email | Workflow Engineer |
| Formula regression (SLO-004 fail) | Compliance Officer; Corporate Actions Operations Lead | Rollback initiated; affected events listed | < 30 minutes | Email | Workflow Engineer |
| GDPR / data incident | Corporate Actions Operations Lead; Data Governance Lead; Compliance Officer | Incident details; DPIA trigger assessment | < 24 hours (Art. 33 72h notification window) | Email + phone | Corporate Actions Operations Lead |

---

## 5. Artifact Templates

| Template | Usage | Owner |
|---|---|---|
| Go-live announcement email | `13-change-management-plan.md` §5 (release notes template, adapted) | Corporate Actions Operations Lead |
| Monthly KPI report | `10-kpi-baseline-and-impact.md` §4 (measured results table) | Workflow Engineer |
| Breach incident report | `06-runbook.md` §3 FM-005 (incident log entry) | Asset Servicing Risk & Control |
| Quarterly audit trail attestation | `08-monitoring-slo-spec.md` SLO-003 error budget policy | Asset Servicing Risk & Control |
| Annual AI model card review | `03b-ai-governance-model-card.md` §7 (evaluation evidence log) | Workflow Engineer + Compliance Officer |
