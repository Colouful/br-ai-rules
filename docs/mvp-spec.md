# BR AI Rules MVP Spec

## Positioning

BR AI Rules 是一个面向小团队技术负责人的 AI Coding 规范规则安装器。

它解决的问题是：当团队成员使用不同 AI IDE 时，同一个项目里的 AI 编程规则不一致。

## MVP Goal

用一套内置通用行为规则，生成并同步到：

- `AGENTS.md`
- `CLAUDE.md`
- `.cursor/rules/ai-coding.mdc`

并支持：

- `init`
- `sync`
- `diff`
- `check`
- `list`

## Default Ruleset

`behavior.basic` 包含 6 条规则：

1. 需求不清先澄清
2. 修改前复述目标和影响范围
3. 优先最小修改
4. 禁止无关重构
5. 行为变化必须验证
6. 完成后说明修改、验证和风险

## Configuration

配置文件路径：`.ai-rules/config.json`

## Managed Block Strategy

生成文件使用分区保护：

```md
<!-- BR-AI-RULES:START -->
自动生成内容
<!-- BR-AI-RULES:END -->
```

规则：

- 文件不存在：创建文件
- 文件存在且有 block：只替换 block 内内容
- 文件存在但无 block：追加 block，不覆盖原内容
- block 外团队自定义内容必须保留

## Custom Rules

MVP 支持：

- 禁用内置规则：`disabledRules`
- 追加项目自定义规则：`customRules`

MVP 不支持：

- 直接重写内置规则文本
- 完整优先级和冲突体系

## Scope

MVP 不做：

- Skill 执行
- Agent 管理
- Runtime 状态机
- OpenSpec 流程
- Hook 执行
- Web Hub
- Visual 控制台
- 企业权限和审计

## Acceptance Criteria

1. `br-rules init` 默认生成配置和三个 IDE 规则文件。
2. `br-rules init --no-sync` 只生成配置。
3. `br-rules sync` 只更新 managed block。
4. 用户在 managed block 外写的内容不会丢失。
5. `br-rules diff` 能预览将要写入的文件变化。
6. `br-rules check` 能识别缺失文件和自动生成区漂移。
7. `br-rules list` 能列出内置规则。
