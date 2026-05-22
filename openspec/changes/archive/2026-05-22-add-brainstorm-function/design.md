## Context

Second Brain currently supports command entry from the main typebar but does not provide a dedicated ideation workflow that keeps exploratory conversations separate from normal feed capture. The new `/brainstorm` command introduces a distinct route with a focused LLM chat session and completion behavior that can happen in two ways:
- explicit completion via `/end`
- implicit progress capture when the user exits the brainstorm screen

Both paths feed into `classify.js`, but implicit exits produce a WIP entry by prefixing the title with `[BRAINSTORMING]`. The entry detail experience also needs a `Continue Brainstorming` action so users can resume unfinished work from `SecondBrainEntryDetailScreen`.

This change spans command parsing, app routing, chat UI/session state, entry detail actions, and feed ingestion integration. Existing classification logic should be reused to avoid duplicating feed composition rules.

## Goals / Non-Goals

**Goals:**
- Provide a deterministic `/brainstorm` command flow from typebar to brainstorm page.
- Support multi-turn user/assistant brainstorm conversations in a dedicated chat interface.
- Support explicit session termination via `/end` with normal feed entry creation.
- Auto-classify and save a WIP feed entry when user leaves brainstorm without `/end`.
- Prefix WIP entry titles with `[BRAINSTORMING]` to make unfinished state visible.
- Add `Continue Brainstorming` action on `SecondBrainEntryDetailScreen`.
- Resume prior brainstorm context when available; otherwise seed a new brainstorm using entry content.
- Preserve transcript fidelity so classification receives complete brainstorming context.

**Non-Goals:**
- Replacing existing default chat or feed entry flows outside brainstorm mode.
- Reworking the classification taxonomy used by `classify.js`.
- Adding external third-party dependencies.

## Decisions

1. `/brainstorm` remains a command-layer concern and routes to a dedicated page.
- Rationale: keeps intent detection centralized and avoids overloading existing page logic.
- Alternative considered: in-place modal/overlay brainstorm UI. Rejected because route-based flow gives cleaner state boundaries and shareable/navigation-friendly behavior.

2. Brainstorm sessions store ordered message transcript with role metadata and lifecycle status.
- Rationale: `classify.js` requires coherent context; lifecycle fields (`active`, `wip-saved`, `ended`) control idempotent transitions.
- Alternative considered: concatenated plain text blob. Rejected because it is harder to validate, debug, and safely replay.

3. `/end` is parsed as a control command only in brainstorm mode.
- Rationale: prevents accidental command interpretation in other app areas.
- Alternative considered: global `/end` meaning. Rejected due to cross-feature conflicts and surprising user behavior.

4. Leaving brainstorm without `/end` triggers implicit classification as WIP.
- Rationale: captures user progress even when they navigate away, close, or back out.
- Alternative considered: discard unfinished sessions unless manually ended. Rejected because it risks idea loss.

5. WIP entries are distinguished by a title prefix `[BRAINSTORMING]`.
- Rationale: communicates unfinished status using current feed surface without schema-heavy UI changes.
- Alternative considered: separate feed type/badge only. Rejected for higher implementation coupling across feed rendering.

6. `Continue Brainstorming` in `SecondBrainEntryDetailScreen` rehydrates existing session when linked; otherwise starts a seeded new session.
- Rationale: supports both true resume and entry-origin continuation with predictable behavior.
- Alternative considered: only show button for brainstorm-origin entries. Rejected because user requested universal availability with fallback behavior.

7. All classification writes use idempotency keys tied to session and transition type.
- Rationale: prevents duplicate entries from repeated `/end`, rapid navigation events, or retried exit hooks.
- Alternative considered: client-only debounce. Rejected as insufficient for multi-event/retry scenarios.

## Risks / Trade-offs

- [Risk] Exit-triggered classification may fire during transient navigation. -> Mitigation: trigger only on confirmed screen leave/unmount and gate with lifecycle state.
- [Risk] Duplicate WIP + final entries for same moment. -> Mitigation: state machine transition rules (`active -> wip-saved` or `active -> ended`) and server-side idempotency keys.
- [Risk] `[BRAINSTORMING]` prefix collides with user-authored titles. -> Mitigation: add prefix only when absent and preserve original title text after prefix.
- [Risk] Resume context mismatch for non-brainstorm entries. -> Mitigation: explicit seeded-session flow storing source entry ID and seed prompt.
- [Risk] Large transcripts could slow classification. -> Mitigation: enforce maximum transcript window/size with deterministic truncation strategy while preserving recent context.
- [Risk] Partial failures between session leave and persistence. -> Mitigation: mark pending-save state and retry via background recovery on next app launch/session load.
