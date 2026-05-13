# V0.3 Test Plan

## Unit Tests

### source loader

- loads valid local source
- fails when source directory missing
- fails when manifest missing
- fails when manifest invalid
- loads assets and rules
- fails when asset references missing rule
- fails on duplicate source rule ids
- fails on duplicate source asset ids

### config

- config without sources still works
- config with local source validates
- init --source writes config.sources
- init --asset writes assets.include

### generated snapshot

- generated.json includes sources[]
- generated.json records source asset
- generated.json records source rule

## CLI Smoke Tests

### Default regression

```bash
br-rules init --stack vue,typescript
br-rules check
br-rules list --assets
```

### Local source init

```bash
br-rules init --stack spring-boot,java,mysql,redis --source ../team-source --asset team.backend-standard
br-rules check
br-rules source list
br-rules asset list
```

Expected generated content includes:

- team.backend-standard
- team.no-raw-exception
- team.auth-change-check
- team.api-language

### Source diff

1. init with local source
2. change source rule content
3. run `br-rules diff`
4. expect target file diff

### Broken source

1. create asset referencing missing rule
2. run `br-rules check`
3. expect clear error

## Acceptance

- all tests pass
- V0.2 behavior does not regress
- local source works end-to-end
- source snapshots exist
- examples/team-source works
