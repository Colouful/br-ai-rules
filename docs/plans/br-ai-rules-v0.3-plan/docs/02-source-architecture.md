# V0.3 Source Architecture

## Concept Model

```text
Built-in Assets
  src/built-in/assets/*.yaml
  src/built-in/rules/*.yaml

Local Source
  team-ai-rules/
    br-rules.source.json
    assets/*.yaml
    rules/*.yaml

Project Custom Rules
  .ai-rules/rules/*.yaml
```

V0.3 的核心是合并三类规则来源：

```text
built-in assets
+ local source assets
+ project custom rules
→ enabled assets / enabled rules
→ render target files
```

## Source Directory Structure

```text
team-ai-rules/
  br-rules.source.json
  assets/
    team.frontend-standard.yaml
    team.backend-standard.yaml
  rules/
    team.no-raw-exception.yaml
    team.no-auto-dependency.yaml
    team.api-language.yaml
    team.auth-change-check.yaml
```

## Source Manifest

`br-rules.source.json`:

```json
{
  "name": "team-ai-rules",
  "version": "0.1.0",
  "description": "Team shared AI coding rules",
  "assets": [
    "team.frontend-standard",
    "team.backend-standard"
  ]
}
```

## Team Asset YAML

```yaml
id: team.backend-standard
name: 团队后端标准规则
version: 0.1.0
category: team
description: 团队后端项目通用 AI Coding 规则。
rules:
  - team.no-raw-exception
  - team.auth-change-check
  - team.api-language
```

## Team Rule YAML

```yaml
id: team.no-raw-exception
name: 禁止直接抛出 RuntimeException
category: backend
severity: must
appliesTo:
  targets:
    - generic
    - claude
    - cursor
  stacks:
    - spring-boot
    - java
content:
  zh-CN: |
    不要在业务代码中直接抛出 RuntimeException。
    应优先使用项目已有的业务异常类型、错误码体系或统一返回结构。
```

## Merge Order

Recommended merge order:

```text
1. built-in rules
2. local source rules
3. project custom rules
```

Duplicate ID policy:

- Duplicate rule id across built-in and source: fail check
- Duplicate rule id across source and project custom: fail check
- Duplicate asset id across built-in and source: fail check
- Duplicate source asset id: fail check

V0.3 不做 override 机制，避免行为不可预测。

## Path Resolution

Source paths in `.ai-rules/config.json` should be resolved relative to project root.

## Validation

Source validation should check:

- `br-rules.source.json` exists
- source manifest is valid JSON
- source manifest has name/version
- source assets directory exists
- source rules directory exists
- listed assets exist
- asset rule references exist
- rule YAML is valid
- rule content includes configured language or zh-CN fallback
- duplicate ids are rejected
