## 1. Inventory and Classification

- [x] 1.1 Inventory all files under `mobile/utils` and map current import call-sites.
- [x] 1.2 Compare inventory against `lib/` and flag overlap or duplicate functionality.
- [x] 1.3 Classify each utility as `mobile-scoped` or `shared` using runtime-coupling criteria.

## 2. Consolidation Design and Migration Prep

- [x] 2.1 Define final destination structure under `lib/` for shared utilities.
- [x] 2.2 Identify utilities that require compatibility re-export wrappers at legacy paths.
- [x] 2.3 Create a migration checklist that sequences file moves before import rewrites.

## 3. Implementation and Validation

- [x] 3.1 Move shared utilities from `mobile/utils` into `lib/` following the approved structure.
- [x] 3.2 Update all affected import call-sites to use new `lib/` paths.
- [x] 3.3 Add temporary compatibility re-exports for any unmigrated call-sites.
- [x] 3.4 Run automated tests and targeted mobile smoke checks to verify no regression.

## 4. Cleanup and Completion

- [x] 4.1 Remove compatibility wrappers once all call-sites are fully migrated.
- [x] 4.2 Confirm no remaining imports reference deprecated `mobile/utils` shared paths.
- [x] 4.3 Document final consolidation outcome and residual mobile-only utilities.
