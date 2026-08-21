# Work State

## Status

`complete`

## Current Task

Deploy the built-in SCI figure prompt changes to GitHub and `.189:18083`, then verify the Linux container and public route. Completed on 2026-08-21.

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
| T7 | Brand, redesign, and deploy | done | Initial Swiss research UI is verified and deployed. |
| T8 | 石头学术 astronomical visual redesign | done | Original generated background, adopted Magic UI effects, unified desktop pages, and focused browser QA. |
| T9 | Direct scholarly search experience | done | Dotaindex-style `q` URL search, direct mixed provider results, and AI as a secondary assistant. |
| T10 | 90tsg English database entry | done | Configurable same-origin redirect to the verified English database entry; no credentials or cookies persisted. |
| T11 | Generic scientific figure workflow | done | Generic presets, prompt copy, and individual PNG/SVG/JSON/ZIP downloads over the existing my-image-sci pipeline. |
| T12 | AI-assisted scientific figure workflow | done | Authenticated prompt-polish API plus a two-step UI from short research idea to editable figure bundle. |
| T13 | Deploy figure workflow to .189:18083 | done | The verified image is deployed on `.189:18083` with the existing Sub2API environment and data-disk storage. |
| T14 | Stabilize figure authentication and Linux deployment | done | Login redirects directly to `/figures`; the page does not load the legacy AI/chat action graph; Linux-native dependencies and my-image-sci scripts are present; existing services remain healthy. |
| T15 | Deploy built-in SCI figure prompt | done | The fixed SCI style prompt is committed, pushed, rebuilt in a Linux container, and verified on `.189:18083`. |

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

## Completed Task

### T14

- Purpose: repair the confirmed production failure after login and make the existing scientific-figure workflow runnable on `.189`.
- Exact work: decouple `/figures` from the legacy chat sidebar, keep authentication on the same Sub2API session contract, refresh expired access sessions through the auth endpoint, package the existing `my-image-sci` scripts into the runtime, and rebuild once on matching Linux/Alpine.
- Allowed read/write: `app/figures/page.tsx`, `app/api/auth/[...all]/route.ts`, `lib/auth.ts`, `proxy.ts`, `env/server.ts`, `env/client.ts`, `next.config.ts`, `Dockerfile`, `.dockerignore`, `deploy/shitou-academic-figures.service`, deployment/release files required for `.189`, focused tests, and `WORK_STATE.md`.
- Non-goals: changing Sub2API, balances, paper search/delivery, gift-chat, Cloudflare routing, database schemas, or rebuilding the my-image-sci generation logic.
- Reuse source: existing Sub2API adapter and existing `my-image-sci` scripts.
- Adoption action: integrate them through a lightweight figure shell, session adapter, and runtime mount; preserve the skill's PNG/scene JSON/SVG/preview/ZIP output contract.
- Custom-code boundary: auth glue, figure-page composition, deployment configuration, and focused tests only.
- Acceptance: `/sign-in?redirect=/figures` establishes a cookie and lands on `/figures`; `/figures` renders without loading Baseten/chat server actions; Linux runtime resolves `sharp`; configured my-image-sci scripts exist inside the container; current production services remain healthy.
- Focused verification: app/test typechecks, focused auth/figure tests, dependency graph inspection, Linux module/script probes, unauthenticated redirect/API checks, authenticated flow where credentials are available, service/log/resource checks, and release rollback preservation.
- Dependencies: existing `.128` PostgreSQL, local `.189` Sub2API, user-provided image API credentials at request time, and existing data-disk mount.
- Rollback: restore the previous `/opt/shitou-academic/current` symlink and service unit; no database or persistent-user-data rollback required.

## Completed Task

### T15

- Purpose: deploy the fixed SCI figure background prompt without changing the existing account, balance, image-provider, or SVG contracts.
- Exact work: commit the current scientific-figure prompt, provider configuration, shared-balance, Linux runtime, and focused-test changes; push `graduate-workflow` to GitHub; build and restart `shitou-academic-figures` on `.189:18083` from the pushed source.
- Allowed read/write: the current repository working tree, GitHub branch `graduate-workflow`, `/opt/shitou-academic` deployment files required by the existing service, and `WORK_STATE.md`.
- Non-goals: database migrations, balance changes, Sub2API changes, Cloudflare routing, gift-chat, or Windows-only deployment artifacts.
- Acceptance: GitHub contains the deployment commit; the Linux image builds without Windows native modules; the service remains active on `.189:18083`; `/figures` redirects anonymously; `/api/figures/prompt` remains protected; the fixed SCI prompt is present in the deployed image.
- Focused verification: local typechecks/build, GitHub push confirmation, remote image digest and service status, direct HTTP route probes, and container log/resource checks.
- Rollback: restore the previous `shitou-academic:production` image and restart `shitou-academic-figures`; no database or persistent-user-data rollback required.
- Verification: commits `064af1d` and `2eea34d` are pushed to `origin/graduate-workflow`; Linux image `shitou-academic:20260821-sci-prompt-2eea34d` built as `ac781b6c3560`; candidate `sharp`, `my-image-sci`, `307` figure redirect, and `401` prompt authorization checks passed; production is active on `.189:18083`.

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
- 2026-08-20: user resumed deployment repair; production logs proved Windows-native optional dependencies were shipped into Linux/Alpine, `/figures` loaded the legacy chat action graph and Baseten provider, and the configured my-image-sci directory was absent inside the container. `T14` moved `pending -> ready -> implementing`.
- 2026-08-21: Linux/Alpine image `a5fa0f2d4371` built successfully with resource limits and build-only provider placeholders. Candidate checks proved `sharp`, the `my-image-sci` mount, storage writes, unauthenticated redirects, and API authorization behavior.
- 2026-08-21: production switched to `shitou-academic:production` on `.189:18083`; public `/figures` returns `307` to `/sign-in?redirect=%2Ffigures`, Sub2API and gift-chat remained active, and target logs contained no native-module or OOM errors. `T7`, `T13`, and `T14` moved to `done`; work status moved to `complete`.
- 2026-08-21: `T15` commit `064af1d` replaced invalid build URL placeholders; the first Linux candidate exposed CRLF reintroduced by Windows `core.autocrlf` during `git archive`.
- 2026-08-21: `T15` commit `2eea34d` added `.gitattributes` LF rules for deployment files; the release was generated with `git -c core.autocrlf=false archive`, uploaded to `/opt/shitou-academic/builds/20260821-sci-prompt-2eea34d`, and matched local SHA-256 `8718ee628979b09e30d1333e383a5a8a70391858ca8aa8380ce0063b24299391`.
- 2026-08-21: production now runs image `sha256:ac781b6c3560ce2cb952eab520800783867527599dc7426f934c25ac94996412`; rollback image `sha256:5b16e364d3f12919cc5eb95af7fd6c5aae92839a9d979c4abb86a496fdcf81a4` is tagged `shitou-academic:rollback-20260821-5b16e364`. `shitou-academic-figures`, Sub2API, and gift-chat remain active; production route probes passed.
