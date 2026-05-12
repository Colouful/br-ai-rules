# PR: BR AI Rules V0.2 - 默认资产库与项目自定义规则

## Summary

本 PR 实现 BR AI Rules V0.2：默认资产库与项目自定义规则。

核心变化：

- 引入 Asset 模型：base / language / framework / middleware / practice
- 内置 12 个默认规则资产
- 支持 `br-rules init --stack ...`
- 支持 `.ai-rules/rules/*.yaml` 自动发现
- 新增 `br-rules add <rule-id>`
- 增强 `check`、`list`
- 渲染按 category 分组
- `.ai-rules/generated.json` 记录资产和规则快照

## Scope

本 PR 只处理规则资产安装与维护，不包含 Agent runtime、Skill execution、OpenSpec workflow、Hook execution、Web dashboard、Remote Hub、Enterprise RBAC。

## Test Plan

```bash
npm run typecheck
npm test
npm run build
```

React demo：

```bash
node dist/cli.js init --stack react,typescript
node dist/cli.js check
node dist/cli.js list --assets
```

Spring Boot demo：

```bash
node dist/cli.js init --stack spring-boot,java,mysql,redis
node dist/cli.js check
node dist/cli.js list --assets
```

Custom rule demo：

```bash
node dist/cli.js add team.no-auto-dependency --category dependency
node dist/cli.js check
node dist/cli.js sync
node dist/cli.js list --custom
```

## Acceptance

- [ ] React stack 能生成对应资产规则
- [ ] Spring Boot stack 能生成对应资产规则
- [ ] 自定义规则能自动发现并渲染
- [ ] managed block 外内容不会丢失
- [ ] check 能发现配置和生成文件问题
- [ ] list 能展示资产和规则状态
