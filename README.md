# sdui-nestjs

Server-driven UI as a portable NestJS module: screens, draft/publish/version history, per-app
navigation config, localized strings, preview tokens, multi-tenant `App` scoping, an optional
push sub-module, and a live-reload Socket.IO gateway.

Extracted from the `portee` backend. See `backend/docs/sdui-extraction-design.md` in that repo
for the design rationale behind the seams below.

## Requirements

- **PostgreSQL only.** Migrations use `jsonb`, Postgres check constraints, and
  `uuid_generate_v4()` (requires the `uuid-ossp` extension). Other TypeORM drivers are
  untested and unsupported.
- **Express**, not Fastify — a few endpoints (`@Res()` handlers for ETag/ Cache-Control headers)
  are typed against `express.Request`/`Response`.
- NestJS 11, TypeORM 0.3.x, Zod 4.

## Install

```bash
npm install sdui-nestjs
```

Then copy the migration set into your own migrations folder (there is no scaffolding CLI yet —
see `backend/docs/sdui-extraction-design.md` §5 for that plan):

```ts
import { SDUI_MIGRATIONS } from 'sdui-nestjs';
// SDUI_MIGRATIONS is an ordered array of MigrationInterface classes.
// Copy the corresponding files from node_modules/sdui-nestjs/dist/migrations
// into your project's migrations directory, or reference them directly in your
// TypeORM CLI data source config's `migrations` glob.
```

## Wiring it in

```ts
import { SduiModule } from 'sdui-nestjs';

@Module({
  imports: [
    SduiModule.forRoot({
      // Omit any of these to fall back to a safe default (see below).
      authGuard: { useClass: MyAppAuthGuard },
      cache: { useClass: MyRedisCacheAdapter },
      audit: { useClass: MyAuditLogAdapter },
      deepLinkBaseUrl: 'https://app.example.com',
    }),
  ],
})
export class AppModule {}
```

## The four seams

SDUI has no hard dependency on any specific auth system, cache, or audit log — it depends on
four small ports, each configurable via `SduiModuleOptions`:

| Option | Port | Default if omitted |
|---|---|---|
| `authGuard` | `CanActivate`, must attach `request.sduiActor: SduiActor` | Allow-all guard — **logs a startup warning**, treats every request as an authenticated actor with `bypassPermissionChecks: true`. Replace before deploying with real admin users. |
| `cache` | `SduiCachePort` (`get`/`set`/`del`/`incr`/`keys`/`isHealthy`) | Process-local in-memory `Map`. Every call site already falls through to Postgres on a cache miss/failure, so this is safe but won't be shared across multiple instances. |
| `audit` | `SduiAuditPort` (`record(actorId, action, targetId?, targetType?, meta?)`) | No-op — entries are discarded. |
| `deepLinkBaseUrl` | plain string | Omitted — `GET /sdui/link/:slug` returns only `appScheme`, no `universalUrl`. |

Each of `authGuard`/`cache`/`audit` accepts the same shape NestJS itself uses for async module
options: `{ useClass }`, `{ useValue }`, or `{ useFactory, inject }`.

Actor identity is a plain `actorId: string` with no foreign key to any host entity — SDUI's
`createdBy`/`publishedBy`/`savedBy`/`updatedBy`/`deletedBy` columns are uuid/string columns by
convention only, so they don't care what your admin/user model looks like.

## Push notifications (optional)

Push is not part of the core module — it needs a Firebase/APNs-style sender and a way to look up
device tokens, both of which are entirely host-specific. Import `SduiPushModule` separately if
you want it:

```ts
import { SduiPushModule } from 'sdui-nestjs';

@Module({
  imports: [
    SduiPushModule.forRoot({
      push: { useClass: MyFirebasePushAdapter },       // implements SduiPushPort
      deviceTokens: { useClass: MyDeviceTokenAdapter }, // implements SduiDeviceTokenPort
    }),
  ],
})
export class AppModule {}
```

If you don't import `SduiPushModule`, `POST /admin/sdui/push` simply doesn't exist.

## What's not included

- The frontend WYSIWYG preview renderer and the mobile production renderer are **not** part of
  this package. The descriptor schema (`descriptor.schema.ts`) and component registry
  (`component-registry.ts`) exported here are the source of truth, but each consuming
  frontend/mobile app is responsible for its own renderer implementation — and for keeping it in
  sync with this schema. See `backend/docs/sdui-assessment.md` in the original `portee` repo for
  the drift risk this creates.
