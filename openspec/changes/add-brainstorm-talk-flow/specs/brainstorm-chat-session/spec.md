## MODIFIED Requirements

### Requirement: Typebar Brainstorm Command Routing

The system SHALL detect brainstorm entry intents and route the user to the correct dedicated brainstorming page.

#### Scenario: Navigate to brainstorm page from typebar

- **WHEN** the user submits `/brainstorm` from the main typebar
- **THEN** the app navigates to the brainstorm page and initializes a new brainstorm session context

#### Scenario: Navigate to brainstorm-talk page from supported launch points

- **WHEN** the user selects `/brainstorm-talk` from the main menu or from `SecondBrainBrainstormScreen`
- **THEN** the app navigates to the brainstorm-talk page and initializes a new voice brainstorm session context

#### Scenario: Non-brainstorm input remains unchanged

- **WHEN** the user submits input other than supported brainstorm commands from the main typebar
- **THEN** the app processes the input using the existing non-brainstorm behavior

### Requirement: Explicit End Command Triggers Final Classification

The system SHALL treat `/end` as a brainstorm control command that finalizes the active brainstorm session and invokes `classify.js` to create a finalized feed entry from the session transcript. For brainstorm-talk sessions, the finalized output MUST also be saved under `Brainstorm Conversation` and MUST invoke `/brainstorm` to generate a summary payload for that saved conversation.

#### Scenario: End command finalizes session

- **WHEN** the user submits `/end` on an active brainstorm page
- **THEN** the app invokes `classify.js` with the active session transcript and metadata

#### Scenario: Feed entry is created from finalized brainstorm

- **WHEN** `classify.js` succeeds for a brainstorm `/end` request
- **THEN** a new finalized entry is created in the Second Brain feed for that session

#### Scenario: Brainstorm-talk end saves conversation and summary

- **WHEN** the user submits `/end` on an active brainstorm-talk session
- **THEN** the app saves a `Brainstorm Conversation` record and calls `/brainstorm` to store the generated summary for that record

### Requirement: Exit Without End Triggers WIP Classification

The system SHALL invoke `classify.js` when a user leaves an active brainstorm session without submitting `/end`, and the resulting entry title SHALL be prefixed with `[BRAINSTORMING]`. In brainstorm-talk mode, an explicit pause action SHALL follow the same non-finalized work-in-progress semantics as leaving without `/end`.

#### Scenario: Leaving active brainstorm creates WIP entry

- **WHEN** the user leaves the brainstorm screen while the session is active and not ended
- **THEN** the app invokes `classify.js` for the current transcript and creates a feed entry representing work in progress

#### Scenario: WIP entry title includes brainstorming tag

- **WHEN** a feed entry is created from an implicit leave event
- **THEN** the entry title starts with `[BRAINSTORMING]` before the generated title text

#### Scenario: Pausing brainstorm-talk creates equivalent WIP state

- **WHEN** the user pauses an active brainstorm-talk session without `/end`
- **THEN** the app persists the conversation as a resumable work-in-progress state equivalent to leaving brainstorm without `/end`

### Requirement: Continue Brainstorming from Entry Detail

The system SHALL provide a `Continue Brainstorming` action in `SecondBrainEntryDetailScreen` that opens the brainstorm interface using resume-or-seed behavior, including restoring brainstorm-talk sessions when the source entry is a saved `Brainstorm Conversation`.

#### Scenario: Resume existing brainstorm session from entry

- **WHEN** the user taps `Continue Brainstorming` on an entry linked to a prior brainstorm session
- **THEN** the app opens the brainstorm page with the prior transcript restored at the point the user left off

#### Scenario: Seed new brainstorm from non-brainstorm entry

- **WHEN** the user taps `Continue Brainstorming` on an entry with no prior brainstorm session
- **THEN** the app starts a new brainstorm session and seeds the first user input from that entry content

#### Scenario: Resume brainstorm-talk conversation from entry detail

- **WHEN** the user taps `Continue Brainstorming` on an entry linked to a saved `Brainstorm Conversation`
- **THEN** the app opens the brainstorm-talk page with the prior transcript and session metadata restored
