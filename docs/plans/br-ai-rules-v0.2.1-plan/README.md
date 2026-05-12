# BR AI Rules V0.2.1 Plan

主题：默认资产文件化。

V0.2 已经验证了默认资产、stack 初始化、自定义规则、managed block、diff、sync、check、list、add 等能力。V0.2.1 不新增大功能，而是把当前写在 TypeScript 代码里的默认 assets / rules 迁移成真实 YAML 文件。

目标是让 BR AI Rules 从“功能可用”升级为“资产可维护”。

## 交付内容

- `docs/01-v0.2.1-prd.md`
- `docs/02-architecture-plan.md`
- `docs/03-implementation-tasks.md`
- `docs/04-yaml-assets-spec.md`
- `docs/05-migration-guide.md`
- `docs/06-test-plan.md`
- `prompts/ai-execution-prompt.md`
- `checklists/acceptance-checklist.md`
- `checklists/test-commands.md`

## 项目路径

源码项目：

```bash
/Users/lizhenwei/workspace/vueworkspace/bairong/br-ai-rules
```

测试项目：

```bash
/Users/lizhenwei/Downloads/00download/新需求/test-ai-rules
```

## 使用方式

把 `prompts/ai-execution-prompt.md` 的内容直接发给执行开发的 AI 编程工具，并把本目录作为需求文档输入。
