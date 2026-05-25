## Duplicate Inventory

### Cluster A: API JSON response helper (selected batch)

- Confidence: High (identical implementation)
- Duplicate implementation:
  - `api/settings.js`
  - `api/launch-signups.js`
  - `api/tags.js`
  - `api/telegram/link-key.js`
  - `api/auth/login.js`
  - `api/auth/reset-password.js`
  - `api/entries.js`
- Shared abstraction used:
  - `lib/open-brain/helpers.js#json`
- Impact ranking: High
  - Call-site breadth: high (core API handlers)
  - Change frequency: medium-high (auth/settings/entries touched often)
  - Bug risk from divergence: medium

### Cluster B: Test request/response harness helpers

- Confidence: High (similar helpers in multiple tests)
- Candidate files:
  - `tests/api/handlers.test.js`
  - `tests/api/api-critical.test.js`
  - `tests/api/notifications.test.js`
- Impact ranking: Medium
  - Useful cleanup, lower runtime risk than API handler consolidation
- Status: Deferred to follow-up batch

### Cluster C: Local host / transport normalization helpers

- Confidence: Medium (similar, not strictly identical)
- Candidate files:
  - `mobile/src/api.js`
  - `mobile/src/share.js`
- Impact ranking: Medium-Low
- Status: Deferred due subtle behavior differences

## First Batch Selection

Selected Cluster A only, because implementations are behaviorally equivalent and safest for incremental consolidation.
