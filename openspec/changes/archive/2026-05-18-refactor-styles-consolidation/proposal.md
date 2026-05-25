## Why

Style definitions are currently duplicated across multiple files, which increases maintenance cost and causes inconsistent visual behavior when updates are made in only one location. Consolidating shared styling now will reduce regression risk and make future UI changes faster and safer.

## What Changes

- Audit style files to identify duplicate and near-duplicate declarations for spacing, typography, layout primitives, and component-level patterns.
- Introduce a shared style foundation (tokens/utilities/common style modules) and migrate repeated declarations to centralized definitions.
- Update consuming components to reference consolidated shared styles while preserving current visual output.
- Remove redundant local style blocks that are replaced by shared definitions.
- Add guardrails (naming/usage conventions and verification checks) to keep style duplication from reappearing.

## Capabilities

### New Capabilities

- `style-system-consolidation`: Define and enforce reusable shared styling primitives so UI modules can consume consistent, centralized styles instead of duplicating declarations.

### Modified Capabilities

- None.

## Impact

- Affected code: frontend style files, shared UI/style utility modules, and components that reference duplicated styles.
- APIs: no public API contract changes expected.
- Dependencies: no new production dependencies required; use existing toolchain.
- Systems: design consistency and maintainability of frontend UI layers improve, with lower risk during future styling updates.
