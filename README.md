# BR AI Rules

> Current version: `0.4.0`

A lightweight AI Coding rules installer for teams.

BR AI Rules 是一个面向团队的 AI Coding 规范规则安装器，用一套规则源生成 `AGENTS.md`、`CLAUDE.md` 和 Cursor Rules。

## Why

当团队成员同时使用 Claude Code、Cursor、Codex、OpenCode 等不同 AI Coding 工具时，项目规则很容易散落在不同文件、个人提示词和聊天记录里。

BR AI Rules 帮你把一套团队 AI Coding 规则安全同步到多个 IDE 规则文件中。

## Quick Start

```bash
pnpm install
pnpm build
node dist/cli.js init --stack react,typescript
node dist/cli.js check
```

发布后可使用：

```bash
npx @br-ai/rules init --stack react,typescript
npx @br-ai/rules check
```

### V0.4 — 本地团队规则源（创建 / 校验 / 诊断）

`br-rules source init` 会在指定目录生成可纳入版本库的**轻量**团队规则源（默认资产为 `team.starter-pack` 与示例规则 `team.code-review-required`，不生成 frontend/backend 两套资产模板）：

```bash
node dist/cli.js source init ./team-rules-source
node dist/cli.js source check ./team-rules-source
```

将本地源接入项目并生成 IDE 规则文件：

```bash
node dist/cli.js init --source ./team-rules-source --asset team.starter-pack
```

在项目根检查配置中的全部 `sources` 与生成物是否一致：

```bash
node dist/cli.js doctor
```

## Tech Stack Selection

根据技术栈自动选择合适的规则资产：

```bash
# React + TypeScript 项目
br-rules init --stack react,typescript

# Spring Boot + Java + MySQL + Redis 项目
br-rules init --stack spring-boot,java,mysql,redis

# Vue 项目
br-rules init --stack vue,typescript

# 默认（仅基础行为规则）
br-rules init
```

支持的 stack：`generic`、`typescript`、`java`、`react`、`vue`、`spring-boot`、`mysql`、`redis`、`mq`、`message-queue`

## Generated Files

默认生成：

- `.ai-rules/config.json`
- `.ai-rules/generated.json`
- `AGENTS.md`
- `CLAUDE.md`
- `.cursor/rules/ai-coding.mdc`

## Commands

```bash
br-rules init [--interactive] [--stack <stacks>] [--no-sync] [--language <lang>] [--targets <targets>]
br-rules add <rule-id> [--category <cat>] [--severity <sev>] [--targets <targets>]
br-rules sync
br-rules diff
br-rules check
br-rules doctor
br-rules list [--assets] [--custom] [--enabled] [--disabled] [--all]
br-rules source list
br-rules source init [directory] [--force]
br-rules source check [path]
br-rules asset list
```

## Interactive Init

真实 TTY(终端) 下执行 `br-rules init`，且不带 `--stack`、`--language`、`--targets`、`--source`、`--asset` 等选择类参数时，会进入分组向导。

向导中使用上下箭头移动，空格选择或取消，Enter 确认。内置规则资产按语言、框架、中间件、工程实践分组，每个可调整分组都支持“全选当前分组”和“清空当前分组”；输出目标组也支持全选和清空，但至少需要保留一个目标。

非 TTY(终端) 环境和带参数用法保持脚本兼容，会继续走参数模式。需要强制进入向导时使用：

```bash
br-rules init --interactive
```

## Built-in Assets

V0.2 内置 13 个资产，覆盖 5 层：

| Layer | Asset | Rules |
|-------|-------|-------|
| base | base.behavior-basic | 6 |
| language | language.typescript | 5 |
| language | language.java | 5 |
| framework | framework.react | 5 |
| framework | framework.vue | 5 |
| framework | framework.spring-boot | 5 |
| middleware | middleware.mysql | 5 |
| middleware | middleware.redis | 5 |
| middleware | middleware.message-queue | 5 |
| practice | practice.testing-basic | 4 |
| practice | practice.dependency-control | 3 |
| practice | practice.security-basic | 4 |
| practice | practice.api-contract | 4 |

## Custom Rules

在 `.ai-rules/rules/` 目录下创建 YAML 文件即可自动发现：

```bash
# 快速创建规则模板
br-rules add team.no-auto-dependency --category dependency
```

YAML 格式：

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
  "version": "0.4.0",
  "language": "zh-CN",
  "targets": {
    "generic": true,
    "claude": true,
    "cursor": { "enabled": true, "mode": "single" }
  },
  "assets": {
    "include": [
      "base.behavior-basic",
      "language.typescript",
      "framework.react",
      "practice.testing-basic",
      "practice.dependency-control",
      "practice.security-basic"
    ],
    "exclude": []
  },
  "disabledRules": [],
  "customRules": {
    "autoDiscover": true,
    "paths": [".ai-rules/rules/*.yaml"]
  },
  "writeMode": "managed-block"
}
```

V0.1 配置（`rulesets` 字段）自动兼容。

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
