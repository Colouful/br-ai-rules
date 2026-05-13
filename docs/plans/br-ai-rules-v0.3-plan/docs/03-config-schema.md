# V0.3 Config Schema

## V0.3 Config Additions

Add `sources`:

```json
{
  "sources": [
    {
      "type": "local",
      "path": "../team-ai-rules"
    }
  ]
}
```

Full example:

```json
{
  "version": "0.4.0-beta.1",
  "language": "zh-CN",
  "targets": {
    "generic": true,
    "claude": true,
    "cursor": {
      "enabled": true,
      "mode": "single"
    }
  },
  "sources": [
    {
      "type": "local",
      "path": "../team-ai-rules"
    }
  ],
  "assets": {
    "include": [
      "base.behavior-basic",
      "language.java",
      "framework.spring-boot",
      "middleware.mysql",
      "middleware.redis",
      "practice.api-contract",
      "practice.testing-basic",
      "practice.security-basic",
      "team.backend-standard"
    ],
    "exclude": []
  },
  "customRules": {
    "autoDiscover": true,
    "paths": [".ai-rules/rules/*.yaml"]
  },
  "writeMode": "managed-block"
}
```

## Schema Rules

- `sources` optional
- default: []
- V0.3 only supports `type: "local"`
- `path` required for local source
- path resolved relative to project root
- `assets.include` may include built-in asset ids and local source asset ids
- `assets.exclude` may exclude built-in or local source assets
- exclude wins over include

## Backward Compatibility

V0.2 config without `sources` must still work.

V0.1 config with `rulesets` should continue existing migration behavior if already supported.
