# BR AI Rules V0.3 Plan

## Theme

V0.3：团队规则源与资产升级。

目标：让团队可以把自己的 AI Coding 规则维护在一个独立规则源中，并在多个项目中复用、选择、同步、对比和快照记录。

## Current Status

V0.2.2-beta.1 已完成：npm beta 发布、默认资产文件化、前端/后端 dogfood、真实项目验证、config version 修复、TODO 占位 warning。

## V0.3 Scope

V0.3 只做 local source，不做 GitHub remote source 和 npm source。

### In Scope

- local team rule source
- team source directory schema
- source manifest: `br-rules.source.json`
- team assets and team rules
- `init --source --asset`
- `br-rules source list`
- `br-rules asset list`
- generated.json source snapshots
- source asset diff
- examples/team-source
- full regression test

### Out of Scope

- Web platform / login / RBAC
- GitHub remote source / npm source
- automatic upgrade command
- rules marketplace
- Agent / Skill / OpenSpec / Hook / Runtime
- `br-rules verify`

## Package Contents

```text
br-ai-rules-v0.3-plan/
  README.md
  docs/
    01-v0.3-prd.md
    02-source-architecture.md
    03-config-schema.md
    04-command-design.md
    05-generated-snapshot.md
    06-implementation-tasks.md
    07-test-plan.md
  prompts/
    ai-execution-prompt.md
  checklists/
    acceptance-checklist.md
    test-commands.md
  examples/
    team-source/
      br-rules.source.json
      assets/
      rules/
```
