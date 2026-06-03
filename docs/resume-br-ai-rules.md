# BR AI Rules — 简历文案

> 本文档基于对当前项目的源码分析整理，提供多种长度的简历表述版本，可按目标岗位（前端 / 全栈 / 工程效能 / AI 方向）裁剪使用。

---

## 一、项目一句话定位

**BR AI Rules（`@br-ai/rules`）** —— 一个面向研发团队的 **AI Coding 规则安装器（CLI 工具）**，用一套规则源同步生成 `AGENTS.md`、`CLAUDE.md`、Cursor Rules 等多个 IDE 规则文件，让团队在 Claude Code / Cursor / Codex / OpenCode 等不同 AI 编程工具中保持一致的编码约束。

---

## 二、简历项目卡片（推荐直接粘贴版）

**BR AI Rules ｜ 团队级 AI Coding 规则安装器（个人开源项目）**
`TypeScript · Node.js(ESM) · Commander · Zod · YAML · Vitest · tsup · pnpm`

- 设计并实现一款 CLI 工具，解决团队成员混用多种 AI 编程 IDE 时「编码规则散落、AI 输出不一致、规则难同步」的痛点：以单一规则源一键生成并同步 `AGENTS.md`、`CLAUDE.md`、`.cursor/rules/*.mdc` 等多端规则文件。
- 设计 **Managed Block（托管区块）** 增量写入机制，仅更新自动生成区、完整保留团队自定义内容，写入幂等可重复执行，杜绝覆盖丢失。
- 构建 **三级规则合并体系**（内置 → 团队源 → 项目自定义）与跨层 **重复 ID 检测**，并支持按技术栈（react/vue/java/spring-boot/mysql/redis 等）自动选择规则资产。
- 基于 **Zod** 对配置、规则 YAML、团队源 manifest 做强 Schema 校验，提供 `check` / `doctor` / `source check` 多重诊断命令，实现配置漂移与来源可审计的工程化保障。
- 采用 **TDD** 推进开发，沉淀 92+ 单元/场景测试用例（约 1900 行测试代码，src 约 2700 行），覆盖核心合并、写入、交互向导等关键路径，全流程含类型检查与构建校验。

---

## 三、要点拆解（按能力维度，便于面试展开）

### 1. 产品 / 架构设计
- 独立完成产品定位、PRD、MVP 范围与迭代规划（v0.1 → v0.4），明确「只做规则安装与同步，不做 Agent 运行时 / Hook / Web 控制台」的清晰边界，避免过度设计。
- 分层架构：`core`（配置、渲染、合并、校验、checksum、交互）+ `adapters`（cursor / claude / agents 多端适配器）+ `commands`（init/sync/diff/check/doctor/source/asset 等命令），职责单一、易扩展新 IDE 目标。

### 2. 核心技术亮点
- **Managed Block 幂等写入**：通过起止标记定位自动生成区，文件不存在则创建、存在则原地替换、无标记则安全追加，保证多次执行结果一致且不破坏用户内容。
- **三级规则合并 + 冲突检测**：内置资产、团队共享源、项目自定义规则按优先级合并，并在合并阶段检测跨层重复 ID。
- **Checksum 漂移检测**：基于内容校验和记录生成快照（`generated.json`），`check`/`doctor` 可识别手工改动导致的自动区漂移。
- **交互式向导**：在真实 TTY 下提供分组多选向导（语言/框架/中间件/工程实践），并实现项目特征自动探测以预填默认选项，非 TTY 环境降级为参数模式，保证脚本与 CI 兼容。

### 3. 工程质量与规范
- 全程 **TDD**，单元测试 + 场景测试双层覆盖，关键合并/写入逻辑测试驱动开发。
- 使用 **tsup** 打包为 ESM CLI，构建期注入版本号（避免版本号硬编码漂移）；**Vitest** 跑测、`tsc --noEmit` 做类型守卫。
- 内置 **13 个规则资产 / 61 条规则 YAML**，覆盖 base、language、framework、middleware、practice 五层，规则与代码解耦、以数据驱动配置。
- Dogfooding：在真实项目与示例工程上自测验证（含 dogfood 报告），保证可用性。

---

## 四、量化指标（可写入简历的数字）

| 指标 | 数值 |
|------|------|
| 源码规模 | 约 2,700 行 TypeScript |
| 测试规模 | 约 1,900 行 / 92+ 测试用例 |
| 内置规则资产 | 13 个，覆盖 5 个分层 |
| 内置规则条目 | 61 条 YAML 规则 |
| 支持 IDE 目标 | AGENTS / Claude / Cursor 多端 |
| 支持技术栈 | 10+（generic/ts/java/react/vue/spring-boot/mysql/redis/mq 等）|
| CLI 命令 | init / sync / diff / check / doctor / add / list / source / asset |

---

## 五、不同篇幅版本

### 极简版（一行）
> 独立开发面向团队的 AI Coding 规则安装器 CLI（TypeScript），以单一规则源同步生成 Claude / Cursor / Codex 多端规则文件，含托管区块幂等写入、三级规则合并与 Zod 强校验，TDD 沉淀 92+ 测试。

### 中等版（2–3 行）
> **BR AI Rules（个人开源，TypeScript/Node CLI）**：解决团队混用多 AI 编程工具时规则不一致的问题，用一套规则源生成 `AGENTS.md`/`CLAUDE.md`/Cursor Rules。设计 Managed Block 幂等写入保护自定义内容、三级规则合并与重复检测、按技术栈自动选规则；基于 Zod 做配置/YAML/来源强校验并提供 check/doctor 诊断命令；采用 TDD，92+ 测试覆盖核心路径。

### STAR 版（行为面试用）
- **S（背景）**：团队同时使用 Claude Code、Cursor、Codex 等多种 AI 编程工具，项目编码规则散落在各 IDE 配置和个人提示词中，导致 AI 输出不稳定、约束难统一、更新难同步。
- **T（目标）**：构建一个轻量、可纳入版本库的工具，把一套团队规则安全、可重复地同步到多个 IDE 规则文件。
- **A（行动）**：独立完成 PRD 与分层架构设计；实现 Managed Block 幂等写入、三级规则合并与冲突检测、checksum 漂移检测、TTY 交互向导与项目自动探测；以 Zod 做全链路 Schema 校验，提供 doctor/check/source check 诊断；全程 TDD 并做 dogfooding 验证。
- **R（结果）**：交付可用的 CLI（`npx @br-ai/rules`），覆盖 13 资产 / 61 规则 / 5 分层，92+ 测试通过，实现「一套规则、多端一致、安全同步、漂移可查」。

---

## 六、面试可能追问 & 准备方向
- 为什么用 Managed Block 而不是整文件覆盖？（答：保护用户手写内容、幂等、可与人工编辑共存）
- 三级合并冲突如何处理？（答：优先级覆盖 + 重复 ID 检测报错）
- 如何保证规则文件不被手工改坏？（答：generated.json 快照 + checksum 漂移检测 + doctor 诊断）
- 边界为什么不做 Agent 运行时 / Hook？（答：聚焦单一问题，控制复杂度，避免过度设计）

---

*提示：简历中建议保留「项目卡片」+ 「量化指标」两块；面试前熟读「要点拆解」与「STAR 版」。*
