## Context

Second Brain supports queued entries, but users cannot reliably inspect and correct queued items before they are processed. Queue visibility and editability are needed across UI, API handlers, and data persistence, with no new external dependencies.

## Goals / Non-Goals

**Goals:**

- Provide a dedicated queued entries view that lists pending entries with essential metadata.
- Allow users to edit queued entry content before processing.
- Persist queued entry edits with validation and clear success/failure feedback.
- Keep queue state consistent between client and backend after updates.

**Non-Goals:**

- Redesigning the entire entry creation pipeline.
- Editing already-processed/non-queued entries through this feature.
- Introducing collaborative or multi-user queue editing.

## Decisions

1. Add a queue-management surface in the existing Second Brain UI.
   Rationale: keeps flow discoverable and avoids forcing users into ad hoc edit pathways.
   Alternative considered: inline editing only from existing list tiles; rejected because it hides queue-specific actions and weakens overview.

2. Expose/update queue operations through existing application API patterns.
   Rationale: minimizes architectural churn and reuses auth/error conventions already in place.
   Alternative considered: adding a separate queue micro-endpoint namespace with different contracts; rejected as unnecessary complexity for current scope.

3. Use optimistic UI only after local validation passes; otherwise block save and show actionable errors.
   Rationale: prevents invalid state from appearing saved and reduces rollback complexity.
   Alternative considered: always optimistic with server-side correction; rejected due to confusing user experience when frequent validation failures occur.

4. Refresh queue list state after successful update and reconcile by stable entry ID.
   Rationale: guarantees deterministic synchronization even when ordering changes.
   Alternative considered: patching only local edited fields without revalidation; rejected because server-side normalization can differ from local assumptions.

## Risks / Trade-offs

- [Race conditions when two edits happen quickly] → Mitigation: disable save while request is in-flight per entry and apply last-write-wins at API boundary.
- [Validation mismatch between client and server] → Mitigation: keep server as source of truth and surface backend validation messages verbatim where safe.
- [Long queues impacting UI responsiveness] → Mitigation: paginate or lazy-render queue list if entry count crosses defined threshold.
- [Behavior coupling with existing queue processor] → Mitigation: preserve queue status transitions and add regression tests around processing eligibility after edits.
