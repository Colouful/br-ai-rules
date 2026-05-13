# Changelog

## 0.3.0-beta.1

### Added

- Local team source support via `config.sources` with `{type: "local", path}`.
- `br-rules init --source <path> --asset <ids>` to load team shared rules.
- `br-rules source list` to list configured sources.
- `br-rules asset list` to list built-in and source assets.
- `generated.json` now includes `sources[]` snapshot and source origin markers for assets/rules.
- `examples/team-source` directory with example team rule source.
- 3-tier rule merge: built-in → source → project custom.
- Duplicate ID detection across all tiers.
- Source manifest validation (`br-rules.source.json`).

### Changed

- `br-rules --version` now reads from `package.json` via build-time injection.
- `generated.json` version now reads from `package.json` via build-time injection.

## 0.2.2-beta.1

### Fixed

- `init` now generates config with version from `package.json` instead of hardcoded `0.2.0`.
- `sync` warns when custom rules still contain TODO placeholder content.

### Added

- Unit test: config version matches package.json version.
- Unit test: custom rule TODO placeholder detection.

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
