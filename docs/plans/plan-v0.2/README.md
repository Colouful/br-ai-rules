# BR AI Rules V0.2 实施方案包

本包用于交给 AI 编程工具执行 BR AI Rules V0.2 开发。

V0.2 主题：**默认资产库与项目自定义规则**。

目标：让 BR AI Rules 能根据技术栈、中间件、编码习惯安装默认规范资产，并支持团队维护自定义规则。

建议执行顺序：

1. 阅读 `docs/01-v0.2-prd.md`
2. 阅读 `docs/02-architecture-plan.md`
3. 阅读 `docs/03-implementation-tasks.md`
4. 阅读 `docs/04-default-assets.md`
5. 按 `prompts/ai-execution-prompt.md` 执行
6. 按 `checklists/acceptance-checklist.md` 验收

重要边界：

- 不做 Web 平台
- 不做远程资产源
- 不做 npm 规则包安装
- 不做规则依赖冲突解决
- 不做 Agent / Skill / Hook / OpenSpec / Runtime
- 本版本只围绕规则资产、技术栈选择、自定义规则和多 IDE 渲染增强
