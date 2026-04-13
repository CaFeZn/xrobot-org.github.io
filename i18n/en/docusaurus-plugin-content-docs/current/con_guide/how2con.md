---
id: con-guide-how2con
title: How to Contribute
sidebar_position: 1
---

# How to Contribute

Most contributions go through `Issue` and `Pull Request`. Local fixes, doc corrections, and example updates can usually go straight to a `PR`. Public interface changes, runtime semantics, concurrency behavior, driver hot paths, and large refactors should start with an `Issue`.

## `Issue`

An `Issue` should at least include:

- the observed problem or target
- the affected scope
- reproduction conditions or usage scenario
- the expected result

Bug reports should not stop at “there is a bug here”. Refactor requests should not stop at “I want to change this”. Reviewers need enough information to judge whether the change is local, semantic, or structural.

## `Pull Request`

A `PR` should stay on one topic. The description can be kept to four parts:

- what changed
- why it changed
- how it was verified
- what is still unverified

Small fixes do not need a long write-up, but they also should not be just a title. For driver, concurrency, or performance work, the affected path should be visible from the description.

```text
## What
- fix uart BLOCK timeout wakeup path

## Why
- late completion may post an expired waiter

## Verify
- build linux test
- run related regression

## Not Verified
- no board-side verification on CH32
```

## Discussion Boundary

The following changes should be discussed first:

- public interface changes
- semantic changes to existing behavior
- cross-platform public-layer changes
- driver hot-path rewrites
- large refactors

The following changes can usually go straight to a `PR`:

- clear bug fixes
- doc additions and corrections
- example fixes
- local test additions
- cleanup that does not change semantics

## Verification

Code changes should at least build. Driver, concurrency, and performance changes should include the corresponding validation. Doc changes should at least check links, structure, and preview output. Unverified parts can remain, but they should be stated explicitly.
