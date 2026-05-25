## ADDED Requirements

### Requirement: Utility Scope Classification

The system SHALL classify each utility considered for consolidation as either mobile-scoped or shared before any file move occurs.

#### Scenario: Classify utility by runtime coupling

- **WHEN** a utility depends on mobile-only runtime APIs or platform-specific primitives
- **THEN** the utility is marked mobile-scoped and is not moved into `lib/`

#### Scenario: Classify utility as shared

- **WHEN** a utility is runtime-agnostic and used across multiple application boundaries
- **THEN** the utility is marked shared and becomes eligible for placement under `lib/`

### Requirement: Safe Consolidation Workflow

The system SHALL support a phased consolidation workflow for shared utilities from `mobile/utils` into `lib/` that maintains behavior.

#### Scenario: Shared utility migration

- **WHEN** a utility is classified as shared
- **THEN** the file is moved to `lib/` and import call-sites are updated to the new path

#### Scenario: Compatibility during phased rollout

- **WHEN** not all call-sites can be migrated in one change
- **THEN** a compatibility re-export remains at the legacy path until migration completion

### Requirement: Post-Migration Verification

The system MUST verify no functional regression after utility consolidation.

#### Scenario: Verification after migration

- **WHEN** shared utilities and imports are migrated
- **THEN** automated tests and targeted smoke checks pass for affected mobile flows

#### Scenario: Regression detected

- **WHEN** verification fails after a migration step
- **THEN** the migration step is rolled back or paused until issues are resolved
