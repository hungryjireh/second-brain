# Style Consolidation Guide

## Duplicate-style inventory (current focus)

The first consolidation batch targets auth/profile form screens where the same declarations were repeated.

- Spacing/layout patterns
- `actionsRow` vertical action group used in multiple screens.
- `primaryButton` / `secondaryButton` geometry and alignment.

- Typography patterns
- Primary and secondary button label typography.
- Shared input text typography.

- Surface/border patterns
- Raised input fields (`bgRaised`, `border`, radius/padding).
- Secondary raised button shell (`bgRaised` + border).

## Priority order

1. High reuse, low risk: form primitives (input, action rows, button geometry).
2. High reuse, medium risk: composed visual patterns (primary/secondary button variants).
3. Follow-up batches: shared card shells and status/feedback blocks once validated in more screens.

## Naming conventions

- Primitive tokens/compositions use `commonFormPrimitives.*` and `commonFormCompositions.*`.
- Primitive names describe structure, not feature context (`inputBase`, `actionsColumn`).
- Composition names include intent + visual family (`primaryAccentButton`, `secondaryRaisedButton`).
- Screen-level styles may extend shared styles with local overrides only for true screen-specific needs.

## Usage boundaries

Use shared primitives/compositions when:
- A style appears in multiple screens.
- A style is foundational (input/button/action layout) and should remain consistent.

Keep local screen-specific styles when:
- The style is unique to one interaction or view.
- The style is tied to one-off media/layout behavior.

If a local style begins to repeat in another module, promote it into `commonStyles.js`.

## Verification checklist for each migration batch

- Confirm migrated style keys are referenced correctly by consuming components.
- Confirm interactive states (disabled/active) still apply expected overrides.
- Run automated tests before merge.
- If visual drift is detected, revert only the affected batch and re-scope the composition.
