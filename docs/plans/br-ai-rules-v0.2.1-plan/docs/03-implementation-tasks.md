# V0.2.1 实施任务拆分

## P0.2.1.1 梳理当前内置资产

```bash
cd /Users/lizhenwei/workspace/vueworkspace/bairong/br-ai-rules
grep -R "base.behavior" -n src
grep -R "framework.react" -n src
grep -R "language.typescript" -n src
grep -R "middleware.mysql" -n src
```

产出：当前 assets 列表、当前 rules 列表、当前 stack → assets 映射。

## P0.2.1.2 新增 YAML 目录

```bash
mkdir -p src/built-in/assets src/built-in/rules
```

## P0.2.1.3 迁移 13 个资产文件

至少包含：

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

每个资产文件必须包含：`id`、`name`、`version`、`category`、`description`、`rules`。

## P0.2.1.4 迁移规则文件

每个规则文件必须包含：`id`、`name`、`category`、`severity`、`appliesTo.targets`、`appliesTo.stacks`、`content.zh-CN`。

## P0.2.1.5 新增 AssetSchema

如当前已有 asset schema，复用并调整。否则新增：

```ts
export const AssetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().optional(),
  category: z.string().min(1),
  description: z.string().optional(),
  rules: z.array(z.string().min(1))
});
```

## P0.2.1.6 新增 built-in-loader

新增：

```text
src/core/built-in-loader.ts
```

实现：

```ts
loadBuiltInRegistry(): Promise<{
  assets: Asset[];
  rules: Rule[];
  assetsById: Map<string, Asset>;
  rulesById: Map<string, Rule>;
}>
```

要求：读取 YAML、schema 校验、检查重复 asset id、检查重复 rule id、检查 asset.rules 引用的 rule 是否存在、错误信息包含文件路径。

## P0.2.1.7 替换旧内置数组

将原来从 TS 常量读取 built-in assets/rules 的地方，改为调用 loader。

注意不要破坏：custom rules 自动发现、disabledRules、assets.include / exclude、rulesets 兼容。

## P0.2.1.8 修改 build 脚本

保证 build 后存在：

```text
dist/built-in/assets/*.yaml
dist/built-in/rules/*.yaml
```

## P0.2.1.9 更新测试

新增或更新：

```text
tests/built-in-loader.test.ts
```

测试：能加载所有 YAML asset、能加载所有 YAML rule、asset 引用的 rule 都存在、没有重复 ID、React stack 能展开正确资产、Spring Boot stack 能展开正确资产。

## P0.2.1.10 全量回归

```bash
npm run typecheck
npm test
npm run build
```

测试项目：

```bash
cd /Users/lizhenwei/Downloads/00download/新需求/test-ai-rules
rm -rf .ai-rules .cursor AGENTS.md CLAUDE.md
node /Users/lizhenwei/workspace/vueworkspace/bairong/br-ai-rules/dist/cli.js init --stack react,typescript
node /Users/lizhenwei/workspace/vueworkspace/bairong/br-ai-rules/dist/cli.js check
node /Users/lizhenwei/workspace/vueworkspace/bairong/br-ai-rules/dist/cli.js list --assets
```

## P0.2.1.11 文档更新

更新：README.md、CHANGELOG.md、docs/test-reports/v0.2.1-test-report.md。
