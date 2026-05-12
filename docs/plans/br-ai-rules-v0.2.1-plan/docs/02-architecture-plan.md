# V0.2.1 架构方案：默认资产文件化

## 1. 当前架构问题

当前 V0.2 已经具备资产模型，但默认资产可能集中在代码里，例如：

```text
src/core/assets.ts
src/core/rules.ts
src/core/built-in.ts
```

这种方式的问题：

- 规则内容不可独立审查。
- 新增规则要改 TypeScript 代码。
- 后续无法直接复用到团队规则源。
- 不符合“规范资产平台”的产品方向。

## 2. 目标架构

将默认资产拆成两类 YAML 文件：

```text
src/built-in/
  assets/
    *.yaml
  rules/
    *.yaml
```

代码只负责：读取 YAML、校验 Schema、展开 assets → rules、过滤 include / exclude、加载 custom rules、渲染到 targets。

## 3. 推荐目录结构

```text
src/
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
      base.behavior.restate-goal-and-scope.yaml
      base.behavior.minimal-change.yaml
      base.behavior.no-unrelated-refactor.yaml
      base.behavior.verify-behavior-change.yaml
      base.behavior.report-validation-and-risk.yaml
      language.typescript.type-safety.yaml
      language.typescript.no-any.yaml
      language.typescript.async-error-handling.yaml
      language.java.layering.yaml
      language.java.exception-handling.yaml
      language.java.public-api-compatibility.yaml
      framework.react.reuse-components.yaml
      framework.react.state-boundary.yaml
      framework.react.loading-empty-error.yaml
      framework.vue.style-consistency.yaml
      framework.vue.reactivity-boundary.yaml
      framework.spring-boot.layering.yaml
      framework.spring-boot.transaction.yaml
      framework.spring-boot.permission.yaml
      middleware.mysql.index-and-query.yaml
      middleware.mysql.migration-and-rollback.yaml
      middleware.redis.key-expire.yaml
      middleware.redis.cache-consistency.yaml
      middleware.message-queue.idempotent-consume.yaml
      middleware.message-queue.retry-and-dlq.yaml
      practice.testing.behavior-change.yaml
      practice.dependency.no-auto-dependency.yaml
      practice.security.no-secret.yaml
      practice.api-contract.compatibility.yaml
```

## 4. 新增核心模块

建议新增：

```text
src/core/built-in-loader.ts
```

职责：

1. 定位 built-in 目录。
2. 读取 `assets/*.yaml`。
3. 读取 `rules/*.yaml`。
4. 用 zod schema 校验。
5. 返回标准化 asset / rule registry。
6. 支持开发环境和 dist 环境。

## 5. built-in 路径解析

需要同时支持开发模式和构建后模式：

```text
src/built-in/
dist/built-in/
```

建议策略：优先从当前 cli 文件旁边找 `built-in`，找不到时回退到源码相对路径。

## 6. build 复制 YAML

如果当前使用 tsup，先用简单脚本：

```json
{
  "scripts": {
    "build": "tsup src/cli.ts --format esm --dts false --clean --out-dir dist --banner.js '#!/usr/bin/env node' && cp -R src/built-in dist/built-in"
  }
}
```

后续可改成跨平台 copy 脚本。

## 7. 保持 API 不变

用户命令保持不变：

```bash
br-rules init
br-rules init --stack react,typescript
br-rules sync
br-rules check
br-rules list --assets
```
