---
id: con-guide-change-boundary
title: Change Boundaries
sidebar_position: 4
---

# Change Boundaries

Prefer the smallest change that directly solves the target problem.

The following kinds of incidental edits are usually acceptable:

- naming fixes in the exact area already being changed
- obvious corrections to comments, docs, or examples
- small local cleanup of duplicated code
- low-risk cleanup directly tied to the current change

The following should not be mixed into the same change:

- large refactors in unrelated modules
- style unification across a whole subsystem
- performance work unrelated to the current problem
- rewriting historical code into a different structure wholesale

Driver and concurrency changes need extra care, especially around interrupt paths, DMA paths, `ReadPort / WritePort / Operation`, `Topic / LinuxSharedTopic`, and `Semaphore / Thread / ASync`. For these changes, the description should state which path changed, what semantic difference was introduced, and how regressions were checked.

Performance changes should not stop at “it feels faster”. State which path was measured, what baseline it was compared against, and whether there is any tradeoff in functionality or stability.

Doc rewrites also need scope control. Keep the neighboring page structure aligned. Do not move usage tutorials into the contribution guide. Do not write validation logs, review logs, or trial-and-error history into the body text.
