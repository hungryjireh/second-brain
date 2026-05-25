## Context

The repository has a root-level `lib/` directory used for shared server and application utilities. The proposed change evaluates whether utility code under `mobile/utils` should be consolidated under `lib/` to reduce duplication and improve discoverability. At the time of proposal creation, `mobile/utils` does not contain tracked files, which indicates either prior cleanup or pending utility additions; this design therefore covers both immediate verification and forward-compatible consolidation rules.

## Goals / Non-Goals

**Goals:**

- Establish explicit criteria for deciding whether a utility belongs in `mobile/` scope or shared `lib/` scope.
- Define a safe migration workflow for any existing or newly identified `mobile/utils` modules that should be shared.
- Preserve runtime behavior by requiring import migration validation and compatibility safeguards.
- Produce a repeatable process that can be reused for future utility placement decisions.

**Non-Goals:**

- Reorganizing unrelated non-utility mobile modules.
- Introducing new third-party dependencies.
- Refactoring utility logic beyond what is required for consolidation and compatibility.

## Decisions

1. Decision: Use a capability-driven inventory first, then migrate.

- Rationale: Inventory avoids accidental moves and clarifies which modules are truly shared.
- Alternative considered: Directly move folders and fix imports afterward; rejected because it increases break risk and obscures intent.

2. Decision: Define placement rules based on runtime coupling.

- Rule: Utilities that depend on mobile-only runtime APIs (e.g., React Native platform modules) stay in mobile-scoped folders; runtime-agnostic utilities move to `lib/`.
- Rationale: Prevents shared code from implicitly depending on mobile-only primitives.
- Alternative considered: Move everything to `lib/`; rejected because it can pollute shared layers with platform-coupled code.

3. Decision: Use temporary compatibility re-exports for phased migration.

- Rationale: Re-export stubs in legacy paths reduce large-bang refactors and unblock incremental updates.
- Alternative considered: Immediate import rewrites with no compatibility layer; rejected due to higher coordination risk.

4. Decision: Require verification through existing test suite and focused import checks.

- Rationale: Behavioral parity must be confirmed with objective checks after path updates.
- Alternative considered: Rely on code review only; rejected because import/path regressions can be subtle.

## Risks / Trade-offs

- [Misclassification of utility scope] -> Mitigation: Apply a checklist for runtime dependencies and call-site diversity before moving files.
- [Circular import introduction during moves] -> Mitigation: Validate dependency direction before and after migration; avoid re-export chains longer than one hop.
- [Stale compatibility wrappers] -> Mitigation: Track wrappers in tasks with explicit cleanup acceptance criteria.
- [Minimal immediate code to move] -> Mitigation: Still codify and adopt policy now so future utilities follow consistent placement.

## Migration Plan

1. Inventory current `mobile/utils` contents and identify overlap candidates against `lib/`.
2. Classify each utility as `mobile-scoped` or `shared` using coupling criteria.
3. For shared utilities, move modules into `lib/` with stable naming conventions.
4. Add temporary re-export wrappers at old paths where needed.
5. Update import call-sites to new `lib/` paths.
6. Run tests and targeted smoke checks for touched mobile flows.
7. Remove wrappers once all imports are migrated and verified.

Rollback strategy:

- If regressions appear, restore previous import paths and retain wrappers while completing missing call-site migrations.

## Open Questions

- Should shared utility subfolders be introduced under `lib/` (for example `lib/mobile-shared/`) or should moved files merge into existing `lib/` layout directly?
- What is the acceptable deprecation window for compatibility re-exports before mandatory cleanup?
