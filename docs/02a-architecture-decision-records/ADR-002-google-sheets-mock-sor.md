# ADR-002 — Google Sheets as Mock System of Record

**Workflow ID:** BK1
**ADR:** ADR-002
**Version:** 1.0
**Author role:** Senior AI Solution Architect
**Status:** Accepted
**Last updated:** 2026-07-30

---

## How this fits

This ADR is referenced by `02-architecture-spec.md` §5 and `03-data-contract.md`. It records the rationale for the data storage technology choice, satisfying `requirements.md` NFR-008 (portability), CON-003, and the portfolio-wide standalone-runnable discipline (`SETUP.md`). Consumed by the data contract, security architecture, and governance boundaries documents.

---

## Context

BK1 requires two data stores:
1. A **position book** — the system of record for client holdings as of the record date (read-only by the workflow).
2. An **audit trail** — an append-only log of all entitlement calculations and escalation states.

In production, both would be backed by an institutional data platform (e.g. a custodian's position-keeping system, a relational database with immutable ledger controls). For the portfolio MVP, the data store must:

- Require zero additional infrastructure beyond an n8n instance and a Google Workspace account.
- Be importable into a fresh n8n instance without schema migration.
- Support the append-only write pattern for the audit trail.
- Be visually inspectable by a demo audience without specialist tooling.
- Satisfy `requirements.md` NFR-008: standalone-runnable with no external dependencies beyond mock credentials.

---

## Decision

Use **Google Sheets** as the mock system of record for both the position book and audit trail in the MVP.

---

## Consequences

**Positive:**
- Zero infrastructure dependency: any evaluator can replicate the setup with a Google Workspace account.
- Google Sheets UI provides a human-readable view of the position book and audit trail during a demo, reinforcing the auditability narrative.
- n8n's Google Sheets node supports row-append natively, enforcing the append-only pattern at the node level.
- Credential setup is documented in `SETUP.md` — one OAuth2 credential, one shared spreadsheet, two named tabs.

**Negative / production gap (must be documented):**

> **⚠ SYNTHETIC DATA FLAG:** The Google Sheets position book is a mock. In production, `positionAsOfRecordDate` values would be sourced from a custodian's authoritative position-keeping system (e.g. a T+0 snapshot from the settlement system), not manually maintained. This gap is explicitly documented in `requirements.md` ASM-001 and must be stated during any demo. See `11-demo-script.md` §3 for the standard disclaimer language.

- Google Sheets does not enforce append-only at the API level — it is enforced by the workflow design (no UPDATE or DELETE node path exists). A production deployment would use a database with write-once / ledger controls.
- Row-level locking is not available; concurrent writes from parallel workflow executions could produce race conditions at scale. Acceptable for MVP single-event processing; not acceptable for production bulk-processing.
- Retention and erasure (`requirements.md` GDPR-Art17-001) must be implemented manually — Google Sheets has no automated row-expiry. Acceptable for MVP; must be replaced pre-production.

---

## Alternatives considered

| Alternative | Rejected reason |
|---|---|
| PostgreSQL / SQLite | Adds infrastructure dependency; violates NFR-008 (standalone-runnable without a database service). |
| n8n internal storage (n8n memory) | Not persistent across workflow executions; cannot serve as an audit trail. |
| Airtable | Additional third-party SaaS dependency; more complex credential setup; no clear advantage over Sheets for MVP. |

---

## Production migration path

When BK1 is adapted for production:
1. Replace Google Sheets Lookup with a parameterised SQL query to the position-keeping database.
2. Replace Google Sheets Append with an INSERT to an immutable ledger table (PostgreSQL `INSERT ONLY` or equivalent).
3. Retain the same schema defined in `requirements.md` §6.4 and §6.6 — only the storage backend changes.
4. Re-execute GDPR-Art44-001 assessment for the new storage provider's hosting region.

---

## Related requirements

- `requirements.md` NFR-008 (portability), CON-003
- `requirements.md` GDPR-Art5-001, GDPR-Art17-001, GDPR-Art44-001
- `requirements.md` FR-004, FR-023, FR-024
- `SETUP.md` — credential setup instructions
