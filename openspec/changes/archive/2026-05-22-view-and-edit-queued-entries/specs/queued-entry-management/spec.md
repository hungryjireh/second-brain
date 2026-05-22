## ADDED Requirements

### Requirement: User can view queued entries
The system SHALL provide a queued entries view that lists all entries currently in queued state for the active user context.

#### Scenario: Queued entries are displayed
- **WHEN** the user opens the queued entries view
- **THEN** the system displays queued entries with stable identifiers and current content summary

#### Scenario: Empty queue state is displayed
- **WHEN** there are no queued entries available
- **THEN** the system displays an explicit empty-state message

### Requirement: User can edit a queued entry
The system SHALL allow users to edit mutable fields of a queued entry before it is processed.

#### Scenario: Edit form opens for queued entry
- **WHEN** the user chooses to edit a queued entry
- **THEN** the system presents an edit interface prefilled with the queued entry’s current values

#### Scenario: Queued entry update persists
- **WHEN** the user submits valid queued entry edits
- **THEN** the system persists the changes and reflects updated values in the queued entries view

### Requirement: System validates queued entry edits
The system MUST validate queued entry edits before accepting them and MUST reject invalid updates with actionable feedback.

#### Scenario: Client-side validation blocks invalid submission
- **WHEN** required fields are missing or malformed in the edit form
- **THEN** the system prevents submission and shows field-level validation messages

#### Scenario: Server-side validation error is returned
- **WHEN** the backend rejects a queued entry update as invalid
- **THEN** the system preserves unsaved user input and shows a clear error explaining what must be corrected
