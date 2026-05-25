## Why

The `mobile/utils` folder may overlap with shared utilities in the root `lib/` directory, creating duplication and inconsistent reuse patterns. We need a formal evaluation and migration plan now to reduce maintenance overhead and establish a single, predictable location for shared utility code.

## What Changes

- Evaluate all modules under `mobile/utils` for overlap with existing `lib/` utilities.
- Define consolidation criteria (mobile-only vs shared utility) and a target folder structure under `lib/`.
- Specify migration behavior for imports, compatibility wrappers, and deprecation steps.
- Add requirements for validating no runtime regressions after consolidation.

## Capabilities

### New Capabilities

- `mobile-utils-consolidation`: Standardizes how mobile utility modules are evaluated, consolidated into `lib/` when shared, and safely migrated with compatibility safeguards.

### Modified Capabilities

- None.

## Impact

- Affected code: `mobile/utils/**`, `lib/**`, and import call-sites in mobile app code.
- Affected systems: Mobile app module organization and shared utility boundaries.
- Dependencies: No new production dependencies required; work uses existing toolchain and tests.
