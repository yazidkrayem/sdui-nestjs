# Changelog

All notable changes to this package are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed

- Fixed a license inconsistency: the README previously said "UNLICENSED (private/internal use)"
  while `package.json`/`LICENSE` say MIT. The README now matches — this package is MIT licensed.
- Replaced a hardcoded `assets.portee.app` placeholder image URL in the built-in screen templates
  with a generic placeholder host, so the package has no runtime dependency on portee's infra.
- Fixed `package.json` `repository`/`bugs`/`homepage` to point at the public GitHub repo instead of
  a private GitLab project; added missing `author` and `engines` fields.

### Added

- CI (GitHub Actions): build, lint, and test run on every push/PR.
- A baseline Jest test suite covering the default adapters, descriptor schema validation, the
  component registry, and the pure/non-DB methods of `SduiService`.
- `CONTRIBUTING.md` and `SECURITY.md`.

## [0.1.2]

Bug fixes to the REST API surface.

## [0.1.1]

Incremental fixes following the initial extraction.

## [0.1.0]

Initial extraction of the SDUI module (screens, versions, publish/rollback, nav config,
localization, preview tokens, multi-tenant `App` scoping, optional push notifications) into a
standalone, portable NestJS package.
