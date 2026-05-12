# BR AI Rules V0.2 架构设计

## 1. 核心概念

V0.2 引入 Asset 概念。

```text
Asset = 一组规则的可安装资产包
Rule  = 单条规范规则
Target Adapter = 负责把规则渲染到不同 IDE 文件
```

关系：

```text
Asset 1..n Rule
Config include Assets
Config disable Rules
CustomRules append Rules
Renderer group by category
Adapter write target files
```

## 2. 推荐目录结构

```text
src/
  cli.ts
  commands/
    init.ts
    sync.ts
    diff.ts
    check.ts
    list.ts
    add.ts
  core/
    assets.ts
    config.ts
    rules.ts
    render.ts
    managed-block.ts
    checksum.ts
    generated.ts
    glob.ts
    validate.ts
  adapters/
    agents.ts
    claude.ts
    cursor.ts
  built-in/
    assets/
      base.behavior-basic.yaml
      language.typescript.yaml
      language.java.yaml
      framework.react.yaml
      framework.vue.yaml
      framework.spring-boot.yaml
      middleware.mysql.yaml
      middleware.redis.yaml
      middleware.message-queue.yaml
      practice.testing-basic.yaml
      practice.dependency-control.yaml
      practice.security-basic.yaml
      practice.api-contract.yaml
    rules/
      base.behavior.clarify-before-coding.yaml
      ...
```

建议 V0.2 采用 YAML 内置资产文件。这样默认资产和项目自定义规则使用同一种结构。

## 3. Asset Schema

```yaml
id: framework.react
name: React 项目规则
layer: framework
version: 0.2.0
description: React 项目的 AI Coding 规范规则
metadata:
  sourceVisibility: internal
  inspiredBy:
    - andrej-karpathy-skills
rules:
  - framework.react.reuse-components
  - framework.react.state-locality
  - framework.react.loading-empty-error
```

## 4. Rule Schema

```yaml
id: framework.react.reuse-components
name: 优先复用现有组件
category: frontend
severity: must
appliesTo:
  targets:
    - generic
    - claude
    - cursor
  stacks:
    - react
content:
  zh-CN: |
    优先复用项目已有组件、hooks 和样式系统。
    不要为了单个需求引入新的 UI 库或状态管理方案。
metadata:
  sourceVisibility: internal
```

## 5. Config Schema

```ts
type Config = {
  version: string;
  language: string;
  targets: {
    generic: boolean;
    claude: boolean;
    cursor: { enabled: boolean; mode: 'single' | 'grouped' };
  };
  assets: { include: string[]; exclude: string[] };
  disabledRules: string[];
  customRules: { autoDiscover: boolean; paths: string[] };
  writeMode: 'managed-block';
};
```

兼容 V0.1：

```ts
rulesets?: string[];
customRules?: string[];
```

读取时统一 normalize 成 V0.2 Config。

## 6. Stack 到 Asset 映射

```ts
const stackAssetMap = {
  generic: ['base.behavior-basic'],
  typescript: ['language.typescript'],
  react: ['language.typescript', 'framework.react', 'practice.testing-basic', 'practice.dependency-control', 'practice.security-basic'],
  vue: ['language.typescript', 'framework.vue', 'practice.testing-basic', 'practice.dependency-control', 'practice.security-basic'],
  java: ['language.java'],
  'spring-boot': ['language.java', 'framework.spring-boot', 'practice.api-contract', 'practice.testing-basic', 'practice.security-basic'],
  mysql: ['middleware.mysql'],
  redis: ['middleware.redis'],
  mq: ['middleware.message-queue'],
  'message-queue': ['middleware.message-queue']
};
```

所有配置默认都包含 `base.behavior-basic`，去重后写入 `assets.include`。

## 7. 渲染策略

```text
读取 config
→ normalize config
→ load included assets
→ expand asset.rules
→ remove excluded assets
→ remove disabledRules
→ load auto-discovered custom rules
→ validate duplicate IDs
→ filter by target
→ group by category
→ render target files
```

category 标题映射：

```ts
const categoryTitles = {
  behavior: 'AI Coding 行为规则',
  language: '语言编码规则',
  frontend: '前端项目规则',
  backend: '后端项目规则',
  middleware: '中间件规则',
  testing: '测试规则',
  dependency: '依赖管理规则',
  security: '安全规则',
  api: 'API 契约规则',
  review: '评审规则',
  team: '团队自定义规则'
};
```

## 8. generated.json 快照

`.ai-rules/generated.json` 应记录 version、generatedAt、language、assets、rules、targets。assets 记录 id/source/checksum，rules 记录 id/source/path/checksum，targets 记录 file/checksum。

## 9. Cursor grouped 模式

V0.2 仍默认 single：`.cursor/rules/ai-coding.mdc`。`grouped` 可以只预留配置，不强制实现。
