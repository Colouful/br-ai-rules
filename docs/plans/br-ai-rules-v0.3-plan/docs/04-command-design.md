# V0.3 Command Design

## Existing Commands

Keep existing commands:

```bash
br-rules init
br-rules sync
br-rules diff
br-rules check
br-rules list
br-rules add
```

## New / Enhanced Commands

### init --source --asset

```bash
br-rules init --stack spring-boot,java,mysql,redis --source ../team-ai-rules --asset team.backend-standard
```

Behavior:

- Adds local source to config.sources
- Adds selected team asset to assets.include
- Still includes stack-based built-in assets
- Default init still syncs unless `--no-sync`

Multiple assets:

```bash
br-rules init --source ../team-ai-rules --asset team.backend-standard,team.api-standard
```

### source list

```bash
br-rules source list
```

Output example:

```text
Sources:

local: ../team-ai-rules
  name: team-ai-rules
  version: 0.1.0
  assets:
    - team.frontend-standard
    - team.backend-standard
```

If no source configured:

```text
No external sources configured.
```

### asset list

```bash
br-rules asset list
```

Output example:

```text
Built-in assets:
  ● base.behavior-basic (base) — 通用 AI Coding 行为规则 [6 rules]
  ● language.java (language) — Java 编码规则 [5 rules]

Source assets:
  ● team.backend-standard (team) — 团队后端标准规则 [3 rules]
  ○ team.frontend-standard (team) — 团队前端标准规则 [2 rules]
```

You can keep:

```bash
br-rules list --assets
```

But V0.3 should add the clearer alias:

```bash
br-rules asset list
```

## Error Handling

### Source not found

```text
Error: Local source not found: ../team-ai-rules
```

### Source manifest missing

```text
Error: Missing source manifest: ../team-ai-rules/br-rules.source.json
```

### Asset not found

```text
Error: Asset team.backend-standard not found in built-in assets or configured sources.
```

### Rule reference missing

```text
Error: Asset team.backend-standard references missing rule: team.no-raw-exception
```

## No Interactive Mode

V0.3 should remain non-interactive by default.
