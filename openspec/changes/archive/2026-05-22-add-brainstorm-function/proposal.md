## Why

Users need a dedicated way to brainstorm interactively inside Second Brain without mixing exploratory conversations into the main feed flow. In addition to explicit `/end`, users also need safe progress capture when they leave mid-session, plus an easy way to resume unfinished brainstorming from an entry.

## What Changes

- Add a `/brainstorm` typebar command that routes the user to a dedicated brainstorm page.
- Build a brainstorm chat experience that supports multi-turn back-and-forth conversation with the LLM.
- Add `/end` command handling inside brainstorm sessions to terminate the session intentionally.
- On `/end`, invoke `classify.js` with the session transcript/context so it can generate and store a feed entry in Second Brain.
- If a user leaves brainstorm without `/end`, automatically invoke `classify.js` and create a WIP feed entry with a `[BRAINSTORMING]` prefix before the title.
- In `SecondBrainEntryDetailScreen`, add a menu-drawer action `Continue Brainstorming` to reopen/resume brainstorming from that entry context.
- If `Continue Brainstorming` is used on an entry not originally created from brainstorm, start a new brainstorm conversation seeded with the entry content as input.
- Add guards so finalization and WIP-save flows do not create duplicate feed entries for the same session state transition.

## Capabilities

### New Capabilities
- `brainstorm-chat-session`: Dedicated brainstorm route, session-based LLM chat loop, explicit and implicit session finalization behavior, WIP tagging on early exit, and resume/continue entry integration.

### Modified Capabilities
- None.

## Impact

- Affected app areas: typebar command parsing, routing/navigation, chat UI state management, entry detail menu actions, and feed creation integration.
- Affected backend/service logic: LLM conversation endpoint(s), session lifecycle hooks, and `classify.js` invocation paths for explicit end and implicit leave.
- Affected data model: brainstorm session transcript/metadata, linkage between feed entries and brainstorm sessions, and persisted session status for resume.
- Dependencies: no new production dependencies required; reuses existing LLM/chat and classification infrastructure.
