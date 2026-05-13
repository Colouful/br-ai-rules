# BR AI Rules 本地使用流程与规则读取机制说明

> 适用版本：`@br-ai/rules@0.3.0-beta.1`  
> 当前阶段目标：先把本地规则安装、同步、检查、团队本地规则源用顺；暂不做远端规则源、Web 平台、GitHub source、npm source。

---

## 1. 当前项目到底解决什么问题？

BR AI Rules 当前不是一个远程规则平台，也不是一个 Agent Runtime。

它现在解决的是：把一套开发规范 / 团队规则 / 项目规则，转换成不同 AI 编程工具能读取的规则文件。

当前主要生成：

```text
AGENTS.md
CLAUDE.md
.cursor/rules/ai-coding.mdc
```

这些文件才是 AI 编程工具最终读取的内容。

---

## 2. 当前整体流程

```text
内置规则 YAML
        +
团队本地规则源 YAML
        +
项目自定义规则 YAML
        ↓
br-rules init / sync / check / diff
        ↓
生成 AI 工具可读文件
        ↓
AGENTS.md
CLAUDE.md
.cursor/rules/ai-coding.mdc
        ↓
Cursor / Claude Code / Codex / 其他 AI 编程工具读取
        ↓
AI 在编码任务中参考这些规则
```

关键点：

```text
YAML 是规则资产源
Markdown / MDC 是 AI 工具最终读取的规则文件
```

AI 编程工具不会直接读取 `src/built-in/rules/*.yaml`，也不会直接读取 `team-source/rules/*.yaml`。

---

## 3. 默认规则的使用流程

默认规则已经内置在 `@br-ai/rules` npm 包中。

Vue + TypeScript 项目：

```bash
npx @br-ai/rules@beta init --stack vue,typescript
```

Spring Boot + Java + MySQL + Redis 项目：

```bash
npx @br-ai/rules@beta init --stack spring-boot,java,mysql,redis
```

后端项目通常会启用：

```text
base.behavior-basic
language.java
framework.spring-boot
middleware.mysql
middleware.redis
practice.api-contract
practice.testing-basic
practice.security-basic
```

这些 asset 会展开成具体规则，最终渲染到：

```text
AGENTS.md
CLAUDE.md
.cursor/rules/ai-coding.mdc
```

---

## 4. 为什么安装时没有把默认规则落到项目目录？

执行 `init` 之后，项目里通常只会看到：

```text
.ai-rules/config.json
.ai-rules/generated.json
AGENTS.md
CLAUDE.md
.cursor/rules/ai-coding.mdc
```

不会看到：

```text
.ai-rules/rules/一堆默认规则.yaml
```

这是正常设计。

原因：

```text
默认规则：放在 @br-ai/rules 包内部
团队共享规则：放在 team-source 目录
项目私有规则：放在 .ai-rules/rules/
```

如果把默认规则全部复制到业务项目，会导致：

```text
1. 业务项目目录被大量规则文件污染
2. 默认规则升级时难以判断哪些是用户改过的
3. 多个项目出现大量重复规则
4. 规则资产无法集中维护
5. npm 包升级后，项目里的旧规则容易和新规则冲突
```

---

## 5. 默认规则实际在哪里？

源码仓库中：

```text
src/built-in/assets/
src/built-in/rules/
```

构建后：

```text
dist/built-in/assets/
dist/built-in/rules/
```

npm 包中大致为：

```text
node_modules/@br-ai/rules/dist/built-in/assets/
node_modules/@br-ai/rules/dist/built-in/rules/
```

如果使用 `npx`，则从 npx 缓存中的 npm 包内部读取。

所以默认规则不是没生成，而是作为工具内置资产被读取、展开、渲染，最终进入 `AGENTS.md`、`CLAUDE.md`、`.cursor/rules/ai-coding.mdc`。

---

## 6. AI 编程工具什么时候读取规则？

AI 编程工具读取的是生成后的规则文件。

### Cursor

读取：

```text
.cursor/rules/ai-coding.mdc
```

通常在打开项目、新建 Chat、上下文刷新、项目重新索引时生效。建议 init/sync 后重新打开 Cursor 项目，或新建一个 Chat。

### Claude Code

读取：

```text
CLAUDE.md
```

通常在 Claude Code 加载项目上下文时读取。建议 init/sync 后重新启动 Claude Code 会话。

### Codex / 通用 Agent

读取：

```text
AGENTS.md
```

不同工具实现略有差异，但 `AGENTS.md` 一般作为项目级 Agent 指令文件。

---

## 7. 当前项目目录结构说明

业务项目接入后：

```text
your-project/
  .ai-rules/
    config.json
    generated.json

  .cursor/
    rules/
      ai-coding.mdc

  AGENTS.md
  CLAUDE.md
```

如果有项目私有规则：

```text
your-project/
  .ai-rules/
    rules/
      team.xxx.yaml
```

团队规则源通常在业务项目外部：

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

---

## 8. `.ai-rules/config.json`

这是当前项目的规则配置文件。

示例：

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
    "paths": [
      ".ai-rules/rules/*.yaml"
    ]
  },
  "writeMode": "managed-block"
}
```

字段含义：

```text
version      当前 BR AI Rules 版本
language     输出语言，默认 zh-CN
targets      控制生成 AGENTS.md / CLAUDE.md / Cursor Rules
sources      本地团队规则源
assets       启用/排除的资产
customRules  项目私有规则自动发现
writeMode    managed-block 分区写入
```

---

## 9. `.ai-rules/generated.json`

这是生成快照文件，给 `br-rules check`、`br-rules diff`、`br-rules sync` 使用。

它记录：

```text
本次生成使用了哪些 source
使用了哪些 asset
使用了哪些 rule
这些 rule 来自哪里
目标文件 checksum 是什么
```

`generated.json` 不是给 AI 工具直接读取的，而是给 br-rules 判断规则状态用的。

---

## 10. 三个生成文件

### `AGENTS.md`

通用 Agent 读取。

### `CLAUDE.md`

Claude Code 读取。

### `.cursor/rules/ai-coding.mdc`

Cursor 读取。

三者都使用 managed block：

```md
<!-- BR-AI-RULES:START -->

自动生成规则

<!-- BR-AI-RULES:END -->
```

`sync` 只更新 managed block 内的内容，不覆盖 block 外手写内容。

---

## 11. `.ai-rules/rules/*.yaml`

这是项目私有规则目录。

通过：

```bash
npx @br-ai/rules@beta add team.project-only-rule
```

生成：

```text
.ai-rules/rules/team.project-only-rule.yaml
```

适合当前项目独有规范、临时规则、某业务系统特殊规则。

不适合多个项目共用的团队规范。多个项目共用规则应该放在 team-source。

---

## 12. 团队规则源 team-source

V0.3 新增能力。

结构：

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

### `br-rules.source.json`

```json
{
  "name": "team-ai-rules",
  "version": "0.1.0",
  "description": "Example team shared AI coding rules",
  "assets": [
    "team.frontend-standard",
    "team.backend-standard"
  ]
}
```

### asset

asset 是规则集合。

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

### rule

rule 是最小规则单元。

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

---

## 13. 初始化流程

后端项目：

```bash
npx @br-ai/rules@beta init   --stack spring-boot,java,mysql,redis   --source /path/to/team-source   --asset team.backend-standard
```

前端项目：

```bash
npx @br-ai/rules@beta init   --stack vue,typescript   --source /path/to/team-source   --asset team.frontend-standard
```

工具执行过程：

```text
读取 npm 包内置 assets/rules
读取 config.sources 中的 team-source
读取 selected asset
展开 asset.rules
读取项目 custom rules
合并规则
渲染目标文件
写入 config.json
写入 generated.json
```

---

## 14. 常用命令

初始化：

```bash
npx @br-ai/rules@beta init --stack vue,typescript
```

使用团队规则源初始化：

```bash
npx @br-ai/rules@beta init   --stack spring-boot,java,mysql,redis   --source /path/to/team-source   --asset team.backend-standard
```

检查：

```bash
npx @br-ai/rules@beta check
```

同步：

```bash
npx @br-ai/rules@beta sync
```

查看差异：

```bash
npx @br-ai/rules@beta diff
```

查看 source：

```bash
npx @br-ai/rules@beta source list
```

查看 asset：

```bash
npx @br-ai/rules@beta asset list
```

添加项目规则：

```bash
npx @br-ai/rules@beta add team.project-only-rule
```

---

## 15. 修改 team-source 后如何更新项目

修改：

```text
team-source/rules/team.no-raw-exception.yaml
```

业务项目不会自动变化。

需要进入业务项目执行：

```bash
npx @br-ai/rules@beta diff
npx @br-ai/rules@beta sync
npx @br-ai/rules@beta check
```

然后提交：

```bash
git add .ai-rules AGENTS.md CLAUDE.md .cursor/rules/ai-coding.mdc
git commit -m "chore: sync AI coding rules"
```

---

## 16. 推荐提交哪些文件

业务项目建议提交：

```text
.ai-rules/config.json
.ai-rules/generated.json
AGENTS.md
CLAUDE.md
.cursor/rules/ai-coding.mdc
```

如果有项目私有规则，也提交：

```text
.ai-rules/rules/*.yaml
```

不需要提交：

```text
node_modules
npx 缓存
npm 包内部 built-in YAML
```

---

## 17. 当前推荐使用模式

```text
内置规则：解决通用 AI Coding 行为约束
team-source：解决团队共享规范
.ai-rules/rules：解决项目私有规范
AGENTS.md / CLAUDE.md / Cursor Rules：作为 AI 工具最终读取入口
check / diff / sync：保证规则状态可控
```

---

## 18. 当前阶段不要做什么

先不要做：

```text
远端 source
GitHub source
npm source
Web 平台
规则市场
复杂权限
Agent Runtime
Skill Runtime
Hook Runtime
```

原因：当前最重要的是把本地规则源、规则生成、规则同步、规则读取这条链路打磨稳定。

---

## 19. 一句话总结

BR AI Rules 当前机制是：

```text
规则资产 YAML
→ br-rules 解析、合并、渲染
→ 生成 AI 工具可读 Markdown/MDC 文件
→ Cursor / Claude Code / Agent 读取这些文件
→ AI 编程行为受到项目规则约束
```

默认规则不落到项目目录，是为了保持项目干净、方便规则升级、避免重复文件、集中维护资产、降低冲突风险。

当前最稳的落地方式是：

```text
默认规则放 npm 包内
团队规则放 team-source
项目规则放 .ai-rules/rules
最终规则落到 AGENTS.md / CLAUDE.md / .cursor/rules/ai-coding.mdc
```
