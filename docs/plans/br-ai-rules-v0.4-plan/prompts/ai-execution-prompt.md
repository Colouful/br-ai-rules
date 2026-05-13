# AI 执行提示（V0.4 规则源产品化）

本文件用于驱动 AI 在仓库内**测试并执行**「本地团队规则源」闭环：脚手架 → 校验 → 项目诊断。

## 目标

1. 实现或验证 CLI：`br-rules source init`、`br-rules source check`、`br-rules doctor`。
2. 保证既有能力（`init` / `sync` / `check` / `source list` / `asset list`）不回归。
3. 对照 `docs/plans/br-ai-rules-v0.4-plan/checklists/acceptance-checklist.md` 自检。

## 建议执行顺序（在本仓库根目录）

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
node dist/cli.js source init /tmp/br-team-src-demo
node dist/cli.js source check /tmp/br-team-src-demo
node dist/cli.js init --no-sync --source /tmp/br-team-src-demo --asset team.starter-pack
node dist/cli.js doctor
```

将 `/tmp/...` 换为可写目录；在项目根使用相对路径时，与 `--source team-rules-source` 一致即可。

## 验收对照

- 新团队可 `source init` 得到标准目录与示例 YAML。
- `source check [path]` 可发现 manifest/YAML/重复 id/占位符问题。
- `doctor` 可报告配置、来源、生成文件是否与配置一致。
- `pnpm test` 全绿。

## 相关文档

计划目录：`docs/plans/br-ai-rules-v0.4-plan/`（PRD、命令设计、测试清单）。
