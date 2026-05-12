# BR AI Rules V0.2 验收清单

## 基础检查

- [ ] `npm install` 成功
- [ ] `npm run typecheck` 成功
- [ ] `npm test` 成功
- [ ] `npm run build` 成功
- [ ] `node dist/cli.js --help` 正常

## 配置升级

- [ ] 新项目生成 `.ai-rules/config.json`
- [ ] 配置版本为 `0.2.0`
- [ ] 配置包含 `assets.include`
- [ ] 配置包含 `assets.exclude`
- [ ] 配置包含 `customRules.autoDiscover`
- [ ] 旧版 `rulesets` 配置仍可读取

## 默认资产

- [ ] 12 个默认资产存在：base.behavior-basic、language.typescript、language.java、framework.react、framework.vue、framework.spring-boot、middleware.mysql、middleware.redis、middleware.message-queue、practice.testing-basic、practice.dependency-control、practice.security-basic、practice.api-contract

## init --stack

- [ ] `br-rules init --stack react,typescript` 生成 React 资产配置
- [ ] `br-rules init --stack vue,typescript` 生成 Vue 资产配置
- [ ] `br-rules init --stack spring-boot,java,mysql,redis` 生成后端资产配置
- [ ] 未知 stack 有清晰提示
- [ ] 默认始终包含 `base.behavior-basic`

## 生成文件

- [ ] 生成 `AGENTS.md`
- [ ] 生成 `CLAUDE.md`
- [ ] 生成 `.cursor/rules/ai-coding.mdc`
- [ ] 三个文件都有 `BR-AI-RULES:START / END`
- [ ] `sync` 不覆盖 managed block 外内容
- [ ] 渲染结果按 category 分组

## 自定义规则

- [ ] `.ai-rules/rules/*.yaml` 自动发现
- [ ] `br-rules add team.xxx` 能创建规则模板
- [ ] 规则文件已存在时不会覆盖
- [ ] 自定义规则能渲染进三个目标文件
- [ ] 自定义规则 ID 重复时 `check` 失败

## check 增强

- [ ] 资产不存在时失败
- [ ] 资产引用不存在规则时失败
- [ ] YAML 解析错误时失败
- [ ] 缺少 `content.zh-CN` 时失败或 fallback 规则明确
- [ ] disabledRules 引用不存在规则时失败
- [ ] 删除输出文件后 check 失败
- [ ] 修改 managed block 后 check 失败
- [ ] 只修改 managed block 外内容时 check 通过

## list 增强

- [ ] `br-rules list --assets` 显示资产
- [ ] `br-rules list --custom` 显示自定义规则
- [ ] `br-rules list --enabled` 显示启用规则
- [ ] `br-rules list --disabled` 显示禁用规则
- [ ] `br-rules list --all` 显示完整信息

## generated.json

- [ ] `.ai-rules/generated.json` 包含 `assets`
- [ ] `.ai-rules/generated.json` 包含 `rules`
- [ ] `.ai-rules/generated.json` 包含 `targets`
- [ ] custom rule 记录 source 和 path
- [ ] target 记录 file 和 checksum

## 端到端验收

- [ ] React demo 通过
- [ ] Spring Boot demo 通过
- [ ] 自定义规则 demo 通过
- [ ] README 已更新 V0.2 用法
- [ ] 未引入 Agent / Skill / Hook / OpenSpec / Web 平台能力
