## Context

The current codebase includes repeated utility logic and similar implementation blocks across multiple modules. These duplicates increase long-term maintenance effort and create divergence risk when only one copy is updated. The change must reduce duplication without breaking existing behavior or requiring public API changes.

## Goals / Non-Goals

**Goals:**
- Identify high-confidence duplicate logic worth consolidating.
- Replace duplicate implementations with shared abstractions.
- Preserve existing behavior through focused regression coverage.
- Improve maintainability and consistency for future development.

**Non-Goals:**
- Large-scale architecture rewrites unrelated to duplication.
- Public API redesigns.
- Introducing new runtime dependencies solely for deduplication.

## Decisions

1. Use an incremental consolidation strategy rather than a broad rewrite.
Rationale: Incremental changes reduce regression risk and simplify review.
Alternative considered: One-pass refactor of all duplicates. Rejected because blast radius is too large.

2. Prioritize behaviorally identical duplication first.
Rationale: Identical code paths can be consolidated safely with lower ambiguity.
Alternative considered: Consolidating near-duplicate logic immediately. Deferred until identical cases are complete.

3. Require regression tests for each consolidated cluster.
Rationale: Tests provide safety when replacing multiple implementations with a shared abstraction.
Alternative considered: Relying on existing tests only. Rejected because current coverage may not exercise all duplicated branches.

4. Keep consolidation abstractions close to current module boundaries.
Rationale: Localized shared modules minimize import churn and avoid premature over-generalization.
Alternative considered: Central "global utils" migration. Rejected to prevent creating a catch-all dependency sink.

## Risks / Trade-offs

- [Risk] False-positive duplicate detection could collapse logic with subtle differences. -> Mitigation: consolidate only after behavior comparison and test parity checks.
- [Risk] Shared abstraction might become overly generic. -> Mitigation: define narrow interfaces and split helpers when responsibilities diverge.
- [Risk] Refactor churn can cause merge conflicts in active areas. -> Mitigation: land changes in small, scoped batches.
- [Risk] Short-term delivery velocity may dip during cleanup. -> Mitigation: prioritize high-impact duplicate clusters first.

## Migration Plan

1. Inventory duplicate candidates and rank by impact and confidence.
2. Consolidate one duplicate cluster at a time into shared modules.
3. Replace call sites and run test suite after each cluster.
4. Rollback path: revert the latest consolidation commit if regression appears.

## Open Questions

- Which duplicate clusters currently cause the highest bug or change friction?
- Are there module ownership constraints that require sequencing across teams?
