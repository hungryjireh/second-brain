## 1. Duplicate Discovery and Prioritization

- [x] 1.1 Scan the codebase for duplicate logic candidates and record file-level inventory with confidence labels.
- [x] 1.2 Rank duplicate clusters by impact (change frequency, bug history, and call-site breadth).
- [x] 1.3 Select first consolidation batch containing only behaviorally equivalent duplicates.

## 2. Shared Abstraction Implementation

- [x] 2.1 Create or extend shared modules for the selected duplicate cluster with narrow, explicit interfaces.
- [x] 2.2 Replace duplicated implementations with calls to shared abstractions while preserving existing external interfaces.
- [x] 2.3 Remove obsolete duplicate code paths after replacement and verify imports/build references remain valid.

## 3. Regression Safety and Verification

- [x] 3.1 Add or update regression tests that cover previously duplicated behavior for each consolidated cluster.
- [x] 3.2 Run full JavaScript test suite (`npm test`) after each batch and resolve any behavior regressions.
- [x] 3.3 Validate that consolidated paths match pre-refactor behavior using fixture or snapshot comparisons where applicable.

## 4. Incremental Delivery and Documentation

- [x] 4.1 Submit consolidation changes in small PR-sized batches with clear before/after mapping.
- [x] 4.2 Document consolidation decisions, deferred near-duplicate candidates, and follow-up opportunities.
- [x] 4.3 Confirm all proposal/spec/design acceptance conditions are satisfied before marking change complete.
