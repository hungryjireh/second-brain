## Why

Users can queue entries in Second Brain, but they currently lack a clear way to review and correct queued content before processing. This creates friction and lowers confidence in queued submissions, especially when users spot mistakes after adding an item.

## What Changes

- Add a queued entries view where users can see all pending/queued entries in one place.
- Add edit support for queued entries so users can update content before it is processed.
- Add save/cancel behavior for queued-entry edits to prevent accidental changes.
- Add basic validation and error feedback when queued-entry edits cannot be saved.

## Capabilities

### New Capabilities

- `queued-entry-management`: View, edit, and persist updates to queued entries prior to processing.

### Modified Capabilities

- None.

## Impact

- Affected code: queue-related UI surfaces, queue data access/service layer, and update handlers for queued entries.
- Affected APIs: queue listing and queue entry update endpoints/contracts.
- Dependencies: no new production dependencies required.
- Systems: impacts Second Brain queue lifecycle and client-server synchronization for queued items.
