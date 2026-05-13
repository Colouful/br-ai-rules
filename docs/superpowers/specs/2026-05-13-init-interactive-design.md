# init 交互式初始化设计

## 背景

当前 `br-rules init` 已支持 `--stack`、`--targets`、`--source`、`--asset`、`--language`、`--no-sync` 等参数模式，适合脚本和 CI(持续集成) 使用。但用户在首次接入项目时，需要手动理解 stack(技术栈) 与 asset(规则资产) 的映射，体验不够直观。

本次优化目标是让 `br-rules init` / `npx @br-ai/rules init` 在真实 TTY(交互终端) 且不带选择类参数时进入分组式向导，通过上下箭头移动、空格选择、Enter 确认完成初始化；同时保持非 TTY(非交互终端)、参数模式和 `sync`(同步) 的旧行为不回归。

## 目标

1. `init` 不带选择类参数、运行在 TTY 时，进入交互式初始化向导。
2. `init` 在非 TTY 时保持当前默认行为，不影响 CI 和脚本。
3. `init` 带选择类参数时按参数直接执行，不进入交互。
4. 新增 `--interactive`(交互模式)，可强制进入向导；如果当前不是 TTY，则输出清晰错误。
5. `sync` 默认不进入完整交互，只按 `.ai-rules/config.json` 执行同步。
6. 向导按分组逐步选择，并支持每个可调整分组的“全选当前分组”和“清空当前分组”。
7. 自动识别项目依赖，给出保守默认选中项，用户可手动调整。
8. 支持在向导中输入 source(规则源) 路径，并多选 source asset(规则源资产)。

## 非目标

1. 不新增 `state-management`(状态管理) 规则资产；Vuex、Pinia、Redux 只作为框架推荐辅助信号。
2. 不改变 `sync` 的命令职责，不把它扩展成配置中心。
3. 不重构现有渲染、同步、规则解析核心链路。
4. 不改变参数模式下未知 stack 的现有 warning(警告) 策略。

## 触发规则

`init` 的执行路径按下列顺序判断：

1. 显式传入 `--interactive`：进入交互向导；如果不是 TTY，报错并退出。若同时传入 `--stack`、`--targets`、`--source`、`--asset`、`--language`、`--no-sync`，这些参数只作为向导默认值，不直接跳过交互。
2. 传入选择类参数：按参数直接执行，不进入交互。选择类参数包括 `--stack`、`--targets`、`--source`、`--asset`、`--language`、`--no-sync`。
3. 未传选择类参数且当前是 TTY：进入交互向导。
4. 未传选择类参数且当前不是 TTY：保持当前默认行为。

## 架构

### project-detector(项目识别器)

新增只读识别层，负责扫描当前项目并输出推荐证据与默认选中项。它不写文件，也不直接调用同步逻辑。

识别范围：

- `package.json`：React、Vue、TypeScript、Vuex、Pinia、Redux、测试依赖、MySQL/Redis/MQ(消息队列) 客户端。
- `pom.xml` / `build.gradle`：Java、Spring Boot、MySQL/Redis/MQ 相关依赖。
- 常见配置文件：`tsconfig.json`、`vite.config.*`、`next.config.*`、`vue.config.*`。

状态管理依赖只作为辅助信号：

- 识别到 `pinia` 或 `vuex` 时，提高 Vue + TypeScript 的推荐可信度。
- 识别到 `redux` 或 `@reduxjs/toolkit` 时，提高 React + TypeScript 的推荐可信度。
- 不生成独立状态管理规则资产。

### interactive-prompts(交互提示层)

新增 TTY 交互层，统一支持单选、多选、全选、清空、必选项和不可取消项。交互行为：

- 上下箭头移动光标。
- 空格切换选中状态。
- Enter 确认当前分组。
- `全选当前分组` 勾选该组所有可选项。
- `清空当前分组` 取消该组所有可取消项。
- 对必选项显示锁定状态，不允许取消。

### init-orchestrator(初始化编排器)

新增初始化编排层，负责把触发规则、项目识别、交互结果和现有 `initCommand` 写配置逻辑串起来。核心同步链路继续复用：

- `writeConfig`(写配置)
- `resolveStacksToAssets`(技术栈解析到资产)
- `syncCommand`(同步命令)

交互逻辑不进入 `syncCommand`，避免同步命令变得不可脚本化。

## 交互流程

### 1. 处理已有配置

如果存在 `.ai-rules/config.json`，先读取现有配置作为默认选中项，并提示用户选择：

1. 基于现有配置重新选择并覆盖配置。
2. 保持现有配置，只执行同步。
3. 退出，不做任何修改。

如果用户选择“只执行同步”，则调用 `syncCommand`。如果选择“退出”，不写任何文件。

默认值优先级为：显式参数默认值高于现有配置，现有配置高于自动识别推荐，自动识别推荐高于保守默认。这样 `--interactive --stack vue,typescript` 可以进入向导并预选 Vue + TypeScript，同时仍允许用户修改。

### 2. 自动识别项目

进入向导前运行 project-detector，生成推荐：

- 框架、语言、中间件、工程实践和输出目标的默认选中项。
- 检测证据摘要，例如“检测到 Pinia，推荐 Vue + TypeScript”。

如果识别不到明确技术栈，只保留基础规则和默认输出目标。

### 3. 分组选择

分组顺序：

1. 基础规则：`base.behavior-basic` 默认选中且不可取消。
2. 语言：TypeScript、Java，可全不选。
3. 框架：React、Vue、Spring Boot，可全不选。
4. 中间件：MySQL、Redis、MQ，可全不选。
5. 工程实践：测试、依赖控制、安全默认选中；偏后端项目默认选中 API 契约；可调整。
6. 输出目标：AGENTS.md、CLAUDE.md、Cursor Rules 默认全选；至少选择一个。

每个可调整分组都包含：

- `全选当前分组`
- `清空当前分组`
- 实际可选项

语言、框架、中间件、工程实践允许清空。基础规则不可清空。输出目标可使用清空操作，但 Enter 确认时如果没有任何输出目标，需要提示至少选择一个。

### 4. 团队规则源

向导询问是否添加 source(规则源) 路径。用户可以跳过。

如果用户输入路径：

1. 校验路径是否存在。
2. 校验是否存在 source manifest(规则源清单)。
3. 读取可用 source asset。
4. 使用相同的空格多选交互选择 source asset。

如果路径无效，提示错误并允许：

1. 重新输入。
2. 跳过团队规则源。
3. 退出向导。

本次先支持一个 source 路径。多 source 可在后续设计中扩展。

### 5. 确认摘要

写配置前展示最终摘要：

- 语言。
- 内置资产。
- source 路径。
- source asset。
- 输出目标。
- 是否执行同步。
- 自动识别证据。

用户确认后才写入 `.ai-rules/config.json`。用户取消则不写任何文件。

## 数据映射

交互结果最终落到现有 `RulesConfig`(规则配置)：

- 基础规则：始终写入 `assets.include` 的 `base.behavior-basic`。
- 语言、框架、中间件、工程实践：把选择结果解析为 asset id 后写入 `assets.include`。
- source：写入 `sources: [{ type: "local", path }]`。
- source asset：追加到 `assets.include`，并去重。
- 输出目标：写入 `targets.generic`、`targets.claude`、`targets.cursor.enabled`。
- `--no-sync`：继续只写配置，不执行同步。

推荐的默认选中策略：

- `base.behavior-basic` 必选。
- 识别到 React：默认 React + TypeScript。
- 识别到 Vue：默认 Vue + TypeScript。
- 识别到 Pinia/Vuex：作为 Vue 推荐辅助信号。
- 识别到 Redux：作为 React 推荐辅助信号。
- 识别到 Java/Spring Boot：默认 Java/Spring Boot。
- 识别到 MySQL/Redis/MQ：默认对应中间件。
- 工程实践默认选中测试、依赖控制、安全；偏后端项目默认选中 API 契约。
- 输出目标默认全选，保持当前行为。

## 错误处理

1. 非 TTY 执行 `init`：保持旧行为，不因为无法交互而报错。
2. 参数模式执行 `init`：保持旧行为。
3. `--interactive` 但当前非 TTY：输出清晰错误并退出。
4. source 路径无效：允许重新输入、跳过或退出。
5. source asset 为空：提示没有可选资产，允许跳过或退出。
6. 输出目标为空：不允许确认，提示至少选择一个输出目标。
7. 用户取消最终摘要：不写配置、不执行同步。

## 测试计划

### 单元测试

覆盖 project-detector：

- `package.json` 识别 React、Vue、TypeScript。
- 识别 Vuex、Pinia、Redux，并只作为框架推荐辅助信号。
- `pom.xml` / `build.gradle` 识别 Java、Spring Boot。
- 识别 MySQL、Redis、MQ 依赖。
- 无明显技术栈时只推荐基础规则和默认输出目标。

### 交互逻辑测试

重点断最终选择结果，不强依赖完整 ANSI 输出：

- 上下箭头移动、空格切换、Enter 确认。
- 每组 `全选当前分组` / `清空当前分组` 生效。
- 基础规则不可取消。
- 输出目标至少选择一个。
- source 路径无效时可重试、跳过、退出。
- 已有 `.ai-rules/config.json` 时能读取为默认选中项。

### 命令回归测试

保证旧路径不变：

- 非 TTY 执行 `init` 保持当前默认行为。
- `init --stack vue,typescript` 不进入交互。
- `init --source ./team --asset team.starter-pack` 不进入交互。
- `init --interactive` 在 TTY 进入交互。
- `init --interactive` 在非 TTY 报清晰错误。
- `sync` 永远按配置同步，不进入完整交互。
- `init --no-sync` 只写配置，不生成目标文件。

## 验收标准

1. `npx @br-ai/rules init` 在真实 TTY 中进入分组向导。
2. 用户可通过上下箭头、空格、Enter 完成所有分组选择。
3. 每个可调整分组都有全选和清空能力。
4. 基础规则不可取消，输出目标至少选择一个。
5. 自动识别推荐合理，但用户始终可修改。
6. source 路径输入、校验和 source asset 多选可恢复处理错误。
7. 参数模式、非 TTY、`sync` 的旧行为不回归。
8. 最终写入的 `.ai-rules/config.json` 与确认摘要一致。
