# 给 AI 编程工具的执行提示词

你现在是 BR AI Rules 项目的主开发 Agent。

你的任务是基于当前仓库实现 V0.2：默认资产库与项目自定义规则。

请严格遵守以下边界：不做 Web 平台、远程 Hub、npm 规则包安装、Agent 管理、Skill 执行、Hook 执行、OpenSpec 流程、Runtime 状态机、企业权限、多租户、审计，也不要做与规则资产安装无关的重构。

## 开发前必须先执行

```bash
npm install
npm run typecheck
npm test
npm run build
```

如果 V0.1 失败，先修复 V0.1。

## 必读文档

请先阅读：

1. `README.md`
2. `docs/mvp-spec.md`，如果存在
3. 本任务包的 `docs/01-v0.2-prd.md`
4. 本任务包的 `docs/02-architecture-plan.md`
5. 本任务包的 `docs/03-implementation-tasks.md`
6. 本任务包的 `docs/04-default-assets.md`

## 实施顺序

1. 配置模型升级：支持 `assets.include / assets.exclude`，兼容旧 `rulesets`
2. 内置资产 YAML 化：新增 12 个默认资产
3. 实现 `init --stack`
4. 实现 `.ai-rules/rules/*.yaml` 自动发现
5. 实现 `br-rules add <rule-id>`
6. 渲染按 category 分组
7. 增强 `check`
8. 增强 `list`
9. 增强 `.ai-rules/generated.json`
10. 补测试和 README

## 必须新增或更新的测试

至少覆盖：V0.1 配置兼容、`init --stack react,typescript`、`init --stack spring-boot,java,mysql,redis`、内置资产加载、资产引用规则存在性校验、自定义规则自动发现、重复 rule id 检测、`br-rules add` 生成规则模板、category 分组渲染、`check` 发现非法 YAML / 缺失 content / 漂移、`list --assets / --custom / --enabled / --disabled`、generated.json 包含 assets / rules / targets。

## 验收命令

```bash
npm run typecheck
npm test
npm run build
```

React demo：

```bash
rm -rf /tmp/br-ai-rules-react-demo
mkdir -p /tmp/br-ai-rules-react-demo
cd /tmp/br-ai-rules-react-demo
node /当前仓库绝对路径/dist/cli.js init --stack react,typescript
node /当前仓库绝对路径/dist/cli.js check
node /当前仓库绝对路径/dist/cli.js list --assets
cat AGENTS.md
cat CLAUDE.md
cat .cursor/rules/ai-coding.mdc
cat .ai-rules/generated.json
```

Spring Boot demo：

```bash
rm -rf /tmp/br-ai-rules-spring-demo
mkdir -p /tmp/br-ai-rules-spring-demo
cd /tmp/br-ai-rules-spring-demo
node /当前仓库绝对路径/dist/cli.js init --stack spring-boot,java,mysql,redis
node /当前仓库绝对路径/dist/cli.js check
node /当前仓库绝对路径/dist/cli.js list --assets
cat AGENTS.md
cat CLAUDE.md
cat .cursor/rules/ai-coding.mdc
cat .ai-rules/generated.json
```

自定义规则 demo：

```bash
node /当前仓库绝对路径/dist/cli.js add team.no-auto-dependency --category dependency
node /当前仓库绝对路径/dist/cli.js check
node /当前仓库绝对路径/dist/cli.js sync
node /当前仓库绝对路径/dist/cli.js list --custom
cat AGENTS.md
```

## 输出要求

完成后请输出：修改文件清单、新增功能说明、测试命令和结果、端到端验证结果、未完成事项或风险。不要伪造测试结果。没有执行的测试必须明确说明未执行。
