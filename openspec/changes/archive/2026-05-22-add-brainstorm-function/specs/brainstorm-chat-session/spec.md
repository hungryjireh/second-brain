## ADDED Requirements

### Requirement: Typebar Brainstorm Command Routing

The system SHALL detect `/brainstorm` entered in the typebar and route the user to a dedicated brainstorm page.

#### Scenario: Navigate to brainstorm page from typebar

- **WHEN** the user submits `/brainstorm` from the main typebar
- **THEN** the app navigates to the brainstorm page and initializes a new brainstorm session context

#### Scenario: Non-brainstorm input remains unchanged

- **WHEN** the user submits input other than `/brainstorm` from the main typebar
- **THEN** the app processes the input using the existing non-brainstorm behavior

### Requirement: Brainstorm Chat Session Loop

The system SHALL provide a back-and-forth brainstorm chat interface where each user message is sent to the configured LLM and each assistant response is rendered in the same ordered conversation.

#### Scenario: User sends brainstorm message

- **WHEN** the user submits a non-command message on the brainstorm page
- **THEN** the message is appended to the session transcript and sent to the LLM

#### Scenario: Assistant response is displayed in order

- **WHEN** the LLM returns a response for a brainstorm message
- **THEN** the app appends the assistant response after the triggering user message in the transcript

### Requirement: Explicit End Command Triggers Final Classification

The system SHALL treat `/end` as a brainstorm control command that finalizes the active brainstorm session and invokes `classify.js` to create a finalized feed entry from the session transcript.

#### Scenario: End command finalizes session

- **WHEN** the user submits `/end` on an active brainstorm page
- **THEN** the app invokes `classify.js` with the active session transcript and metadata

#### Scenario: Feed entry is created from finalized brainstorm

- **WHEN** `classify.js` succeeds for a brainstorm `/end` request
- **THEN** a new finalized entry is created in the Second Brain feed for that session

### Requirement: Exit Without End Triggers WIP Classification

The system SHALL invoke `classify.js` when a user leaves an active brainstorm session without submitting `/end`, and the resulting entry title SHALL be prefixed with `[BRAINSTORMING]`.

#### Scenario: Leaving active brainstorm creates WIP entry

- **WHEN** the user leaves the brainstorm screen while the session is active and not ended
- **THEN** the app invokes `classify.js` for the current transcript and creates a feed entry representing work in progress

#### Scenario: WIP entry title includes brainstorming tag

- **WHEN** a feed entry is created from an implicit leave event
- **THEN** the entry title starts with `[BRAINSTORMING]` before the generated title text

### Requirement: Continue Brainstorming from Entry Detail

The system SHALL provide a `Continue Brainstorming` action in `SecondBrainEntryDetailScreen` that opens the brainstorm interface using resume-or-seed behavior.

#### Scenario: Resume existing brainstorm session from entry

- **WHEN** the user taps `Continue Brainstorming` on an entry linked to a prior brainstorm session
- **THEN** the app opens the brainstorm page with the prior transcript restored at the point the user left off

#### Scenario: Seed new brainstorm from non-brainstorm entry

- **WHEN** the user taps `Continue Brainstorming` on an entry with no prior brainstorm session
- **THEN** the app starts a new brainstorm session and seeds the first user input from that entry content

### Requirement: Idempotent Session Transition Writes

The system SHALL prevent duplicate feed creation across explicit end and implicit leave transitions for a single brainstorm session state.

#### Scenario: Repeated end command does not duplicate entries

- **WHEN** the user submits `/end` more than once for the same brainstorm session
- **THEN** the system creates at most one finalized feed entry for that end transition

#### Scenario: Multiple leave events do not duplicate WIP entries

- **WHEN** more than one leave event is triggered for the same active session state
- **THEN** the system creates at most one WIP feed entry for that session transition
