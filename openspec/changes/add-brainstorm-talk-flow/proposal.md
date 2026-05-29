## Why

The current brainstorm flow is text-only, which adds friction when users want a natural, spoken ideation loop. Adding a `/brainstorm-talk` conversational mode now extends the existing brainstorming experience into hands-free voice interaction while preserving the same prompt quality and session outcomes.

## What Changes

- Add a new `/brainstorm-talk` entry point from the main menu and from `SecondBrainBrainstormScreen`.
- Introduce a voice-first brainstorm conversation flow that captures user speech (speech-to-text), sends transcript text to the LLM with the same brainstorming prompt used by the current brainstorm screen, and plays assistant responses via text-to-speech.
- Reuse brainstorm control semantics, including `/end`, and on end persist the session under a `Brainstorm Conversation` dropdown section.
- Add a pause behavior in brainstorm-talk mode that mirrors leaving `SecondBrainBrainstormScreen` without `/end`: save work-in-progress state and allow later continuation without finalizing.
- Invoke the existing `/brainstorm` backend endpoint when ending the conversation to generate a summary.
- Add resume behavior so users can continue prior brainstorm-talk sessions.
- Integrate Unreal Speech as the provider for speech-to-text and text-to-speech in this flow.

## Capabilities

### New Capabilities

- `brainstorm-talk-voice-session`: Voice-driven brainstorming conversation lifecycle, including STT input, TTS output, and live conversational turn handling.

### Modified Capabilities

- `brainstorm-chat-session`: Extend brainstorm session routing, end/save behavior, summary generation, and continue-brainstorming pathways to include `/brainstorm-talk` sessions and persisted Brainstorm Conversation records.

## Impact

- Affected mobile UI/navigation: main menu entry points, `SecondBrainBrainstormScreen`, and the new/updated brainstorm-talk screen flow.
- Affected conversation/session persistence: storage model and entry-detail rendering for Brainstorm Conversation items.
- Affected API integration: `/brainstorm` summary call on conversation end and any resume/session fetch paths.
- New external dependency and runtime integration: Unreal Speech APIs for STT/TTS, including credentials/configuration and error handling.
