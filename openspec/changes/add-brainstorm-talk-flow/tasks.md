## 1. Routing And Session Mode Setup

- [x] 1.1 Add `/brainstorm-talk` launch entry from the main menu and wire navigation to a dedicated brainstorm-talk route/screen.
- [x] 1.2 Add `/brainstorm-talk` launch entry from `SecondBrainBrainstormScreen` and pass required brainstorm context into the talk session initializer.
- [x] 1.3 Extend brainstorm session metadata to include a deterministic mode flag (`text` vs `talk`) while preserving existing transcript schema.

## 2. Voice Service Integration (Unreal Speech)

- [x] 2.1 Implement a centralized Unreal Speech service module for speech-to-text requests with auth, timeout, and normalized error handling.
- [x] 2.2 Implement a centralized Unreal Speech service module for text-to-speech synthesis and audio playback integration.
- [x] 2.3 Add secure environment/config plumbing for Unreal Speech credentials and ensure no long-lived keys are hardcoded in client bundles.

## 3. Brainstorm-Talk Conversation Loop

- [x] 3.1 Build the brainstorm-talk UI state machine (`idle`, `listening`, `transcribing`, `waiting-llm`, `speaking`, `error`) with guards against overlapping capture/playback.
- [x] 3.2 Transcribe user voice input and append recognized text as user turns before submitting to the LLM.
- [x] 3.3 Reuse the exact prompt construction path from `SecondBrainBrainstormScreen` when sending brainstorm-talk turns to the LLM.
- [x] 3.4 Synthesize assistant text responses to speech and ensure playback ordering matches transcript ordering.
- [x] 3.5 Add a pause control and state transition that suspends talk flow safely without finalizing the session.

## 4. End, Save, And Summary Generation

- [x] 4.1 Handle `/end` in brainstorm-talk mode to finalize the active session with idempotent transition guards.
- [x] 4.2 Persist finalized brainstorm-talk sessions under `Brainstorm Conversation` and store transcript/session linkage for future resume.
- [x] 4.3 Invoke `/brainstorm` on finalize with the completed transcript and persist returned summary data with the saved conversation record.
- [x] 4.4 Implement pause persistence to mirror brainstorm leave-without-`/end` WIP behavior and ensure pause path does not trigger finalize-summary calls.

## 5. Continue Brainstorming Flow

- [x] 5.1 Update `SecondBrainEntryDetailScreen` continue action logic to route to brainstorm-talk when the source entry is a saved `Brainstorm Conversation`.
- [x] 5.2 Rehydrate prior brainstorm-talk transcript and session metadata on resume, including safe handling for partial/incomplete prior turns.

## 6. Validation And Regression Coverage

- [x] 6.1 Add/update tests for routing and launch paths (`/brainstorm` vs `/brainstorm-talk`, main menu, brainstorm screen entry point).
- [x] 6.2 Add/update tests for voice loop behavior, including STT failure, TTS failure, and playback interruption handling.
- [x] 6.3 Add/update tests for pause behavior (WIP-equivalent persistence, resumability, and no `/brainstorm` finalize-summary call).
- [x] 6.4 Add/update tests for `/end` idempotency, `Brainstorm Conversation` persistence, `/brainstorm` summary call, and continue-brainstorming restore behavior.
