# BR AI Rules

A lightweight AI Coding rules installer for teams.

BR AI Rules 是一个面向团队的 AI Coding 规范规则安装器，用一套规则源生成 `AGENTS.md`、`CLAUDE.md` 和 Cursor Rules。

## Why

当团队成员同时使用 Claude Code、Cursor、Codex、OpenCode 等不同 AI Coding 工具时，项目规则很容易散落在不同文件、个人提示词和聊天记录里。

BR AI Rules 帮你把一套团队 AI Coding 规则安全同步到多个 IDE 规则文件中。

## Quick Start

```bash
npm install
npm run build
node dist/cli.js init
node dist/cli.js check
```

发布后可使用：

```bash
npx @br-ai/rules init
npx @br-ai/rules check
```

`init` 默认会生成配置和规则文件。如只想生成配置：

```bash
npx @br-ai/rules init --no-sync
```

## Generated Files

默认生成：

- `.ai-rules/config.json`
- `.ai-rules/generated.json`
- `AGENTS.md`
- `CLAUDE.md`
- `.cursor/rules/ai-coding.mdc`

## Commands

```bash
br-rules init
br-rules sync
br-rules diff
br-rules check
br-rules list
```

## Managed Block

BR AI Rules 只更新自动生成区，不覆盖团队自定义内容：

```md
<!-- BR-AI-RULES:START -->
自动生成内容
<!-- BR-AI-RULES:END -->

## Team Custom Rules
这里可以自由补充团队规则。
```

## Configuration

`.ai-rules/config.json`：

```json
{
  "version": "0.1.0",
  "language": "zh-CN",
  "targets": {
    "generic": true,
    "claude": true,
    "cursor": {
      "enabled": true,
      "mode": "single"
    }
  },
  "rulesets": ["behavior.basic"],
  "disabledRules": [],
  "customRules": [],
  "writeMode": "managed-block"
}
```

## Custom Rules

可以在项目里新增 YAML 规则：

```yaml
id: team.no-auto-dependency
name: 禁止自动新增依赖
category: dependency
severity: must
appliesTo:
  targets:
    - generic
    - claude
    - cursor
  stacks:
    - generic
content:
  zh-CN: |
    不允许在未明确说明原因并获得确认前新增 npm、Maven、Gradle、pip、Go module 等依赖。
```

然后在 `.ai-rules/config.json` 中引用：

```json
{
  "customRules": [".ai-rules/rules/team.no-auto-dependency.yaml"]
}
```

## Scope

BR AI Rules only manages coding rules and IDE rule files.

It does not provide:

- Agent runtime
- Skill execution
- OpenSpec workflow
- Hook execution
- Web dashboard
- Task automation
- Enterprise RBAC

BR AI Rules 只维护和安装规范规则，不维护 Skill、Agent、Runtime、OpenSpec 流程或 Web 平台。

## Roadmap

- More IDE targets: Codex, OpenCode, Qwen
- More stack rules: React, Vue, Node.js, Spring Boot
- GitHub / npm based team rule sources
- Rule version diff and upgrade
- Lightweight rules asset platform
