# V0.3 generated.json Source Snapshot

## Goal

`generated.json` should record enough information to understand:

- which sources were used
- which source assets were included
- which source rules were rendered
- what checksums were generated

## Example

```json
{
  "version": "0.4.0-beta.1",
  "generatedAt": "2026-05-13T00:00:00.000Z",
  "language": "zh-CN",
  "sources": [
    {
      "type": "local",
      "path": "../team-ai-rules",
      "name": "team-ai-rules",
      "version": "0.1.0",
      "checksum": "sha256..."
    }
  ],
  "assets": [
    {
      "id": "base.behavior-basic",
      "source": "built-in",
      "version": "0.2.2-beta.1",
      "checksum": "sha256..."
    },
    {
      "id": "team.backend-standard",
      "source": "local:../team-ai-rules",
      "version": "0.1.0",
      "checksum": "sha256..."
    }
  ],
  "rules": [
    {
      "id": "team.no-raw-exception",
      "source": "local:../team-ai-rules",
      "path": "../team-ai-rules/rules/team.no-raw-exception.yaml",
      "checksum": "sha256..."
    }
  ],
  "targets": {
    "generic": {
      "file": "AGENTS.md",
      "checksum": "sha256..."
    },
    "claude": {
      "file": "CLAUDE.md",
      "checksum": "sha256..."
    },
    "cursor": {
      "file": ".cursor/rules/ai-coding.mdc",
      "checksum": "sha256..."
    }
  }
}
```

## Checksum Rules

Recommended:

- source checksum: hash manifest + asset file hashes + rule file hashes
- asset checksum: hash normalized asset YAML or parsed JSON
- rule checksum: hash normalized rule YAML or content
- target checksum: hash managed block generated content

## Backward Compatibility

If no sources are configured:

```json
"sources": []
```

## Diff Use

`br-rules diff` should be able to detect:

- new source asset added
- source rule content changed
- source asset removed
- generated target content changed
