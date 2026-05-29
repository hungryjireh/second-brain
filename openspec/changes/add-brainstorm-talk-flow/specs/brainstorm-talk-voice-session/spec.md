## ADDED Requirements

### Requirement: Brainstorm Talk Entry Routing

The system SHALL provide a `/brainstorm-talk` flow that can be launched from the main menu and from `SecondBrainBrainstormScreen`.

#### Scenario: Launch from main menu

- **WHEN** the user selects `/brainstorm-talk` from the main menu
- **THEN** the app navigates to the brainstorm-talk screen and initializes a new voice brainstorm session

#### Scenario: Launch from brainstorm screen

- **WHEN** the user triggers `/brainstorm-talk` from `SecondBrainBrainstormScreen`
- **THEN** the app navigates to the brainstorm-talk screen and preserves brainstorm context needed for the session

### Requirement: Voice-To-LLM Turn Submission

The system SHALL transcribe user speech to text and submit the transcribed text to the LLM using the exact brainstorming prompt used by `SecondBrainBrainstormScreen`.

#### Scenario: Successful speech transcription and send

- **WHEN** the user records a voice turn and transcription succeeds
- **THEN** the app appends the transcribed user message to the transcript and sends it to the LLM with the existing brainstorm prompt

#### Scenario: Speech transcription failure

- **WHEN** transcription fails for a recorded user turn
- **THEN** the app shows an error and does not send an empty or invalid user turn to the LLM

### Requirement: LLM-To-Voice Assistant Playback

The system SHALL convert each assistant text response into speech and play it back to the user.

#### Scenario: Assistant response is synthesized

- **WHEN** the LLM returns an assistant response in a brainstorm-talk session
- **THEN** the app synthesizes that response to speech and plays it after adding the assistant text to transcript order

#### Scenario: Playback is interrupted by a new listen action

- **WHEN** the user starts a new listen action while assistant audio is playing
- **THEN** the app stops current playback before starting the next capture cycle

### Requirement: Unreal Speech Provider Integration

The system SHALL use Unreal Speech as the provider for speech-to-text and text-to-speech operations in brainstorm-talk sessions.

#### Scenario: STT request uses Unreal Speech

- **WHEN** the app transcribes user audio in brainstorm-talk mode
- **THEN** the transcription request is sent through the configured Unreal Speech integration path

#### Scenario: TTS request uses Unreal Speech

- **WHEN** the app synthesizes assistant audio in brainstorm-talk mode
- **THEN** the synthesis request is sent through the configured Unreal Speech integration path

### Requirement: End Command Persists Brainstorm Conversation And Summary

The system SHALL treat `/end` as the explicit finalize command for brainstorm-talk sessions, persist the result under `Brainstorm Conversation`, and call `/brainstorm` to generate a summary.

#### Scenario: End command finalizes and saves conversation

- **WHEN** the user submits `/end` in an active brainstorm-talk session
- **THEN** the app finalizes the session and saves it as a `Brainstorm Conversation` record

#### Scenario: End command triggers summary generation

- **WHEN** a brainstorm-talk session is finalized via `/end`
- **THEN** the app invokes `/brainstorm` with the completed session transcript and stores the returned summary with the saved conversation

### Requirement: Pause Mirrors Implicit WIP Brainstorm State

The system SHALL provide a pause action in brainstorm-talk mode that mirrors the existing brainstorm behavior when leaving without `/end`, preserving a resumable work-in-progress state without finalizing.

#### Scenario: Pause saves WIP without final summary

- **WHEN** the user pauses an active brainstorm-talk session
- **THEN** the app persists the current transcript as a resumable work-in-progress `Brainstorm Conversation` state and does not treat the session as ended

#### Scenario: Pause does not call end summary path

- **WHEN** a brainstorm-talk session is paused
- **THEN** the app does not invoke the `/brainstorm` finalize-summary flow that is reserved for `/end`

### Requirement: Continue Brainstorm Talk Sessions

The system SHALL allow users to continue an existing saved brainstorm-talk conversation.

#### Scenario: Resume from saved brainstorm conversation

- **WHEN** the user chooses continue on a saved `Brainstorm Conversation`
- **THEN** the app restores prior transcript context and continues the session in brainstorm-talk mode
