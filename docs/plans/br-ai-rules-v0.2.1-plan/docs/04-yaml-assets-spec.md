# V0.2.1 YAML 资产规范

## 1. Asset YAML

路径：

```text
src/built-in/assets/{asset-id}.yaml
```

示例：

```yaml
id: framework.react
name: React 项目规则
version: 0.2.1
category: framework
description: React 项目中的组件、状态、副作用和页面验证规则。
rules:
  - framework.react.reuse-components
  - framework.react.state-boundary
  - framework.react.loading-empty-error
```

## 2. Rule YAML

路径：

```text
src/built-in/rules/{rule-id}.yaml
```

示例：

```yaml
id: framework.react.reuse-components
name: 优先复用现有组件
category: frontend
severity: must
metadata:
  sourceVisibility: internal
appliesTo:
  targets:
    - generic
    - claude
    - cursor
  stacks:
    - react
content:
  zh-CN: |
    优先复用项目已有组件、hooks、样式系统和工具函数。
    不要为了单个需求随意新增组件库、状态管理库或 UI 框架。
```

## 3. 命名规范

Asset ID：

```text
base.behavior-basic
language.typescript
framework.react
middleware.mysql
practice.testing-basic
```

Rule ID：

```text
base.behavior.minimal-change
language.typescript.no-any
framework.react.reuse-components
middleware.redis.key-expire
practice.security.no-secret
```

## 4. 第一批资产清单

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

## 5. 推荐规则清单

### base.behavior-basic

```text
base.behavior.clarify-before-coding
base.behavior.restate-goal-and-scope
base.behavior.minimal-change
base.behavior.no-unrelated-refactor
base.behavior.verify-behavior-change
base.behavior.report-validation-and-risk
```

### language.typescript

```text
language.typescript.type-safety
language.typescript.no-any
language.typescript.async-error-handling
```

### language.java

```text
language.java.layering
language.java.exception-handling
language.java.public-api-compatibility
```

### framework.react

```text
framework.react.reuse-components
framework.react.state-boundary
framework.react.loading-empty-error
```

### framework.vue

```text
framework.vue.style-consistency
framework.vue.reactivity-boundary
```

### framework.spring-boot

```text
framework.spring-boot.layering
framework.spring-boot.transaction
framework.spring-boot.permission
```

### middleware.mysql

```text
middleware.mysql.index-and-query
middleware.mysql.migration-and-rollback
```

### middleware.redis

```text
middleware.redis.key-expire
middleware.redis.cache-consistency
```

### middleware.message-queue

```text
middleware.message-queue.idempotent-consume
middleware.message-queue.retry-and-dlq
```

### practice

```text
practice.testing.behavior-change
practice.dependency.no-auto-dependency
practice.security.no-secret
practice.api-contract.compatibility
```
