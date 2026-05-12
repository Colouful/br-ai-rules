# PRD：BR AI Rules

## 1. 背景

小团队开始同时使用 Claude Code、Cursor、Codex、OpenCode、Qwen Code 等 AI Coding 工具后，项目规则容易散落在多个 IDE 配置、个人提示词和聊天记录中，导致 AI 输出不稳定、团队约束不一致、规则更新难同步。

## 2. 目标用户

3-20 人研发团队的技术负责人。团队已经在使用 AI 编程工具，但缺少统一的项目级 AI Coding 规则安装和同步机制。

## 3. 产品定位

BR AI Rules 是面向团队的 AI Coding 规范规则安装器。它只维护和安装规范规则，根据不同 IDE 和技术栈生成对应配置文件。

## 4. MVP 目标

第一版只解决一个问题：

> 将一套通用 AI Coding 行为规则，安全同步到 `AGENTS.md`、`CLAUDE.md` 和 `.cursor/rules/ai-coding.mdc`。

## 5. MVP 范围

### 包含

- 内置 `behavior.basic` 规则包
- 项目配置 `.ai-rules/config.json`
- 生成记录 `.ai-rules/generated.json`
- `AGENTS.md` 生成
- `CLAUDE.md` 生成
- Cursor single mode 规则生成
- managed block 分区保护
- `init / sync / diff / check / list` 命令
- 禁用内置规则
- 追加项目自定义 YAML 规则

### 不包含

- Skill 执行
- Agent 管理
- Runtime 状态机
- OpenSpec 流程
- Hook 执行
- Web Hub
- Visual 控制台
- 企业权限和审计

## 6. 默认规则

1. 需求不清先澄清
2. 修改前复述目标和影响范围
3. 优先最小修改
4. 禁止无关重构
5. 行为变化必须验证
6. 完成后说明修改、验证和风险

## 7. 验收标准

- 执行 `br-rules init` 后生成配置和全部默认目标文件。
- 执行 `br-rules init --no-sync` 后只生成配置。
- 执行 `br-rules sync` 后只更新 managed block。
- block 外团队自定义内容不丢失。
- 执行 `br-rules diff` 可看到待更新文件。
- 执行 `br-rules check` 可发现缺失文件和自动区漂移。
- 执行 `br-rules list` 可查看内置规则。
