# BR AI Rules V0.3 使用指南

## 1. BR AI Rules 是什么

BR AI Rules 是一个面向 AI 编程工具的规则规范安装与同步工具。它根据项目技术栈和团队规则源，生成适配不同 AI IDE / Agent 工具的规则文件：

```text
AGENTS.md
CLAUDE.md
.cursor/rules/ai-coding.mdc
```

当前 V0.3 支持：内置默认规则资产、技术栈选择、项目自定义规则、本地团队规则源 local source、source asset 选择、generated.json 快照、check / sync / diff / list / add、source list / asset list。

## 2. 安装方式

```bash
npx @br-ai/rules@beta --version
npm install -D @br-ai/rules@beta
```

当前期望版本：

```text
0.3.0-beta.1
```

## 3. 最简单初始化

```bash
cd /path/to/your-project
```

React + TypeScript：

```bash
npx @br-ai/rules@beta init --stack react,typescript
```

Vue + TypeScript：

```bash
npx @br-ai/rules@beta init --stack vue,typescript
```

Spring Boot + Java + MySQL + Redis：

```bash
npx @br-ai/rules@beta init --stack spring-boot,java,mysql,redis
```

执行完成后默认生成：

```text
.ai-rules/config.json
.ai-rules/generated.json
AGENTS.md
CLAUDE.md
.cursor/rules/ai-coding.mdc
```

## 4. 使用团队规则源初始化

V0.3 支持本地团队规则源。

```text
team-source/
  br-rules.source.json
  assets/
    team.backend-standard.yaml
    team.frontend-standard.yaml
  rules/
    team.no-raw-exception.yaml
    team.auth-change-check.yaml
    team.api-language.yaml
    team.no-auto-dependency.yaml
```

初始化后端项目并启用团队后端规则：

```bash
npx @br-ai/rules@beta init   --stack spring-boot,java,mysql,redis   --source /path/to/team-source   --asset team.backend-standard
```

初始化前端项目并启用团队前端规则：

```bash
npx @br-ai/rules@beta init   --stack vue,typescript   --source /path/to/team-source   --asset team.frontend-standard
```

## 5. 检查当前规则状态

```bash
npx @br-ai/rules@beta check
```

通过时会看到：

```text
All generated rule files are up to date.
```

## 6. 查看团队规则源

```bash
npx @br-ai/rules@beta source list
```

## 7. 查看可用资产

```bash
npx @br-ai/rules@beta asset list
```

输出中：

```text
● 表示当前已启用
○ 表示可用但未启用
```

## 8. 同步规则文件

```bash
npx @br-ai/rules@beta sync
```

sync 会根据当前配置重新生成 AGENTS.md、CLAUDE.md、.cursor/rules/ai-coding.mdc 和 .ai-rules/generated.json。BR AI Rules 使用 managed block，默认不会覆盖 block 外的团队自定义内容。

## 9. 查看差异

```bash
npx @br-ai/rules@beta diff
```

## 10. 添加项目自定义规则

```bash
npx @br-ai/rules@beta add team.my-rule
```

会生成：

```text
.ai-rules/rules/team.my-rule.yaml
```

项目自定义规则只属于当前项目。团队共享规则应该放到 team-source 中，不建议复制到每个项目。

## 11. 配置文件说明

`.ai-rules/config.json` 示例：

```json
{
  "version": "0.3.0-beta.1",
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
      "path": "/path/to/team-source"
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

## 12. 推荐提交到业务项目的文件

```text
.ai-rules/config.json
.ai-rules/generated.json
AGENTS.md
CLAUDE.md
.cursor/rules/ai-coding.mdc
```

如果有项目自定义规则，也提交 `.ai-rules/rules/*.yaml`。

## 13. 推荐工作流

```bash
npx @br-ai/rules@beta init --stack vue,typescript --source /path/to/team-source --asset team.frontend-standard
npx @br-ai/rules@beta check
npx @br-ai/rules@beta source list
npx @br-ai/rules@beta asset list
git diff
git add .ai-rules AGENTS.md CLAUDE.md .cursor/rules/ai-coding.mdc
git commit -m "chore: add AI coding rules"
```

## 14. 常见问题

### 为什么没有把 team-source 规则复制到 `.ai-rules/rules/`？

因为 `.ai-rules/rules/` 只用于当前项目自定义规则。团队共享规则来自 `--source` 指向的外部目录，不会复制进项目。

### 修改 team-source 后项目会自动更新吗？

不会自动更新。需要在目标项目重新执行：

```bash
npx @br-ai/rules@beta diff
npx @br-ai/rules@beta sync
```

### 可以同时使用内置规则、团队规则和项目规则吗？

可以。合并来源是：built-in assets + local source assets + project custom rules。

### TODO 占位规则会怎样？

如果自定义规则仍包含 TODO，占位内容会触发 warning，提醒不要把模板规则误提交。
