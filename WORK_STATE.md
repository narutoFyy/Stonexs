# Work State

## Status

`in_progress`

## Current Task

`T7B` - Production deployment remains paused and outside the scope of the completed product changes.

## Rules

- Execution mode: `state-main`
- Plan topology: `linear`
- Adopted source: Scira at `e1692f5bdec7ec3f6482a24e0c6cf9b483d810f9`
- Adoption action: fork/adapt while preserving upstream Git history
- Custom-code boundary: Sub2API adapters, academic providers, paid delivery, figure jobs, product UI, configuration, and tests
- Preserve Scira's chat, streaming, database, file, and artifact foundations.
- Complete and verify one task before activating the next.

## Tasks

| ID | Task | Status | Acceptance |
| --- | --- | --- | --- |
| T1 | Fork and slim Scira | done | Pinned upstream history is present; untouched baseline installs/builds; AGPL notices remain. |
| T2 | Replace identity and payments | done | Sub2API auth/balance/debit/refund contracts pass without a second password store. |
| T3 | Replace Academic provider | done | Mixed Chinese/English search merges deterministically under partial failures. |
| T4 | Add Dotaindex and 673 adapters | done | Independent flags; neither affects the primary search path. |
| T5 | Add paid delivery | done | PDF validation plus at-most-once CNY 1 debit and eventual refund/delivery. |
| T6 | Add scientific figures | done | User-isolated editable figure bundles are generated and downloadable. |
| T7 | Brand, redesign, and deploy | implementing | Initial Swiss research UI is verified; production deployment remains pending. |
| T8 | 石头学术 astronomical visual redesign | done | Original generated background, adopted Magic UI effects, unified desktop pages, and focused browser QA. |
| T9 | Direct scholarly search experience | done | Dotaindex-style `q` URL search, direct mixed provider results, and AI as a secondary assistant. |
| T10 | 90tsg English database entry | done | Configurable same-origin redirect to the verified English database entry; no credentials or cookies persisted. |
| T11 | Generic scientific figure workflow | done | Generic presets, prompt copy, and individual PNG/SVG/JSON/ZIP downloads over the existing my-image-sci pipeline. |
| T12 | AI-assisted scientific figure workflow | done | Authenticated prompt-polish API plus a two-step UI from short research idea to editable figure bundle. |
| T13 | Deploy figure workflow to .189:18083 | blocked | SSH is available and port 18083 is free; deployment awaits production environment values for database, AI providers, and R2 storage. |

## Completed Task

### T8

- Purpose: implement the confirmed “玄玑观象台” desktop visual direction without changing product behavior.
- Allowed read/write: `app/globals.css`, `app/layout.tsx`, `app/(auth)/**`, `app/downloads/page.tsx`, `app/figures/page.tsx`, `components/chat-interface.tsx`, `components/app-sidebar.tsx`, `components/auth-card.tsx`, `components/sidebar-layout.tsx`, `components/ui/form-component.tsx`, `components/example-categories.tsx`, new `components/shitou/**`, and `public/visuals/**`.
- Non-goals: mobile redesign, search/auth/balance/payment/API changes, migrations, deployment, or importing another application's route/data/auth stack.
- Reuse source: Magic UI `Particles` and `OrbitingCircles` under MIT.
- Adoption action: manually vendor and brand the two small components; keep all custom work inside visual tokens, page layout, UI copy, assets, and accessibility.
- Focused verification: app/test typechecks, focused tests, production build, 1440x900 and 1280x720 browser screenshots, image/canvas rendering, reduced-motion behavior, and no desktop overflow.
- Rollback: visual files and generated background only; no database or external state changes.
- Verification: app/test typechecks, 17 contract tests, production build, clean desktop browser console, 1440x900 and 1280x720 screenshots, nonblank Canvas pixels, reduced-motion behavior, and zero horizontal overflow.
- Residual QA: authenticated `/downloads` and `/figures` screenshots were not taken because no user credentials were used; both routes passed source, type, and production-build verification.

## Completed Task

### T9

- Purpose: make direct paper retrieval the primary action while preserving the existing AI research assistant as a separate route.
- Exact work: add a direct academic search API over `searchAcademicPapers`, add `/scholar?q=...` and root search UI, render provider-aware paper results with existing paid PDF delivery, and expose `/assistant` for the existing AI chat.
- Allowed read/write: `app/(search)/page.tsx`, new `app/scholar/page.tsx`, new `app/assistant/page.tsx`, new `app/api/papers/search/route.ts`, `app/new/page.tsx`, new `components/scholar-search-page.tsx`, `components/sidebar-layout.tsx`, `components/app-sidebar.tsx`, `app/globals.css`, `lib/academic/**`, `components/paper-download-button.tsx`, and `WORK_STATE.md`.
- Non-goals: changing provider adapters, database schema, balance/debit logic, paid delivery state machine, figure generation, mobile redesign, or copying Dotaindex visual styling.
- Reuse source: existing `searchAcademicPapers` aggregator plus the existing Dotaindex/673 provider adapters; Dotaindex Scholar is reference-only for query URL and result workflow.
- Adoption action: integrate the existing provider layer through a thin route and UX wrapper; keep AI chat available at `/assistant`.
- Custom-code boundary: URL state, fetch states, result cards, source metadata, and route composition only.
- Acceptance: entering a query from `/` or `/scholar` updates `q`, directly calls the academic API, shows merged results/provider statuses, preserves one-yuan PDF controls, and links to `/assistant` without making AI the default search executor.
- Focused verification: app/test typechecks, focused academic tests, production build, direct API probe with a mocked or configured provider boundary, 1280x720 and 1440x900 screenshots, query URL round-trip, zero horizontal overflow, and no console errors on the clean direct-search page.
- Dependencies: existing provider environment configuration; no new package.
- Rollback: remove the new search route/component and restore the root `ChatInterface` composition; no database or external state changes.
- Verification: direct API query returned HTTP 200 with merged provider results; empty query returned HTTP 400; `/scholar?q=泊车` rendered 30 result cards with zero horizontal overflow; `/assistant` loaded with zero page errors; app/test typechecks, 17 tests, and production build passed.

## Active Task

### T7B

- Production deployment remains paused pending the previously recorded domain and R2 configuration.

## File Access Requests

Not applicable in `state-main` mode.

## Transition Log

- 2026-08-18: plan accepted; `T1` moved `pending -> ready -> implementing`.
- 2026-08-18: `T1` verified at pinned commit; typecheck and production build passed. Upstream ESLint 10 config mismatch recorded.
- 2026-08-18: `T2` moved `pending -> ready -> implementing`.
- 2026-08-18: `T2` verified with four contract tests, app/test typechecks, production build, and live 200/401 Sub2API boundary probes.
- 2026-08-18: `T3` moved `pending -> ready -> implementing`.
- 2026-08-18: `T3` verified with normalization/partial-failure tests, four healthy live provider probes, typechecks, and production build.
- 2026-08-18: `T4` moved `pending -> ready -> implementing`.
- 2026-08-18: `T4` verified with feature-flag and JSON mapping tests; Dotaindex direct backend constraint and 673 proxy requirement remain isolated.
- 2026-08-18: user priority moved visual/resource redesign ahead of `T5` and `T6`; `T7A` moved `pending -> ready -> implementing`.
- 2026-08-18: `T7A` verified with generated-asset inspection, 1440x900 and 1280x720 Playwright screenshots, typecheck, ten focused tests, and production build; `T5` moved `pending -> ready -> implementing`.
- 2026-08-18: `T5` verified with 15 focused tests, app/test typechecks, production build, anonymous authorization probe, and a scoped additive migration; `T6` moved `pending -> ready -> implementing`.
- 2026-08-18: `T6` verified with the my-image-sci configuration/dry-run, stable scene-ID tests, 17 total focused tests, app/test typechecks, anonymous authorization probes, scoped migration, and production build; `T7B` is awaiting production domain and R2 configuration.
- 2026-08-18: user invoked `$work` for the confirmed GitHub-backed redesign; `T7B` paused without deployment changes and `T8` moved `pending -> ready -> implementing`.
- 2026-08-18: `$my-image` generated and visually validated two original 2048x1152 astronomical-observatory backgrounds; the selected asset is `public/visuals/shitou-astral-observatory.png`.
- 2026-08-18: `T8` moved `implementing -> main_verify -> done` after desktop visual QA, Canvas/reduced-motion fixes, 17 passing tests, app/test typechecks, and a successful production build; `T7B` remains paused.
- 2026-08-18: user invoked `$work` for the Dotaindex-style direct scholarly search; `T9` moved `pending -> ready -> implementing`, while `T7B` remains paused.
- 2026-08-18: `T9` moved `implementing -> main_verify -> done` after direct API probes, URL/result browser QA, `/assistant` compatibility checks, 17 passing tests, app/test typechecks, and a successful production build.
- 2026-08-19: `T10` added a configurable `/api/academic/90tsg` redirect and a Scholar navigation entry; typecheck, production build, and HTTP 307 verification passed. The authenticated browser session remains browser-local.
- 2026-08-19: `T11` replaced the automatic-driving figure defaults with generic research presets and exposed individual figure assets alongside the editable ZIP; typecheck and production build passed. Bun-based focused tests remain unavailable because Bun is not installed on this workstation.
- 2026-08-19: `T12` added authenticated `/api/figures/prompt`; the language model now turns a short research idea into a title, no-text background prompt, and three editable nodes before image generation. Typecheck and production build passed.
- 2026-08-19: `T13` SSH login to `.189` succeeded and port `18083` was free. The host has Sub2API configuration but no application environment or R2/my-image deployment configuration; no remote files or services were changed.
