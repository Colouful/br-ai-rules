# V0.2.1 测试计划

## 1. 基础质量

```bash
cd /Users/lizhenwei/workspace/vueworkspace/bairong/br-ai-rules
npm install
npm run typecheck
npm test
npm run build
```

期望：typecheck 通过、test 通过、build 通过、`dist/cli.js` 存在、`dist/built-in/assets` 存在、`dist/built-in/rules` 存在。

## 2. built-in 文件存在测试

```bash
find src/built-in -maxdepth 3 -type f | sort
find dist/built-in -maxdepth 3 -type f | sort
```

## 3. CLI list 测试

```bash
node dist/cli.js --help
node dist/cli.js list
node dist/cli.js list --assets
```

## 4. React + TypeScript 测试

```bash
TEST_PROJECT="/Users/lizhenwei/Downloads/00download/新需求/test-ai-rules"
CLI="/Users/lizhenwei/workspace/vueworkspace/bairong/br-ai-rules/dist/cli.js"
mkdir -p "$TEST_PROJECT"
cd "$TEST_PROJECT"
rm -rf .ai-rules .cursor AGENTS.md CLAUDE.md
node "$CLI" init --stack react,typescript
node "$CLI" check
node "$CLI" list --assets
grep -n "React" AGENTS.md CLAUDE.md .cursor/rules/ai-coding.mdc || true
grep -n "TypeScript" AGENTS.md CLAUDE.md .cursor/rules/ai-coding.mdc || true
```

## 5. Spring Boot + Java + MySQL + Redis 测试

```bash
cd "$TEST_PROJECT"
rm -rf .ai-rules .cursor AGENTS.md CLAUDE.md
node "$CLI" init --stack spring-boot,java,mysql,redis
node "$CLI" check
node "$CLI" list --assets
grep -n "Java" AGENTS.md CLAUDE.md .cursor/rules/ai-coding.mdc || true
grep -n "Spring" AGENTS.md CLAUDE.md .cursor/rules/ai-coding.mdc || true
grep -n "MySQL" AGENTS.md CLAUDE.md .cursor/rules/ai-coding.mdc || true
grep -n "Redis" AGENTS.md CLAUDE.md .cursor/rules/ai-coding.mdc || true
```

## 6. 自定义规则回归

```bash
cd "$TEST_PROJECT"
mkdir -p .ai-rules/rules
cat > .ai-rules/rules/team.no-auto-dependency.yaml <<'EOF'
id: team.no-auto-dependency
name: 禁止自动新增依赖
category: dependency
severity: must
appliesTo:
  targets:
    - generic
    - claude
    - cursor
  stacks:
    - generic
content:
  zh-CN: |
    不允许在未明确说明原因并获得确认前新增 npm、Maven、Gradle、pip、Go module 等依赖。
EOF
node "$CLI" check
node "$CLI" sync
node "$CLI" check
grep -n "禁止自动新增依赖" AGENTS.md CLAUDE.md .cursor/rules/ai-coding.mdc
```

## 7. 幂等性

```bash
shasum AGENTS.md CLAUDE.md .cursor/rules/ai-coding.mdc
node "$CLI" sync
shasum AGENTS.md CLAUDE.md .cursor/rules/ai-coding.mdc
node "$CLI" check
```

## 8. 测试报告格式

```md
# BR AI Rules V0.2.1 测试报告

## 环境

- 源码路径：
- 测试项目路径：
- Node：
- npm：
- 日期：

## 结果

| 场景 | 结果 | 备注 |
|---|---|---|
| typecheck | PASS/FAIL | |
| unit test | PASS/FAIL | |
| build | PASS/FAIL | |
| built-in YAML exists | PASS/FAIL | |
| list assets | PASS/FAIL | |
| React + TypeScript | PASS/FAIL | |
| Spring Boot + Java + MySQL + Redis | PASS/FAIL | |
| custom rules | PASS/FAIL | |
| idempotency | PASS/FAIL | |
```
