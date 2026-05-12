# V0.2.1 迁移指南：从 TS 内置到 YAML 资产

## 1. 迁移原则

- 先迁移，不改行为。
- 先保证测试通过，再删除旧 TS 常量。
- YAML 内容应与现有生成内容语义一致。
- 用户配置不变。

## 2. 推荐迁移步骤

### Step 1：保留旧实现，新增 YAML

先创建 YAML 文件，但不要立即替换 loader。

### Step 2：新增 loader 并加测试

新增 `built-in-loader.test.ts`，确保 YAML 可读、可校验。

### Step 3：双轨对比

比较旧 TS 内置 rules 数量、新 YAML rules 数量、旧 assets ID、新 assets ID。

### Step 4：切换读取路径

将业务逻辑中的 built-in 读取改成 YAML loader。

### Step 5：删除或降级旧 TS 常量

如果旧常量只用于测试，可以删除。如果担心回滚，可以保留但不导出，后续删除。

### Step 6：全量测试

```bash
npm run typecheck
npm test
npm run build
```

## 3. 兼容旧 rulesets

如果 V0.1 配置仍使用：

```json
{
  "rulesets": ["behavior.basic"]
}
```

V0.2.1 仍需兼容到：

```text
base.behavior-basic
```

建议映射：

```ts
const legacyRulesetToAssetMap = {
  "behavior.basic": "base.behavior-basic"
};
```

## 4. Stack 到资产映射保持不变

React + TypeScript：

```text
base.behavior-basic
language.typescript
framework.react
practice.testing-basic
practice.dependency-control
practice.security-basic
```

Spring Boot + Java + MySQL + Redis：

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

## 5. 验证点

- `br-rules list --assets` 能列出 13 个资产。
- `br-rules list` 能列出所有规则。
- `br-rules init --stack react,typescript` 仍生成 React/TypeScript 规则。
- `br-rules init --stack spring-boot,java,mysql,redis` 仍生成后端规则。
- 自定义规则仍能自动发现。
- generated.json 仍记录 source: built-in / custom。
