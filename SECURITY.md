# Security Policy

`sdui-nestjs` ships an auth-guard/permission system (`SduiAuthGuard`, `RequireSduiPermission`,
the default allow-all guard) and admin REST endpoints, so security issues here can matter more
than a typical bug.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities. Instead, report them
privately by emailing **yazid.krayem@gmail.com** with:

- A description of the vulnerability and its potential impact.
- Steps to reproduce (a minimal repro, if possible).
- The package version affected.

You should get an acknowledgement within a few days. Once a fix is available, we'll coordinate on
disclosure timing and credit you (if you'd like) in the release notes.

## Supported versions

Only the latest published version on npm receives security fixes.
