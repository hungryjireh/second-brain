## ADDED Requirements

### Requirement: Shared style primitives MUST be centralized and reusable
The system SHALL provide centralized shared style primitives for commonly repeated style definitions so style files and components can reference one canonical source for foundational styling concerns.

#### Scenario: Shared primitive availability
- **WHEN** a developer needs a commonly used spacing, typography, or layout style
- **THEN** the developer MUST be able to reference an existing shared style primitive instead of duplicating raw declarations

### Requirement: Duplicate style declarations MUST be replaced with shared definitions
The system SHALL migrate existing duplicate and near-duplicate style declarations in targeted style files/components to shared definitions while preserving intended visual behavior.

#### Scenario: Duplicate style migration
- **WHEN** a style declaration matches a shared primitive or shared composition pattern
- **THEN** the local duplicate declaration MUST be replaced by a reference to the shared definition

### Requirement: Visual behavior MUST remain consistent after consolidation
The system SHALL keep user-visible styling behavior equivalent after style consolidation for covered modules.

#### Scenario: Post-migration verification
- **WHEN** consolidated styles are applied in a migrated component or screen
- **THEN** the rendered output MUST remain consistent with pre-migration behavior within accepted UI tolerance

### Requirement: New style additions MUST follow shared-style conventions
The system SHALL define and apply conventions that direct developers to extend shared style definitions before creating new local duplicates.

#### Scenario: Adding a new common style
- **WHEN** a developer introduces a style pattern expected to be reused across modules
- **THEN** the developer MUST add or extend shared style definitions and reference them from consuming components
