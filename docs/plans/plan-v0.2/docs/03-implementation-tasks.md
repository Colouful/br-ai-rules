# BR AI Rules V0.2 实施任务拆解

## P0：开发前检查

```bash
npm install
npm run typecheck
npm test
npm run build
```

如果 V0.1 测试失败，先修复 V0.1，不要直接开发 V0.2。

## P1：配置模型升级

目标：支持 `assets.include / assets.exclude`，兼容旧 `rulesets`。

任务：

1. 修改 `src/core/config.ts`
2. 新增 config normalize 函数
3. V0.1 配置兼容：`rulesets: ["behavior.basic"]` 映射为 `assets.include: ["base.behavior-basic"]`
4. 旧 `customRules: string[]` 兼容到新的 custom rule loader
5. `init` 默认生成 V0.2 配置
6. 增加默认配置、V0.1 配置兼容、`--stack` 转资产 include 的测试

## P2：内置资产 YAML 化

目标：建立 built-in assets / rules。

任务：

1. 新增 `src/built-in/assets/*.yaml`
2. 新增 `src/built-in/rules/*.yaml`
3. 新增 `src/core/assets.ts`
4. 支持加载内置资产和规则
5. 检查资产 ID 唯一、规则 ID 唯一、资产引用的规则存在

第一批资产：

```text
base.behavior-basic
language.typescript
language.java
framework.react
framework.vue
framework.spring-boot
middleware.mysql
middleware.redis
middleware.message-queue
practice.testing-basic
practice.dependency-control
practice.security-basic
practice.api-contract
```

## P3：`init --stack` 实现

目标：根据技术栈生成默认资产 include。

任务：

1. 支持 `br-rules init --stack react,typescript`
2. 支持 `br-rules init --stack spring-boot,java,mysql,redis`
3. 默认始终包含 `base.behavior-basic`
4. 对未知 stack 给出清晰错误或 warning
5. 去重资产

## P4：自定义规则自动发现

目标：自动加载 `.ai-rules/rules/*.yaml`。

任务：

1. 新增简单 glob 能力，至少支持 `.ai-rules/rules/*.yaml`
2. 支持 `customRules.autoDiscover: true`
3. 支持 `customRules.paths`
4. 自定义规则 source 标记为 `custom`
5. 检测自定义规则与内置规则 ID 重复

## P5：新增 `br-rules add`

目标：快速创建项目自定义规则模板。

命令：

```bash
br-rules add team.no-auto-dependency
br-rules add team.api-language --category docs
br-rules add team.test-required --category testing --severity must
```

任务：

1. 新增 `src/commands/add.ts`
2. 在 `src/cli.ts` 注册命令
3. 创建 `.ai-rules/rules/<rule-id>.yaml`
4. 如果文件已存在，不覆盖，提示用户
5. 支持 `--category`、`--severity`、`--targets`

## P6：渲染按 category 分组

目标：生成文件可读性提升。

任务：

1. 修改 `src/core/render.ts`
2. 按 category 分组规则
3. 每组输出标题
4. 同组内按 severity / id 排序
5. 三个 adapter 复用同一分组结果，但可以有不同文案标题

## P7：`check` 增强

检查项：配置文件存在且合法、assets 引用存在、资产引用规则存在、规则 YAML 可解析、必填字段完整、content 包含 config.language 或 zh-CN fallback、rule id 不重复、disabledRules 引用真实规则、输出文件存在、managed block 存在、当前自动生成区是否漂移。

错误输出不要抛 stack trace，输出可读错误。

## P8：`list` 增强

支持：

```bash
br-rules list
br-rules list --assets
br-rules list --custom
br-rules list --enabled
br-rules list --disabled
br-rules list --all
```

## P9：generated.json 快照增强

记录 assets、rules、targets。区分 built-in / custom。custom rule 记录 path。target 记录 file + checksum。

## P10：端到端验收

React：

```bash
mkdir -p /tmp/br-ai-rules-react-demo
cd /tmp/br-ai-rules-react-demo
node /path/to/br-ai-rules/dist/cli.js init --stack react,typescript
node /path/to/br-ai-rules/dist/cli.js check
node /path/to/br-ai-rules/dist/cli.js list --assets
```

Spring Boot：

```bash
mkdir -p /tmp/br-ai-rules-spring-demo
cd /tmp/br-ai-rules-spring-demo
node /path/to/br-ai-rules/dist/cli.js init --stack spring-boot,java,mysql,redis
node /path/to/br-ai-rules/dist/cli.js check
node /path/to/br-ai-rules/dist/cli.js list --assets
```

自定义规则：

```bash
node /path/to/br-ai-rules/dist/cli.js add team.no-auto-dependency --category dependency
node /path/to/br-ai-rules/dist/cli.js check
node /path/to/br-ai-rules/dist/cli.js sync
```
