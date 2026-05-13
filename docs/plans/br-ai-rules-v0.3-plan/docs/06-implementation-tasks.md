# V0.3 Implementation Tasks

## P0.3.1 Write V0.3 PRD

Already covered by this plan.

Expected files in repo:

- `docs/v0.3/prd.md`
- `docs/v0.3/source-architecture.md`

## P0.3.2 Add Source Schema and Local Source Loader

Add:

```text
src/core/source.ts
```

Responsibilities:

- parse `sources` config
- resolve local source path
- load `br-rules.source.json`
- load source assets
- load source rules
- validate ids and references
- return normalized source bundle

Suggested types:

```ts
type SourceConfig = {
  type: "local";
  path: string;
};

type SourceManifest = {
  name: string;
  version: string;
  description?: string;
  assets?: string[];
};

type LoadedSource = {
  config: SourceConfig;
  manifest: SourceManifest;
  resolvedPath: string;
  assets: Asset[];
  rules: Rule[];
};
```

## P0.3.3 Support Team Source Directory Structure

Expected:

```text
source/
  br-rules.source.json
  assets/*.yaml
  rules/*.yaml
```

Validation:

- missing manifest fails
- invalid asset fails
- invalid rule fails
- asset references missing rule fails

## P0.3.4 Merge Built-in Assets + Source Assets + Project Custom Rules

Existing asset loader should be extended.

Recommended flow:

```text
load built-in assets/rules
load local sources assets/rules
load project custom rules
validate duplicates
expand assets.include
apply assets.exclude
append custom rules
render
```

## P0.3.5 Support init --source --asset

Update init command options:

```bash
br-rules init --source ../team-ai-rules --asset team.backend-standard
```

Rules:

- `--source` adds config.sources
- `--asset` appends asset ids to assets.include
- stack assets are still included
- asset ids are validated before sync

## P0.3.6 Add br-rules source list

Add command:

```bash
br-rules source list
```

Implementation:

- read config
- load sources
- print source summary
- no source = friendly message

## P0.3.7 Add br-rules asset list

Add command:

```bash
br-rules asset list
```

Implementation:

- reuse `list --assets` internals
- include built-in and source assets
- show enabled marker

## P0.3.8 Extend generated.json With Source Snapshots

Update snapshot writer to include:

- sources[]
- source assets
- source rules

## P0.3.9 Enhance Diff For Source Asset Changes

At minimum, current generated target diff must reflect source changes.

Optional text summary:

```text
Source asset changes:

+ team.no-raw-exception
~ team.api-language
```

## P0.3.10 Add examples/team-source

Add:

```text
examples/team-source/
  br-rules.source.json
  assets/team.backend-standard.yaml
  assets/team.frontend-standard.yaml
  rules/team.no-raw-exception.yaml
  rules/team.api-language.yaml
  rules/team.auth-change-check.yaml
  rules/team.no-auto-dependency.yaml
```

## P0.3.11 Full Regression Test

Must cover:

- V0.2 default init
- V0.2 stack init
- V0.2 custom rules
- V0.3 local source init
- source list
- asset list
- generated source snapshot
- diff after source rule change
- check failure when source rule missing
