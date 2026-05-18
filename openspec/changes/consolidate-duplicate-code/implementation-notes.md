## Consolidation Notes

### Before/After Mapping
- Before: each selected API file had a local `json(res, status, body)` implementation.
- After: all selected files import and use `json` from `lib/open-brain/helpers.js`.

### Files Updated in this Batch
- `api/settings.js`
- `api/launch-signups.js`
- `api/tags.js`
- `api/telegram/link-key.js`
- `api/auth/login.js`
- `api/auth/reset-password.js`
- `api/entries.js`

### Deferred Candidates
- Shared test harness extraction in `tests/api/*` helpers.
- Mobile helper consolidation between `mobile/src/api.js` and `mobile/src/share.js`.

### Acceptance Check
- External API response shape unchanged.
- No public API contract changes.
- Regression suite executed after consolidation.
