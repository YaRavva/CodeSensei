---
id: SPEC-landing-and-auth-redesign
type: architecture-design
status: active
title: Landing Page and Auth Redesign Specification
---

# Landing Page and Auth Redesign & Platform Structure Specification

## Summary

This specification records the architectural and design decisions established during our work sessions regarding:
1. **Authentication UI & Messaging**: Integration of OAuth providers (Google and GitHub) on both login and registration screens, replacing free-tier claims with clear progress storage messaging (`"Хранение прогресса — регистрация нужна только для хранения вашего прогресса"`), and aligning logo dimensions, styling, and sidebar feature list spacing.
2. **Footer Optimization**: Minimization of footer padding and spacing to ensure clean layout structure across all pages.
3. **Responsive Auth Layout**: Compact spacing and padding ensuring login and registration pages fit comfortably on a single viewport without vertical scrolling.
4. **Curriculum Architecture (Modules & Tasks)**:
   - Splitting the "Строки" module into **Строки (Базовый)** and **Строки (Углубленный)** (with F-strings).
   - Converting all non-function tasks across all modules (except dedicated function, recursion, and class modules) to linear/procedural Python code without `def` functions.
   - Introducing unique technical identifiers for module topics (`topic`).
   - Creating two new advanced hard-level modules: **«Генераторы списков и словари (Углубленный)»** and **«Лямбда-функции и встроенные алгоритмы (Углубленный)»**.
   - Standardizing and enriching module theory descriptions to meet reference Markdown formatting standards.
5. **Landing Page Design Standards**: Adherence to the `landing-page-design` skill guidelines for typography, spacing, conversion clarity, and visual hierarchy.

## Requirements & Invariants

- **Auth Clarity**: Registration is explicitly positioned around progress tracking and achievement storage rather than pricing/billing.
- **Code Execution Parity**: Non-function tasks operate correctly in the Pyodide test runner via global variable injection and `result` variable evaluation.
- **Spec Ground Truth**: All architectural changes and module/task reorganizations are documented in the spec graph.
