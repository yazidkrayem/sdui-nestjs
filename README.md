# sdui-nestjs

A NestJS module for **server-driven UI**: your backend owns a JSON "descriptor" for each app
screen, and mobile/web clients render it instead of hardcoding layouts. Ship a new screen or
tweak an existing one by publishing new JSON — no app store release required.

This package gives you the full authoring + serving backend for that: screen CRUD with
draft/publish/version history, per-app navigation config, localized strings, preview tokens (so
a designer can test an unpublished screen on a real device), multi-tenant `App` scoping (one
deployment can serve several apps, each with their own screens/strings/nav), an optional push
notification helper, and a Socket.IO gateway that tells connected clients "a new version was
published, go refetch."

It does **not** include a renderer — you still need frontend/mobile code that turns the JSON
descriptor into actual UI widgets. See [What this package does not include](#what-this-package-does-not-include).

## Is this for you?

You want this if you're building a NestJS backend and you want app screens to be editable from a
CMS-style admin panel without redeploying the mobile app. You don't want this if you just need a
CMS for marketing content (use a headless CMS instead) — this is specifically for driving native
app *screen structure*, not blog posts.

## Requirements

- **NestJS 11**, running on **Express** (not Fastify — a few endpoints set `ETag`/`Cache-Control`
  headers via `@Res()` typed against `express.Response`).
- **PostgreSQL**, via **TypeORM 0.3.x**. Migrations use `jsonb` columns, Postgres check
  constraints, and `uuid_generate_v4()` (needs the `uuid-ossp` extension enabled on your database).
  Other TypeORM drivers (MySQL, SQLite, ...) are untested and unsupported.
- **Zod 4** for the descriptor schema.

## Install

```bash
npm install sdui-nestjs
```

### Run the migrations

There's no CLI yet (see [docs/design.md §5](docs/design.md) for that plan), so for now: copy the
migration files into your own project's migrations folder.

```bash
cp node_modules/sdui-nestjs/dist/migrations/*.js src/database/migrations/
```

Then run them the normal way your project runs TypeORM migrations (e.g. `typeorm migration:run`).
If you'd rather generate your own schema, `SDUI_MIGRATIONS` (exported from the package) is the
same ordered array of `MigrationInterface` classes, in case you want to inspect them or run them
programmatically instead of copying files.

### Wire the module in

```ts
import { Module } from '@nestjs/common';
import { SduiModule } from 'sdui-nestjs';

@Module({
  imports: [
    SduiModule.forRoot({
      // All four options below are optional — see "Configuring the four ports".
      authGuard: { useClass: MyAppAuthGuard },
      cache: { useClass: MyRedisCacheAdapter },
      audit: { useClass: MyAuditLogAdapter },
      deepLinkBaseUrl: 'https://app.example.com',
    }),
  ],
})
export class AppModule {}
```

That's it — `SduiModule` registers its own entities (via `autoLoadEntities: true` on your
`TypeOrmModule`, or by importing them into your own entities list) and exposes the full REST API
(admin routes under `/admin/sdui/*`, public routes under `/sdui/*`) plus the `/sdui-config`
Socket.IO namespace.

## Configuring the four ports

SDUI doesn't hardcode an auth system, a cache, or an audit log — it depends on four small
interfaces ("ports"), each independently configurable. **If you skip a port, a safe default is
used** so you can get the module running before wiring up the real thing.

| Option | What it's for | If you don't supply it |
|---|---|---|
| `authGuard` | A `CanActivate` that authenticates the request and attaches `request.sduiActor: SduiActor`. | An allow-all guard is used — it **logs a warning on every use** and treats every request as a super-admin. Fine for local dev, never use it once real users exist. |
| `cache` | Implements `SduiCachePort`: `get/set/del/incr/keys/isHealthy`. Backs manifest/nav/strings caching and preview-token storage. | An in-process `Map`. Works for a single instance; every call site already falls back to Postgres on a cache miss, so this is safe, just not shared across multiple app instances. |
| `audit` | Implements `SduiAuditPort`: `record(actorId, action, targetId?, targetType?, meta?)`. Called on every create/update/publish/delete. | No-op — nothing is recorded. |
| `deepLinkBaseUrl` | A plain string, your app's public domain (e.g. `https://app.example.com`). Used to build the `universalUrl` returned by `GET /sdui/link/:slug`. | Omitted from responses — you still get `appScheme`, just no universal link. |

Each of `authGuard` / `cache` / `audit` accepts the same option shape NestJS itself uses for
async module config — supply exactly one of:

```ts
{ useClass: MyImplementation }
{ useValue: someInstance }
{ useFactory: (dep1, dep2) => new MyImplementation(dep1, dep2), inject: [Dep1, Dep2] }
```

### Example: a real Redis cache adapter

```ts
import { Injectable } from '@nestjs/common';
import type { SduiCachePort } from 'sdui-nestjs';
import Redis from 'ioredis';

@Injectable()
export class MyRedisCacheAdapter implements SduiCachePort {
  private readonly redis = new Redis(process.env.REDIS_URL);

  get(key: string) {
    return this.redis.get(key);
  }
  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) await this.redis.set(key, value, 'EX', ttlSeconds);
    else await this.redis.set(key, value);
  }
  async del(...keys: string[]) {
    if (keys.length) await this.redis.del(...keys);
  }
  incr(key: string) {
    return this.redis.incr(key);
  }
  keys(pattern: string) {
    return this.redis.keys(pattern);
  }
  async isHealthy() {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }
}
```

### Actor identity, on purpose, isn't your `User`/`Admin` model

`SduiActor` is just `{ actorId: string; permissions?: string[]; bypassPermissionChecks?: boolean }`.
The columns that record who did what (`createdBy`, `publishedBy`, `savedBy`, `updatedBy`,
`deletedBy`) are plain `uuid`/`string` columns with **no foreign key** to any entity SDUI defines
— so it never needs to know what your admin/user table looks like. Your `authGuard` is
responsible for populating `actorId` (and `permissions`, checked by `RequireSduiPermission()` on
admin routes) however makes sense for your app.

## Push notifications (optional, separate module)

Push isn't part of the core module — sending a push notification needs a provider (Firebase,
APNs, ...) and a way to look up device tokens, both of which are entirely specific to your app.
Import `SduiPushModule` only if you want `POST /admin/sdui/push` to exist:

```ts
import { Module } from '@nestjs/common';
import { SduiPushModule } from 'sdui-nestjs';

@Module({
  imports: [
    SduiPushModule.forRoot({
      push: { useClass: MyFirebasePushAdapter },        // implements SduiPushPort
      deviceTokens: { useClass: MyDeviceTokenAdapter },  // implements SduiDeviceTokenPort
    }),
  ],
})
export class AppModule {}
```

`SduiPushPort.sendToTokens(tokens, title, body, data)` sends the notification and reports back any
tokens the provider rejected as invalid; `SduiDeviceTokenPort` looks up tokens for a target
audience and lets SDUI ask you to invalidate the ones that bounced. If you don't import
`SduiPushModule` at all, the route simply doesn't exist — no Firebase dependency is pulled in.

## What this package does not include

- **A renderer.** The Zod descriptor schema (`descriptor.schema.ts`) and component registry
  (`component-registry.ts`) exported from this package are the source of truth for what a valid
  screen looks like, but turning that JSON into actual UI (a web preview, a Flutter/React Native
  renderer, whatever your client is) is your app's job. Keeping a hand-written renderer in sync
  with this schema as you add components is a real, ongoing maintenance cost — budget for it.
- **Postgres migration portability.** See [Requirements](#requirements) — this is a Postgres-only
  package today, deliberately, not an oversight (see [docs/design.md §4](docs/design.md)).
- **A scaffolding CLI.** Wiring this into a fresh project today means the manual steps above.
  See [docs/design.md §5](docs/design.md) for the plan to fix that.

## More background

[docs/design.md](docs/design.md) has the fuller design rationale — why each port is shaped the
way it is, why push is a separate module, why Postgres-only, and what a scaffolding CLI would
look like if someone builds one.

## License

UNLICENSED (private/internal use). See `package.json`.
