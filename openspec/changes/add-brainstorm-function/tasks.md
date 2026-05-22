## 1. Command Routing and Session Bootstrap

- [x] 1.1 Add `/brainstorm` detection in the main typebar command handler and route to the brainstorm page.
- [x] 1.2 Initialize a new brainstorm session record/state on page entry with unique session ID and lifecycle state.
- [x] 1.3 Preserve existing typebar behavior for all non-`/brainstorm` inputs.

## 2. Brainstorm Chat Interface and Turn Handling

- [x] 2.1 Build the brainstorm page chat UI with ordered message rendering for user and assistant roles.
- [x] 2.2 Implement submit handling for standard brainstorm messages to append user turns and call the LLM.
- [x] 2.3 Append assistant responses to the same session transcript in deterministic order.
- [x] 2.4 Handle loading/error states for LLM turn requests without breaking session continuity.

## 3. Explicit End and Implicit Leave Classification

- [x] 3.1 Implement exact-match `/end` command parsing scoped to brainstorm mode only.
- [x] 3.2 On `/end`, invoke `classify.js` with transcript and required session metadata to create finalized feed output.
- [x] 3.3 Add brainstorm screen exit hook to invoke `classify.js` when session is active and not ended.
- [x] 3.4 Prefix implicit-leave entry titles with `[BRAINSTORMING]` before persisted title text.
- [x] 3.5 Add idempotency guard keys/state so repeated end/leave triggers do not create duplicate entries.

## 4. Continue Brainstorming from Entry Detail

- [x] 4.1 Add `Continue Brainstorming` menu-drawer action in `SecondBrainEntryDetailScreen`.
- [x] 4.2 Implement resume path that reopens existing linked brainstorm transcript where user left off.
- [x] 4.3 Implement seeded-new-session path for entries without brainstorm history using entry content as first input.
- [x] 4.4 Persist and maintain entry-to-brainstorm linkage metadata needed for resume behavior.

## 5. Validation and Regression Coverage

- [x] 5.1 Add automated tests for routing, chat turn ordering, `/end` finalization, and duplicate-end prevention.
- [x] 5.2 Add tests for implicit leave behavior including single WIP save and `[BRAINSTORMING]` title prefixing.
- [x] 5.3 Add tests for `Continue Brainstorming` resume path and seeded-new-session fallback path.
- [x] 5.4 Add integration test coverage for end-to-end flows: `/brainstorm` -> conversation -> `/end`; and `/brainstorm` -> leave -> WIP entry -> continue.
