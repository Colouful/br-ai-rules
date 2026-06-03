# Changelog

## 0.4.0

### Changed

- 正式发布 stable `0.4.0`（与 `0.4.0-beta.1` 功能一致），npm `latest` 指向本版本。

## 0.4.0-beta.1

### Added

- `br-rules source init`：在目录中生成 `br-rules.source.json`、`assets/team.starter-pack.yaml`、`rules/team.code-review-required.yaml`（默认轻量 starter-pack，非 frontend/backend 双资产模板）。
- `br-rules source check [path]`：校验 manifest、YAML、资产引用的规则是否存在、重复 ID、占位符与 manifest 列表一致性。
- `br-rules doctor`：检查配置可读性、来源可审计、规则合并、生成目标文件是否存在、托管块是否与当前配置同步、`.ai-rules/generated.json` 是否存在。

### Changed

- 发布版本号对齐 V0.4 beta；README 补充 V0.4 Quick Start 与本地源说明。
- 文档与示例：`docs/使用指南和设计/`、`examples/generated-project`、历史计划中的示例 JSON 版本号对齐 `0.4.0-beta.1`；使用指南与本地说明文档明确 **`source init` 默认 `team.starter-pack`**，多资产 `team-source` 标为扩展示例。
- `package.json`：`npm pkg fix` 将 `bin.br-rules` 规范为 `dist/cli.js`（消除 publish 时 bin 名清洗告警）。

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
