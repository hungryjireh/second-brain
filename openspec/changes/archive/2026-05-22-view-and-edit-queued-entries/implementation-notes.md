## Rollout Notes

- Scope is isolated to `second-brain` queue management UI and hook state.
- No production dependencies were added.
- Queue items now include `queue_id` and `queued_at` metadata for stable editing and reconciliation.
- Editable queue entries are limited to queued `create` actions; archive/delete queue actions remain read-only.

## Rollback Considerations

- Safe rollback path: revert `useSecondBrainEntries` queue metadata/edit logic and queued panel UI wiring.
- Existing queued actions without `queue_id` remain readable via fallback IDs; rollback does not require data migration.
- If rollback is needed after deployment, users may lose in-flight queued edit UI state, but queued actions remain in offline storage.
