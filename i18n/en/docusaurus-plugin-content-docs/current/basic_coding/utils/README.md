---
id: utils-coding
title: Utilities and Math
sidebar_position: 6
---

# Utilities and Math

This module summarizes the lightweight state utilities and geometry / kinematics utilities that are currently exported directly by LibXR mainline.

## Features

- **Foundational scope**: includes both lightweight state tools such as `Flag` and math-oriented types for pose, inertia, and kinematic chains.
- **Aligned with current public exports**: this directory matches the `flag / transform / inertia / kinematic` interfaces currently exported by `libxr.hpp`.
- **Clear compile boundary**: except for `Flag`, the types covered here are gated by `LIBXR_NO_EIGEN`; when Eigen is disabled, those types are not compiled.

## Contents

- [Flag](./flag.md)
- [Transform](./transform.md)
- [Inertia](./inertia.md)
- [Kinematic](./kinematic.md)

See the individual pages for details.
