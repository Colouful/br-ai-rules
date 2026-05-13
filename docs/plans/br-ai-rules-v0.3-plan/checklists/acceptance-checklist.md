# V0.3 Acceptance Checklist

## Source Loader

- [ ] Can load local source
- [ ] Fails when source path does not exist
- [ ] Fails when `br-rules.source.json` missing
- [ ] Fails when asset references missing rule
- [ ] Rejects duplicate asset IDs
- [ ] Rejects duplicate rule IDs
- [ ] Supports relative source path from project root

## Config

- [ ] Existing V0.2 config still works
- [ ] `sources` is optional
- [ ] `sources[].type = local`
- [ ] `sources[].path` is required
- [ ] `init --source` writes config.sources
- [ ] `init --asset` appends to assets.include

## Commands

- [ ] `br-rules init --source --asset` works
- [ ] `br-rules source list` works
- [ ] `br-rules asset list` works
- [ ] `br-rules list --assets` still works
- [ ] `br-rules check` validates source assets
- [ ] `br-rules diff` reflects source changes
- [ ] `br-rules sync` renders source rules

## Generated Files

- [ ] AGENTS.md includes source rules
- [ ] CLAUDE.md includes source rules
- [ ] Cursor rules include source rules
- [ ] generated.json includes sources[]
- [ ] generated.json includes source asset snapshots
- [ ] generated.json includes source rule snapshots

## Examples

- [ ] examples/team-source exists
- [ ] examples/team-source has manifest
- [ ] examples/team-source has frontend asset
- [ ] examples/team-source has backend asset
- [ ] examples/team-source has at least 4 team rules

## Regression

- [ ] Default init works
- [ ] Vue + TypeScript init works
- [ ] Spring Boot + Java + MySQL + Redis init works
- [ ] Project custom rules still work
- [ ] TODO warning still works
- [ ] Target cleanup still works
- [ ] Managed block idempotency still works

## Quality

- [ ] npm run typecheck passes
- [ ] npm test passes
- [ ] npm run build passes
- [ ] dist/built-in copied
- [ ] CLI smoke test passes
