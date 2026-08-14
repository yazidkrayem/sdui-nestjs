# Contributing

Thanks for considering a contribution to `sdui-nestjs`.

## Setup

```bash
npm install
```

## Build

```bash
npm run build
```

Compiles `src/` to `dist/` via `tsc -p tsconfig.build.json`.

## Test

```bash
npm test
```

Runs the Jest suite (`ts-jest`). Note: the test suite is a **baseline**, not full coverage — it
covers the default adapters (`SduiInMemoryCacheAdapter`, `SduiAllowAllGuard`), the descriptor
schema, the component registry, and the pure/non-DB methods of `SduiService`. The two heavier
services (`SduiAppsService`, `SduiService`'s repository-backed methods) and the controllers don't
have tests yet — contributions there are especially welcome.

## Lint

```bash
npm run lint
```

Runs ESLint with `--fix` over `src/**/*.ts`.

## Pull requests

- Keep changes scoped — a bug fix shouldn't carry unrelated refactors.
- Add or update tests for behavior you change.
- Update `CHANGELOG.md` under `[Unreleased]`.
- `npm run build`, `npm run lint`, and `npm test` should all pass before you open a PR (CI will
  also check this).

## Reporting bugs / requesting features

Open a GitHub issue. For security issues, see [SECURITY.md](SECURITY.md) instead — please don't
open a public issue for those.
