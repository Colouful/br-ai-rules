# Changelog

## 0.2.1-beta.1

### Added

- File-based built-in assets under `src/built-in/assets/*.yaml`.
- File-based built-in rules under `src/built-in/rules/*.yaml`.
- Built-in YAML loader for assets and rules.
- Build output now includes `dist/built-in`.
- Stack-based asset selection with `--stack`.
- Custom rule auto discovery from `.ai-rules/rules/*.yaml`.
- Default asset layers: base, language, framework, middleware, practice.
- Built-in assets for TypeScript, Java, React, Vue, Spring Boot, MySQL, Redis, Message Queue, testing, dependency control, security, and API contract.

### Fixed

- `sync` now removes generated files for disabled targets.
- Managed block sync remains idempotent and no longer appends extra blank lines.

### Verified

- Full scenario test passed: 21/21.
- Unit tests passed.
- Type check passed.
- Build passed.
