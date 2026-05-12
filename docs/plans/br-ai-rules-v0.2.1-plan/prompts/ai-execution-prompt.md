# AI 执行提示：实现 BR AI Rules V0.2.1 默认资产文件化

你现在是 `br-ai-rules` 项目的主执行 Agent。

源码路径：

```bash
/Users/lizhenwei/workspace/vueworkspace/bairong/br-ai-rules
```

测试项目路径：

```bash
/Users/lizhenwei/Downloads/00download/新需求/test-ai-rules
```

## 任务目标

实现 V0.2.1：默认资产文件化。

当前 V0.2 已通过完整测试，但默认 assets / rules 主要在代码中维护。现在需要把默认资产拆成 YAML 文件，放到：

```text
src/built-in/assets/
src/built-in/rules/
```

并新增 loader 从 YAML 读取资产和规则。

## 必须做

1. 阅读当前项目结构和实现。
2. 找到当前内置 assets / rules 定义。
3. 新增 `src/built-in/assets/*.yaml`。
4. 新增 `src/built-in/rules/*.yaml`。
5. 迁移当前 13 个默认 assets。
6. 迁移当前所有内置 rules。
7. 新增 `src/core/built-in-loader.ts` 或等价模块。
8. 修改现有规则加载逻辑，从 YAML loader 读取 built-in assets / rules。
9. 保持自定义规则 `.ai-rules/rules/*.yaml` 自动发现能力。
10. 保持 `assets.include / assets.exclude` 能力。
11. 保持 `rulesets` 兼容能力。
12. 修改 build，确保 `dist/built-in/` 包含 YAML。
13. 增加或更新测试。
14. 更新 README / CHANGELOG / 测试报告。

## 不能做

不要引入 Web 平台、Agent、Skill、OpenSpec、Hook、Runtime、远程规则源、GitHub source、npm 规则包、权限系统。

不要改变用户已有 CLI 行为。

## 推荐执行顺序

### 1. 基线检查

```bash
cd /Users/lizhenwei/workspace/vueworkspace/bairong/br-ai-rules
pwd
git status --short
node -v
npm -v
npm run typecheck
npm test
npm run build
```

### 2. 找到内置资产

```bash
grep -R "base.behavior" -n src
grep -R "framework.react" -n src
grep -R "language.typescript" -n src
grep -R "middleware.mysql" -n src
```

### 3. 创建 YAML 目录

```bash
mkdir -p src/built-in/assets src/built-in/rules
```

### 4. 迁移资产和规则

至少迁移这些资产：

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

### 5. 实现 loader

新增 loader，要求：读取 YAML、zod 校验、检测重复 ID、检测 asset.rules 引用缺失、错误信息包含文件路径。

### 6. 修改 build

确保：

```bash
npm run build
find dist/built-in -maxdepth 3 -type f | sort
```

能看到 YAML 文件。

### 7. 回归测试

```bash
npm run typecheck
npm test
npm run build
```

### 8. 测试项目验证

```bash
TEST_PROJECT="/Users/lizhenwei/Downloads/00download/新需求/test-ai-rules"
CLI="/Users/lizhenwei/workspace/vueworkspace/bairong/br-ai-rules/dist/cli.js"
mkdir -p "$TEST_PROJECT"
cd "$TEST_PROJECT"
rm -rf .ai-rules .cursor AGENTS.md CLAUDE.md
node "$CLI" init --stack react,typescript
node "$CLI" check
node "$CLI" list --assets
rm -rf .ai-rules .cursor AGENTS.md CLAUDE.md
node "$CLI" init --stack spring-boot,java,mysql,redis
node "$CLI" check
node "$CLI" list --assets
```

## 验收标准

1. `src/built-in/assets/*.yaml` 存在。
2. `src/built-in/rules/*.yaml` 存在。
3. `dist/built-in/assets/*.yaml` 存在。
4. `dist/built-in/rules/*.yaml` 存在。
5. `br-rules list --assets` 能列出默认资产。
6. `br-rules init --stack react,typescript` 正常。
7. `br-rules init --stack spring-boot,java,mysql,redis` 正常。
8. `br-rules check` 通过。
9. 自定义规则仍然生效。
10. managed block 幂等性不退化。
11. V0.2 全量测试不退化。

## 最终输出

请输出测试报告：

```md
# BR AI Rules V0.2.1 实施报告

## 完成内容

## 修改文件

## 测试结果

## 发现和修复的问题

## 是否达到验收标准

## 后续建议
```
