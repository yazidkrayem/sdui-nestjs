# SDUI Backend Extraction — Design Doc

> Written before this package existed as its own repo, while planning the extraction out of an
> internal app's NestJS backend (referred to below as "the host backend"). Kept here as the
> historical rationale for why the module boundaries and ports (§3) look the way they do.

**Date:** 2026-08-03 · Scope: the SDUI module only. A frontend preview renderer and a mobile production renderer are explicitly out of scope for this doc (see [Open risks](#8-open-risks)) — this package covers the backend contract only.

This is a design doc, not an implementation. It answers: what should the extracted package look like, what has to become pluggable, is multi-DB support realistic, is a CLI worth building, and what are the concrete steps to get there.

---

## 1. Goals & constraints

- **Goal**: reuse today's SDUI backend (screens, versions, publish/rollback, nav config, strings/localization, preview tokens, multi-tenant `App` scoping, push) in a future project without rebuilding it.
- **Target stack is unknown.** The next project may not be NestJS + Postgres + Redis + Keycloak. The design must not hard-require any of these — they become swappable, not assumed.
- **Distribution form**: a versioned library package that a host NestJS app installs and wires in — not a standalone microservice. SDUI stays in-process with the host app, sharing its DB connection and deploy unit.
- **Out of scope**: the frontend-preview-renderer / mobile-renderer contract duplication documented in `backend/docs/sdui-assessment.md` ("one contract, three renderers"). That risk doesn't go away — it's just not this doc's problem to solve. See §8.

## 2. Package contents

The package (`sdui-nestjs`, name TBD) ships:

- **NestJS module** — `SduiModule.forRoot(options: SduiModuleOptions)`, a dynamic module (standard Nest pattern for configurable library modules — same shape as `TypeOrmModule.forRoot()`). `options` is where every seam in §3 gets supplied.
- **Entities** — `SduiScreen`, `SduiScreenVersion`, `SduiErrorReport` (currently misplaced in the host's shared `database/entities/` barrel — these move into the package), plus `App`, `AppStrings`, `SduiNavConfig` (already inside `backend/src/sdui/entities/`, no change needed).
- **Migrations** — the ~9 sdui-prefixed migrations currently interleaved in the host's global migration timeline, extracted into the package's own migration set.
- **Contract** — `descriptor.schema.ts` (Zod), `component-registry.ts`, `screen-templates.ts`. These stay as-is; they're already self-contained.
- **Controllers/services/gateway** — the existing REST surface (admin + public routes) and the `/sdui-config` Socket.IO gateway, unchanged in shape, but with their hard-coded dependencies replaced by the ports below.

## 3. Coupling seams → injectable ports

This is the core design work. Today, four dependencies are imported as concrete classes from the host app. Each becomes an interface + DI token that `forRoot()` accepts, with a safe default shipped in the package so a host with none of these systems can still boot SDUI.

| Seam | Today | Port | Default shipped |
|---|---|---|---|
| **Auth** | `KeycloakAuthGuard` + `PermissionGuard` + `Admin` entity, imported directly into every admin controller | `SduiAuthGuard` — host provides any `CanActivate` under the `SDUI_AUTH_GUARD` token; a `SduiActor` (`{ actorId: string }`) is attached to the request | An allow-all guard (dev/no-auth-yet projects) — **must log a startup warning** so it's never silently used in prod |
| **Cache** | `RedisService` (ioredis subclass), injected into 5 files for manifest/nav/strings caching + preview-token storage | `SduiCachePort` — `get/set/del`, `ttl` semantics under `SDUI_CACHE_PROVIDER` token | In-memory `Map`-based adapter. Low risk: current code already treats cache as best-effort and falls through to Postgres on failure — same contract, just an interface instead of a concrete class |
| **Audit log** | `AuditLogService`, DI'd into apps/nav/strings services + controllers | `SduiAuditPort` — `log(action, actorId, meta)` under `SDUI_AUDIT_PROVIDER` token | No-op logger |
| **Actor identity** | Typed `Admin` entity read via `CurrentAdmin` decorator; `createdBy`/`publishedBy`/`savedBy`/`updatedBy`/`deletedBy` columns | No new port needed — these columns are **already plain `uuid` with no DB-level FK** (confirmed: only real FK in the whole module is `sdui_screen_versions.screen_id → sdui_screens.id`). Just change the TypeScript-level typing from `Admin` to `actorId: string` pulled off `SduiActor` | N/A |
| **Push** | `PushService` (Firebase Admin SDK) provided directly in `SduiModule.providers`; `sdui-push.controller.ts` queries the host's shared `device_tokens` table directly | Make push an **optional sub-module** (`SduiPushModule`), not part of core. Host supplies `SduiPushPort.send(tokens, payload)` and `SduiDeviceTokenPort.listForTarget(...)` under tokens; core `SduiModule` has no Firebase dependency at all | None — if the host doesn't import `SduiPushModule`, the push controller/routes simply aren't registered |

Push is the messiest seam because it reaches into a table (`device_tokens`) the package doesn't own. Splitting it into an optional module is the cleanest fix: most of SDUI (screens, nav, strings, preview) has nothing to do with push, so it shouldn't force a Firebase dependency or a `device_tokens` schema assumption onto every consumer.

## 4. Multi-DB support

**Recommendation: officially support Postgres only.** Reasons:
- Existing migrations already use Postgres-specific features (`jsonb` columns for descriptors, check constraints like `SduiAppIdCheckConstraint`).
- TypeORM's cross-DB abstraction exists but re-validating every migration and column type against MySQL/SQLite would be real, non-trivial work for a requirement nobody has yet.
- Building speculative multi-DB support now contradicts the "don't design for hypothetical future requirements" principle — do it if and when a concrete second-DB consumer shows up, not before.

Document this as a stated constraint of the package (README: "requires PostgreSQL — TypeORM's other drivers are untested and unsupported"), not as a gap to silently discover later.

## 5. CLI — is one worth building?

Two different things could be called "a CLI" here; they have very different cost/value:

- **Scaffolding CLI** (`npx sdui-nestjs init`) — wires the module into a fresh host app: registers `SduiModule.forRoot()` in `AppModule`, copies migrations into the host's migration folder, prints the env vars / port implementations the host still needs to supply. **Recommended** — this is the actual manual, error-prone work every new project would otherwise repeat by hand (exactly the kind of repeated-integration-step case where a thin CLI pays for itself immediately).
- **Content-management CLI** (import/export screens, strings, seed templates) — **not recommended as new work**. This already exists as admin REST endpoints (`GET admin/sdui/strings/export`, `POST .../import`, `GET admin/sdui/templates`, `POST admin/sdui/from-template`) and presumably a frontend admin UI. Building a parallel CLI for the same operations would be a duplicate interface with no clear new user.

## 6. Versioning & distribution

- No monorepo tooling exists today (`backend`/`frontend`/`mobile` are three independent git repos with separate pnpm lockfiles), so a workspace-based package (pnpm workspaces/turborepo/nx) would require restructuring the whole repo layout for a benefit only this one extraction needs. **Recommendation: private git-dependency or private npm registry package**, matching the existing "independent repos" pattern.
- Semver the package; treat added/changed migrations and any `SduiModuleOptions` shape change as a documented breaking-change class in the changelog, since consumers will be on different versions over time.
- **Migrations**: ship them inside the package, but have the scaffolding CLI **copy** them into the host's own migration folder at install time (rather than pointing TypeORM's migration runner cross-package at `node_modules/...`). Copying is the simpler mental model — the host's migration history stays self-contained and ordinary `pnpm typeorm migration:run` keeps working with no path surgery.

## 7. Step-by-step extraction plan (future work, not part of this doc)

1. **In-place seam introduction** — inside the current `backend` repo, introduce the port interfaces from §3 and swap the concrete `KeycloakAuthGuard`/`RedisService`/`AuditLogService`/`PushService` dependencies for injected tokens, with the current concrete classes becoming the "default" implementations wired up in this repo's own `AppModule`. Verify the existing app still behaves identically — this de-risks the extraction before any code moves.
2. **Move code** — relocate `backend/src/sdui/`, `backend/src/modules/sdui/`, plus the 3 entities currently in the shared `database/entities/` barrel and their migrations, into a new package directory/repo.
3. **Add the `forRoot()` entry point** and the default in-memory/no-op/allow-all adapters from §3.
4. **Publish v0.1.0** to the chosen private registry.
5. **Dog-food it** — re-wire this backend repo to consume the published package instead of its in-tree module. This is the real proof the extraction works, before a second project ever depends on it.
6. **Optional**: build the scaffolding CLI from §5 once the package itself has stabilized.

## 8. Open risks

- **Frontend/mobile contract duplication is unresolved and out of scope here.** `backend/docs/sdui-assessment.md` already documents that the descriptor contract is hand-implemented three times (backend Zod schema, frontend preview `RENDERERS` map, mobile `widget_registry.dart`) with only a script (`pnpm check:sdui`) holding them in sync across three separate repos. Extracting the backend alone formalizes one leg of that contract; the other two legs still need to be rebuilt per-project and will drift again unless addressed separately later.
- **Push/device-tokens needs an explicit decision**, not just a design — specifically, whether the next project even wants SDUI-driven push at all, since it's the one seam that reaches outside SDUI's own tables.
- **Actor-id columns are convention-only** (no FK enforcing they point at a real admin/user). This is fine for a decoupled package — it's actually why extraction is easier — but is worth a one-line callout in the package README so a future maintainer doesn't assume referential integrity exists where it doesn't.
