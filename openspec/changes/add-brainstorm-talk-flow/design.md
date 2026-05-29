## Context

Second Brain currently supports text-based brainstorming via `/brainstorm`, with conversation state and explicit `/end` behavior already defined in the `brainstorm-chat-session` capability. The requested `/brainstorm-talk` flow adds a parallel voice-first interaction model that must preserve the same brainstorming prompt, same user journey shape, and same end-of-session outcomes.

This change crosses multiple surfaces: main menu entry points, `SecondBrainBrainstormScreen` launch actions, a conversational voice UI, transcript/session persistence, summary generation through the existing `/brainstorm` endpoint, and resume flows from saved entries. It also introduces an external voice provider (Unreal Speech) for both speech-to-text and text-to-speech, adding dependency, reliability, and credential-management concerns.

## Goals / Non-Goals

**Goals:**

- Add deterministic routing into `/brainstorm-talk` from main menu and from `SecondBrainBrainstormScreen`.
- Preserve brainstorming quality by reusing the exact same prompt logic used in existing brainstorm chat.
- Implement turn-based voice conversation where user speech is transcribed and sent to the LLM, and assistant responses are synthesized and played back.
- Reuse `/end` semantics: finalize session, persist under `Brainstorm Conversation`, and call `/brainstorm` endpoint to produce a summary.
- Add an explicit pause control in brainstorm-talk mode that mirrors existing brainstorm "leave without `/end`" behavior for WIP persistence and continuation.
- Support continuing previous brainstorm-talk sessions from saved conversation entries.
- Ensure session-write idempotency to avoid duplicate saved conversations/summaries on repeated end or reconnect/retry events.

**Non-Goals:**

- Replacing or removing the existing text-only `/brainstorm` flow.
- Redesigning overall feed taxonomy beyond adding/using the `Brainstorm Conversation` grouping.
- Changing LLM prompt strategy or brainstorming instruction content.
- Building a provider-agnostic voice abstraction beyond what is needed for Unreal Speech integration.

## Decisions

1. Represent `/brainstorm-talk` as a dedicated brainstorm mode that shares the existing brainstorm prompt builder and transcript model.

- Rationale: prompt consistency is a hard requirement, and shared transcript schema enables reuse of save/summary flows.
- Alternative considered: separate talk-specific prompt. Rejected because it risks behavior drift from existing brainstorm guidance.

2. Keep speech as an interface layer, not as a new data model.

- Rationale: persisted source of truth remains normalized text turns (`role`, `content`, timestamps, session metadata). Audio is transient transport/output.
- Alternative considered: storing audio blobs for each turn. Rejected due to storage growth, complexity, and no explicit requirement for audio replay.

3. Introduce a voice session state machine with explicit turn phases.

- Rationale: explicit phases (`idle`, `listening`, `transcribing`, `waiting-llm`, `speaking`, `error`) prevent overlapping mic capture/TTS playback and simplify recovery.
- Alternative considered: implicit boolean flags. Rejected because race conditions become harder to reason about in async voice + network flows.

4. Unreal Speech integration is encapsulated behind service functions for STT and TTS.

- Rationale: centralizes auth headers, retries, timeout policy, and response normalization while keeping screen components focused on UX state.
- Alternative considered: direct API calls inside screen components. Rejected due to duplication and harder testability.

5. `/end` remains the only explicit finalize command, with idempotent save + summary generation.

- Rationale: matches established brainstorm mental model and existing command semantics.
- Alternative considered: UI-only end button without command support. Rejected because requirement is flow parity with brainstorm screen semantics.

6. Add a pause transition in brainstorm-talk that reuses implicit WIP-save behavior from brainstorm exit-without-`/end`.

- Rationale: users need thinking time without accidentally finalizing; pause should preserve context exactly like temporary exit from brainstorm.
- Alternative considered: in-memory-only pause with no persistence. Rejected because app backgrounding/interruptions could lose progress.

7. Persist brainstorm-talk outputs as `Brainstorm Conversation` records that support resume.

- Rationale: users need to continue conversations; storing session linkage and transcript context supports deterministic restoration.
- Alternative considered: save only final summary text. Rejected because resume would lose conversational context.

8. Call `/brainstorm` endpoint after finalize using the completed transcript to generate summary metadata.

- Rationale: reuses existing summarization path and avoids introducing a new endpoint contract.
- Alternative considered: local/device summary generation. Rejected due to consistency and quality concerns.

## Risks / Trade-offs

- [Risk] Voice UX latency may feel slow across transcribe + LLM + synth chain. -> Mitigation: show explicit turn-state indicators and allow interruption/cancel before submit.
- [Risk] STT mis-transcription can distort user intent. -> Mitigation: display recognized text before send and allow quick edit/retry in talk UI.
- [Risk] TTS playback can overlap with new user input. -> Mitigation: automatically stop playback on new listen action and gate state transitions.
- [Risk] Duplicate finalization from repeated `/end` or unstable connectivity. -> Mitigation: session transition guards and idempotency key per session-finalize event.
- [Risk] Pause action could incorrectly trigger finalize/summary. -> Mitigation: enforce distinct transitions (`paused-wip` vs `ended-final`) and block `/brainstorm` summary calls on pause paths.
- [Risk] External provider downtime impacts core flow. -> Mitigation: graceful fallback errors, retry policy, and preserving transcript continuity when voice services fail.
- [Risk] Credential leakage/security issues with Unreal Speech keys. -> Mitigation: use server-side proxy or secure env handling pattern already used for external APIs; never embed long-lived secrets in client bundles.

## Migration Plan

- Add feature flags/config toggles for Unreal Speech integration and `/brainstorm-talk` route visibility.
- Add pause capability to brainstorm-talk session state model and persistence schema before enabling UI controls.
- Deploy backend/service support for Unreal Speech calls and `/brainstorm` finalize linkage first.
- Ensure pause-triggered WIP persistence path reuses or aligns with existing leave-without-`/end` classification behavior.
- Release client route + voice UI behind flag for internal validation.
- Enable gradually, monitor error rates (STT failures, TTS failures, finalize failures), then roll out broadly.
- Rollback strategy: disable `/brainstorm-talk` entry points via flag while retaining existing `/brainstorm` text flow.

## Open Questions

- Should recognized STT text be auto-sent or require explicit confirmation each turn?
- What exact schema key/grouping should back the `Brainstorm Conversation` dropdown in existing entry/detail UI?
- Should continue behavior resume at last assistant turn only, or include pending unfinished user utterances if a session ended unexpectedly?
- Is Unreal Speech accessed directly from client or through an existing backend proxy in this codebase?
